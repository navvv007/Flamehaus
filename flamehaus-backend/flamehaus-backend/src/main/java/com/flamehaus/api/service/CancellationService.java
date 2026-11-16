package com.flamehaus.api.service;

import com.flamehaus.api.entity.*;
import com.flamehaus.api.repository.*;
import com.razorpay.RazorpayClient;
import com.stripe.Stripe;
import com.stripe.model.Refund;
import com.stripe.param.RefundCreateParams;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Handles order cancellation and automatic refunds.
 *
 * Rules:
 * - Customer can cancel same-day orders in Pending or Preparing status
 * - Admin can cancel any non-delivered order regardless of day
 * - If payment = PAID → refund initiated via Razorpay or Stripe
 * - If payment = PENDING → no refund needed
 * - Once PICKED_UP or DELIVERED → cannot cancel
 */
@Service
public class CancellationService {

    private static final String[] CUSTOMER_CANCELLABLE = {"Pending", "Preparing"};
    private static final String[] ADMIN_CANCELLABLE    = {"Pending", "Preparing", "On the Way"};

    @Value("${razorpay.key.id}")     private String razorpayKeyId;
    @Value("${razorpay.key.secret}") private String razorpayKeySecret;
    @Value("${stripe.secret.key}")   private String stripeSecretKey;

    private final OrderRepository              orderRepo;
    private final PaymentRepository            paymentRepo;
    private final OrderCancellationRepository  cancellationRepo;
    private final DeliveryAssignmentRepository assignmentRepo;
    private final DeliveryPartnerRepository    partnerRepo;
    private final SmsService                   smsService;

    public CancellationService(OrderRepository orderRepo,
                                PaymentRepository paymentRepo,
                                OrderCancellationRepository cancellationRepo,
                                DeliveryAssignmentRepository assignmentRepo,
                                DeliveryPartnerRepository partnerRepo,
                                SmsService smsService) {
        this.orderRepo        = orderRepo;
        this.paymentRepo      = paymentRepo;
        this.cancellationRepo = cancellationRepo;
        this.assignmentRepo   = assignmentRepo;
        this.partnerRepo      = partnerRepo;
        this.smsService       = smsService;
    }

    // ── Customer cancel ───────────────────────────────────────────────────────

    /**
     * Customer cancels their own order.
     * Only allowed same-day and in Pending/Preparing status.
     */
    public OrderCancellation customerCancel(Long orderId, Long customerId, String reason) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        // Ownership check
        if (order.getCustomer() == null || !order.getCustomer().getId().equals(customerId))
            throw new RuntimeException("You can only cancel your own orders");

        // Same-day check
        if (!order.getCreatedAt().toLocalDate().equals(LocalDate.now()))
            throw new RuntimeException(
                "Orders can only be cancelled on the same day they were placed.");

        // Status check
        if (!isCustomerCancellable(order.getStatus()))
            throw new RuntimeException(
                "Cannot cancel order in '" + order.getStatus() + "' status. " +
                "Orders can only be cancelled before they are picked up.");

        // Already cancelled?
        if (cancellationRepo.existsByOrderId(orderId))
            throw new RuntimeException("Order is already cancelled.");

        return doCancellation(order, "CUSTOMER",
            order.getCustomerName(), reason, false);
    }

    // ── Admin cancel ──────────────────────────────────────────────────────────

    /**
     * Admin cancels any order (more permissive — allows On the Way too).
     * forceRefund = true overrides the same-day rule.
     */
    public OrderCancellation adminCancel(Long orderId, String adminUsername, String reason) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!isAdminCancellable(order.getStatus()))
            throw new RuntimeException(
                "Cannot cancel a " + order.getStatus() + " order. " +
                "Only delivered orders cannot be cancelled.");

        if (cancellationRepo.existsByOrderId(orderId))
            throw new RuntimeException("Order is already cancelled.");

        return doCancellation(order, "ADMIN", adminUsername, reason, true);
    }

    // ── Core logic ────────────────────────────────────────────────────────────

    private OrderCancellation doCancellation(Order order, String cancelledBy,
                                              String cancelledByName, String reason,
                                              boolean isAdmin) {
        // 1. Mark order as Cancelled
        order.setStatus("Cancelled");
        order.setTrackingNote("Order cancelled" +
            (reason != null && !reason.isBlank() ? ": " + reason : "") +
            (isAdmin ? " (by admin)" : ""));
        order.setUpdatedAt(LocalDateTime.now());
        orderRepo.save(order);

        // 2. Free delivery partner if assigned
        freeDeliveryPartner(order.getId());

        // 3. Create cancellation record
        OrderCancellation cancellation = new OrderCancellation();
        cancellation.setOrder(order);
        cancellation.setCancelledBy(cancelledBy);
        cancellation.setCancelledByName(cancelledByName);
        cancellation.setReason(reason);
        cancellation.setCancelledAt(LocalDateTime.now());

        // 4. Initiate refund if payment was made
        Payment payment = paymentRepo.findByOrderId(order.getId()).orElse(null);
        if (payment != null && "PAID".equals(payment.getStatus())) {
            initiateRefund(cancellation, payment, order);
        } else {
            cancellation.setRefundStatus("NOT_APPLICABLE");
            cancellation.setRefundNote("No payment was made for this order.");
        }

        cancellationRepo.save(cancellation);

        // 5. SMS notifications
        sendCancellationSms(order, cancellation, cancelledBy);

        return cancellation;
    }

    // ── Refund ────────────────────────────────────────────────────────────────

    private void initiateRefund(OrderCancellation cancellation, Payment payment, Order order) {
        String gateway = payment.getGateway();
        double amountInr = payment.getAmountSmallestUnit() / 100.0;

        cancellation.setRefundGateway(gateway);
        cancellation.setRefundAmount(amountInr);
        cancellation.setRefundInitiatedAt(LocalDateTime.now());

        try {
            if ("RAZORPAY".equals(gateway)) {
                refundRazorpay(cancellation, payment, amountInr);
            } else if ("STRIPE".equals(gateway)) {
                refundStripe(cancellation, payment, amountInr);
            } else {
                cancellation.setRefundStatus("FAILED");
                cancellation.setRefundNote("Unknown gateway: " + gateway);
            }
        } catch (Exception e) {
            cancellation.setRefundStatus("FAILED");
            cancellation.setRefundNote("Refund failed: " + e.getMessage());
            System.err.println("[REFUND-ERROR] Order #" + order.getId() + ": " + e.getMessage());
        }

        // Update payment record status
        payment.setStatus("REFUNDED");
        paymentRepo.save(payment);
    }

    private void refundRazorpay(OrderCancellation cancellation, Payment payment,
                                 double amountInr) throws Exception {
        RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
        JSONObject options = new JSONObject();
        options.put("speed", "normal"); // normal = 5-7 days, optimum = instant (extra fee)

        com.razorpay.Refund rzpRefund = client.payments.refund(
            payment.getGatewayPaymentId(), options);

        String refundId = rzpRefund.get("id").toString();
        cancellation.setRefundId(refundId);
        cancellation.setRefundStatus("INITIATED");
        cancellation.setRefundCompletedAt(LocalDateTime.now());
        cancellation.setRefundNote(
            String.format("Razorpay refund %s initiated. " +
                "₹%.2f will be credited within 5-7 business days.", refundId, amountInr));
    }

    private void refundStripe(OrderCancellation cancellation, Payment payment,
                               double amountInr) throws Exception {
        Stripe.apiKey = stripeSecretKey;
        Refund refund = Refund.create(RefundCreateParams.builder()
            .setPaymentIntent(payment.getGatewayPaymentId())
            .build());

        cancellation.setRefundId(refund.getId());
        cancellation.setRefundStatus("INITIATED");
        cancellation.setRefundCompletedAt(LocalDateTime.now());
        cancellation.setRefundNote(
            String.format("Stripe refund %s initiated. " +
                "₹%.2f will be credited within 5-7 business days.", refund.getId(), amountInr));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void freeDeliveryPartner(Long orderId) {
        assignmentRepo.findActiveByOrderId(orderId).ifPresent(a -> {
            if (List.of("ASSIGNED","ACCEPTED").contains(a.getStatus())) {
                a.setStatus("FAILED");
                assignmentRepo.save(a);
                DeliveryPartner partner = a.getPartner();
                if ("BUSY".equals(partner.getAvailability())) {
                    partner.setAvailability("ONLINE");
                    partnerRepo.save(partner);
                    smsService.send(partner.getPhone(),
                        "Order #" + orderId + " was cancelled. You are now available for new orders.");
                }
            }
        });
    }

    private void sendCancellationSms(Order order, OrderCancellation c, String cancelledBy) {
        String refundMsg = "INITIATED".equals(c.getRefundStatus())
            ? " Refund of Rs." + String.format("%.0f", c.getRefundAmount()) +
              " will be credited in 5-7 business days."
            : " No charge was made.";

        // To customer
        smsService.send(order.getCustomerPhone(),
            "Hi " + order.getCustomerName() + "! Your Flamehaus order #" + order.getId() +
            " has been cancelled" +
            (c.getReason() != null ? " (" + c.getReason() + ")" : "") + "." +
            refundMsg);

        // Log for admin if customer cancelled
        if ("CUSTOMER".equals(cancelledBy)) {
            System.out.println("[CANCEL] Customer cancelled order #" + order.getId() +
                " | Reason: " + c.getReason() + " | Refund: " + c.getRefundStatus());
        }
    }

    private boolean isCustomerCancellable(String status) {
        for (String s : CUSTOMER_CANCELLABLE) if (s.equals(status)) return true;
        return false;
    }

    private boolean isAdminCancellable(String status) {
        for (String s : ADMIN_CANCELLABLE) if (s.equals(status)) return true;
        return false;
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    public OrderCancellation getCancellation(Long orderId) {
        return cancellationRepo.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("No cancellation found for order #" + orderId));
    }

    /**
     * Called by AdminOrderController.cancel() to trigger refund.
     * Checks if payment exists and is in PAID status, then refunds.
     */
    public void processRefundForOrder(Long orderId) {
        paymentRepo.findByOrderId(orderId).ifPresent(payment -> {
            if (!"PAID".equals(payment.getStatus())) return;
            try {
                if ("RAZORPAY".equals(payment.getGateway())) {
                    RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
                    org.json.JSONObject opts = new org.json.JSONObject();
                    opts.put("speed", "normal");
                    client.payments.refund(payment.getGatewayPaymentId(), opts);
                } else if ("STRIPE".equals(payment.getGateway())) {
                    com.stripe.Stripe.apiKey = stripeSecretKey;
                    com.stripe.model.Refund.create(
                        com.stripe.param.RefundCreateParams.builder()
                            .setPaymentIntent(payment.getGatewayPaymentId())
                            .build());
                }
                payment.setStatus("REFUNDED");
                paymentRepo.save(payment);
                System.out.println("[REFUND] Order #" + orderId + " refunded via " + payment.getGateway());
            } catch (Exception e) {
                System.err.println("[REFUND-ERROR] Order #" + orderId + ": " + e.getMessage());
                payment.setStatus("REFUND_PENDING");
                paymentRepo.save(payment);
            }
        });
    }


    /**
     * Returns all cancellations ordered by most recent first.
     */
    public List<OrderCancellation> getAllCancellations() {
        return cancellationRepo.findAllByOrderByCreatedAtDesc();
    }


    // public java.util.List<OrderCancellation> getAllCancellations() {
    //     return cancellationRepo.findAllByOrderByIdDesc();
    // }
}
