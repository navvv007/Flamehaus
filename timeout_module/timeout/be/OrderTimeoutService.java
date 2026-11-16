package com.flamehaus.api.service;

import com.flamehaus.api.entity.DeliveryAssignment;
import com.flamehaus.api.entity.Order;
import com.flamehaus.api.entity.Payment;
import com.flamehaus.api.repository.DeliveryAssignmentRepository;
import com.flamehaus.api.repository.OrderRepository;
import com.flamehaus.api.repository.PaymentRepository;
import com.flamehaus.api.repository.DeliveryPartnerRepository;
import com.razorpay.RazorpayClient;
import com.stripe.Stripe;
import com.stripe.model.Refund;
import com.stripe.param.RefundCreateParams;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Runs every 5 minutes.
 * Finds delivery assignments stuck in ASSIGNED/ACCEPTED/PICKED_UP
 * for more than 2 hours and auto-cancels the order + refunds the customer.
 */
@Service
public class OrderTimeoutService {

    private static final int TIMEOUT_HOURS = 2;

    @Value("${razorpay.key.id:}")       private String razorpayKeyId;
    @Value("${razorpay.key.secret:}")   private String razorpayKeySecret;
    @Value("${stripe.secret.key:}")     private String stripeSecretKey;

    private final DeliveryAssignmentRepository assignmentRepo;
    private final DeliveryPartnerRepository    partnerRepo;
    private final OrderRepository              orderRepo;
    private final PaymentRepository            paymentRepo;
    private final SmsService                   smsService;

    public OrderTimeoutService(DeliveryAssignmentRepository assignmentRepo,
                                DeliveryPartnerRepository partnerRepo,
                                OrderRepository orderRepo,
                                PaymentRepository paymentRepo,
                                SmsService smsService) {
        this.assignmentRepo = assignmentRepo;
        this.partnerRepo    = partnerRepo;
        this.orderRepo      = orderRepo;
        this.paymentRepo    = paymentRepo;
        this.smsService     = smsService;
    }

    /** Runs every 5 minutes — checks for timed-out deliveries */
    @Scheduled(fixedDelay = 300_000)
    public void checkTimeouts() {
        LocalDateTime cutoff = LocalDateTime.now()
                .minus(TIMEOUT_HOURS, ChronoUnit.HOURS);

        List<DeliveryAssignment> timedOut = assignmentRepo
                .findByStatusInAndAssignedAtBefore(
                        List.of("ASSIGNED", "ACCEPTED", "PICKED_UP"), cutoff);

        if (!timedOut.isEmpty()) {
            System.out.println("[TIMEOUT] Found " + timedOut.size()
                    + " assignment(s) exceeding " + TIMEOUT_HOURS + "h SLA");
        }

        for (DeliveryAssignment a : timedOut) {
            try {
                processTimeout(a);
            } catch (Exception e) {
                System.err.println("[TIMEOUT-ERROR] Assignment #"
                        + a.getId() + ": " + e.getMessage());
            }
        }
    }

    /** For testing — manually trigger timeout check for a specific order */
    public String manualTimeoutCheck(Long orderId) {
        return assignmentRepo.findActiveByOrderId(orderId)
                .map(a -> {
                    long mins = ChronoUnit.MINUTES.between(
                            a.getAssignedAt(), LocalDateTime.now());
                    if (List.of("ASSIGNED","ACCEPTED","PICKED_UP").contains(a.getStatus())) {
                        processTimeout(a);
                        return "Timeout processed for order #" + orderId
                                + " (was " + mins + "m old)";
                    }
                    return "Order #" + orderId + " is in status "
                            + a.getStatus() + " — no action needed";
                })
                .orElse("No active assignment for order #" + orderId);
    }

    private void processTimeout(DeliveryAssignment a) {
        Order order = a.getOrder();
        long  mins  = ChronoUnit.MINUTES.between(
                a.getAssignedAt(), LocalDateTime.now());

        System.out.println("[TIMEOUT] Processing order #" + order.getId()
                + " — assigned " + mins + " min ago, status=" + a.getStatus());

        // 1. Mark assignment FAILED
        a.setStatus("FAILED");
        assignmentRepo.save(a);

        // 2. Free partner back to ONLINE
        if (a.getPartner() != null) {
            a.getPartner().setAvailability("ONLINE");
            partnerRepo.save(a.getPartner());
            System.out.println("[TIMEOUT] Freed partner: " + a.getPartner().getName());
        }

        // 3. Cancel order
        order.setStatus("Cancelled");
        order.setTrackingNote("Auto-cancelled: not delivered within "
                + TIMEOUT_HOURS + " hours.");
        order.setUpdatedAt(LocalDateTime.now());
        orderRepo.save(order);

        // 4. Refund if paid
        String refundResult = processRefund(order);

        // 5. SMS customer
        smsService.send(order.getCustomerPhone(),
                "Hi " + order.getCustomerName()
                + ", your Flamehaus order #" + order.getId()
                + " was automatically cancelled (delivery exceeded "
                + TIMEOUT_HOURS + " hours). "
                + refundResult
                + " Apologies for the inconvenience.");

        System.out.println("[TIMEOUT] Order #" + order.getId()
                + " cancelled. Refund: " + refundResult);
    }

    private String processRefund(Order order) {
        return paymentRepo.findByOrderId(order.getId())
                .map(payment -> {
                    if (!"PAID".equals(payment.getStatus()))
                        return "No payment to refund.";
                    try {
                        if ("RAZORPAY".equals(payment.getGateway())) {
                            refundRazorpay(payment);
                        } else if ("STRIPE".equals(payment.getGateway())) {
                            refundStripe(payment);
                        }
                        payment.setStatus("REFUNDED");
                        paymentRepo.save(payment);
                        return "Full refund of Rs."
                                + Math.round(order.getTotal() * 84)
                                + " initiated (5-7 business days).";
                    } catch (Exception e) {
                        System.err.println("[REFUND-ERROR] Order #"
                                + order.getId() + ": " + e.getMessage());
                        payment.setStatus("REFUND_PENDING");
                        paymentRepo.save(payment);
                        return "Refund pending — our team will process it within 24 hours.";
                    }
                })
                .orElse("No payment record found.");
    }

    private void refundRazorpay(Payment payment) throws Exception {
        RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
        JSONObject opts = new JSONObject();
        opts.put("speed", "normal");
        client.payments.refund(payment.getGatewayPaymentId(), opts);
    }

    private void refundStripe(Payment payment) throws Exception {
        Stripe.apiKey = stripeSecretKey;
        Refund.create(RefundCreateParams.builder()
                .setPaymentIntent(payment.getGatewayPaymentId())
                .build());
    }
}
