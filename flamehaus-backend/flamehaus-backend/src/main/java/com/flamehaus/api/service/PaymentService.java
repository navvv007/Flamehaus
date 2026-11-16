package com.flamehaus.api.service;

import com.flamehaus.api.dto.PaymentCreateRequest;
import com.flamehaus.api.dto.PaymentVerifyRequest;
import com.flamehaus.api.entity.Order;
import com.flamehaus.api.entity.Payment;
import com.flamehaus.api.repository.CustomerRepository;
import com.flamehaus.api.repository.OrderRepository;
import com.flamehaus.api.repository.PaymentRepository;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.stripe.Stripe;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Map;

@Service
public class PaymentService {

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Value("${stripe.secret.key}")
    private String stripeSecretKey;

    @Value("${stripe.publishable.key}")
    private String stripePublishableKey;

    private final OrderRepository    orderRepo;
    private final PaymentRepository  paymentRepo;
    private final CustomerRepository customerRepo;
    private final SmsService          smsService;

    public PaymentService(OrderRepository orderRepo, PaymentRepository paymentRepo,
                          CustomerRepository customerRepo, SmsService smsService) {
        this.orderRepo    = orderRepo;
        this.paymentRepo  = paymentRepo;
        this.customerRepo = customerRepo;
        this.smsService   = smsService;
    }

    // ── Create ────────────────────────────────────────────────────────────────

    public Map<String, Object> createPayment(PaymentCreateRequest req) {
        Order order = orderRepo.findById(req.getOrderId())
                .orElseThrow(() -> new RuntimeException("Order not found: " + req.getOrderId()));

        // Guard: don't allow re-payment of already paid orders
        Payment existing = paymentRepo.findByOrderId(req.getOrderId()).orElse(null);
        if (existing != null && "PAID".equals(existing.getStatus())) {
            throw new RuntimeException("Order #" + req.getOrderId() + " is already paid.");
        }

        // Amount in INR paise (order.total is in USD, converted × 84 × 100)
        long amountPaise = Math.round(order.getTotal() * 84 * 100);

        return switch (req.getGateway().toUpperCase()) {
            case "RAZORPAY" -> createRazorpayOrder(order, amountPaise, existing);
            case "STRIPE"   -> createStripeIntent(order, amountPaise, existing);
            default -> throw new RuntimeException("Unknown gateway: " + req.getGateway());
        };
    }

    /**
     * Upserts the payment row — updates the existing CREATED row if present,
     * otherwise inserts a new one. This prevents duplicate-key errors when the
     * user clicks Pay more than once or switches gateways.
     */
    private Payment upsertPayment(Order order, Payment existing,
                                  String gateway, String gatewayOrderId,
                                  long amountPaise, String currency) {
        Payment p = existing != null ? existing : new Payment();
        p.setOrder(order);
        p.setGateway(gateway);
        p.setGatewayOrderId(gatewayOrderId);
        p.setGatewayPaymentId(null);   // reset in case user is retrying after a failure
        p.setGatewaySignature(null);
        p.setAmountSmallestUnit(amountPaise);
        p.setCurrency(currency);
        p.setStatus("CREATED");
        if (existing == null) p.setCreatedAt(LocalDateTime.now());
        return paymentRepo.save(p);
    }

    private Map<String, Object> createRazorpayOrder(Order order, long amountPaise, Payment existing) {
        try {
            RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
            JSONObject options = new JSONObject();
            options.put("amount",   amountPaise);
            options.put("currency", "INR");
            options.put("receipt",  "order_" + order.getId());

            com.razorpay.Order rzpOrder = client.orders.create(options);
            String gatewayOrderId = rzpOrder.get("id").toString();

            upsertPayment(order, existing, "RAZORPAY", gatewayOrderId, amountPaise, "INR");

            return Map.of(
                "gateway",       "RAZORPAY",
                "razorpayKeyId", razorpayKeyId,
                "gatewayOrderId", gatewayOrderId,
                "amount",        amountPaise,
                "currency",      "INR",
                "orderId",       order.getId(),
                "customerName",  order.getCustomerName(),
                "customerPhone", order.getCustomerPhone() != null ? order.getCustomerPhone() : ""
            );
        } catch (RazorpayException e) {
            throw new RuntimeException("Razorpay error: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> createStripeIntent(Order order, long amountPaise, Payment existing) {
        try {
            Stripe.apiKey = stripeSecretKey;
            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountPaise)
                    .setCurrency("inr")
                    .setDescription("Flamehaus Order #" + order.getId())
                    .build();

            PaymentIntent intent = PaymentIntent.create(params);

            upsertPayment(order, existing, "STRIPE", intent.getId(), amountPaise, "INR");

            return Map.of(
                "gateway",              "STRIPE",
                "stripePublishableKey", stripePublishableKey,
                "clientSecret",         intent.getClientSecret(),
                "gatewayOrderId",       intent.getId(),
                "amount",               amountPaise,
                "currency",             "inr",
                "orderId",              order.getId()
            );
        } catch (Exception e) {
            throw new RuntimeException("Stripe error: " + e.getMessage(), e);
        }
    }

    // ── Verify ────────────────────────────────────────────────────────────────

    public Map<String, Object> verifyPayment(PaymentVerifyRequest req) {
        return switch (req.getGateway().toUpperCase()) {
            case "RAZORPAY" -> verifyRazorpay(req);
            case "STRIPE"   -> verifyStripe(req);
            default -> throw new RuntimeException("Unknown gateway: " + req.getGateway());
        };
    }

    private Map<String, Object> verifyRazorpay(PaymentVerifyRequest req) {
        String data  = req.getGatewayOrderId() + "|" + req.getGatewayPaymentId();
        boolean valid = verifyHmac(data, razorpayKeySecret, req.getGatewaySignature());
        if (!valid) throw new RuntimeException("Razorpay signature verification failed");
        return confirmPayment(req.getGatewayOrderId(), req.getGatewayPaymentId(),
                              req.getGatewaySignature(), "RAZORPAY");
    }

    private Map<String, Object> verifyStripe(PaymentVerifyRequest req) {
        try {
            Stripe.apiKey = stripeSecretKey;
            PaymentIntent intent = PaymentIntent.retrieve(req.getGatewayPaymentId());
            if (!"succeeded".equals(intent.getStatus())) {
                throw new RuntimeException("Stripe payment not succeeded. Status: " + intent.getStatus());
            }
            return confirmPayment(req.getGatewayOrderId(), req.getGatewayPaymentId(), "", "STRIPE");
        } catch (Exception e) {
            throw new RuntimeException("Stripe verification error: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> confirmPayment(String gatewayOrderId, String gatewayPaymentId,
                                                String signature, String gateway) {
        Payment payment = paymentRepo.findByGatewayOrderId(gatewayOrderId)
                .orElseThrow(() -> new RuntimeException("Payment record not found for gateway order: " + gatewayOrderId));

        payment.setGatewayPaymentId(gatewayPaymentId);
        payment.setGatewaySignature(signature);
        payment.setStatus("PAID");
        payment.setPaidAt(LocalDateTime.now());
        paymentRepo.save(payment);

        Order order = payment.getOrder();
        order.setPaymentStatus("PAID");
        order.setPaymentMethod(gateway);
        order.setUpdatedAt(LocalDateTime.now());
        orderRepo.save(order);

        // SMS: use the customer's registered phone if they were logged in,
        // otherwise fall back to the phone entered at checkout.
        String smsPhone = null;
        if (order.getCustomer() != null) {
            customerRepo.findById(order.getCustomer().getId())
                .ifPresent(c -> {});  // eager load
            smsPhone = order.getCustomer().getPhone();
        }
        if (smsPhone == null || smsPhone.isBlank()) {
            smsPhone = order.getCustomerPhone();
        }
        smsService.sendPaymentSuccess(
            smsPhone,
            order.getId(),
            order.getCustomerName(),
            order.getTotal() * 84,
            gateway
        );

        return Map.of(
            "success",          true,
            "paymentId",        payment.getId(),
            "gatewayPaymentId", gatewayPaymentId,
            "orderId",          order.getId(),
            "message",          "Payment verified successfully"
        );
    }

    // ── Util ──────────────────────────────────────────────────────────────────

    private boolean verifyHmac(String data, String secret, String expected) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).equals(expected);
        } catch (Exception e) {
            return false;
        }
    }

    public Payment getPaymentByOrderId(Long orderId) {
        return paymentRepo.findByOrderId(orderId).orElse(null);
    }
}
