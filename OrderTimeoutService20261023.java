package com.flamehaus.api.service;

import com.flamehaus.api.entity.DeliveryAssignment;
import com.flamehaus.api.entity.Order;
import com.flamehaus.api.entity.Payment;
import com.flamehaus.api.repository.DeliveryAssignmentRepository;
import com.flamehaus.api.repository.OrderRepository;
import com.flamehaus.api.repository.PaymentRepository;
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
 * Checks every 5 minutes for orders assigned to delivery partner
 * but not delivered within 2 hours of assignment.
 * On timeout: cancels the order, frees the partner, initiates refund.
 */
@Service
public class OrderTimeoutService {

    private static final int TIMEOUT_HOURS = 2;

    @Value("${razorpay.key.id}")    private String razorpayKeyId;
    @Value("${razorpay.key.secret}")private String razorpayKeySecret;
    @Value("${stripe.secret.key}")  private String stripeSecretKey;

    private final OrderRepository              orderRepo;
    private final DeliveryAssignmentRepository assignmentRepo;
    private final PaymentRepository            paymentRepo;
    private final SmsService                   smsService;

    public OrderTimeoutService(OrderRepository orderRepo,
                                DeliveryAssignmentRepository assignmentRepo,
                                PaymentRepository paymentRepo,
                                SmsService smsService) {
        this.orderRepo      = orderRepo;
        this.assignmentRepo = assignmentRepo;
        this.paymentRepo    = paymentRepo;
        this.smsService     = smsService;
    }

    /**
     * Runs every 5 minutes.
     * Finds assignments that are ASSIGNED/ACCEPTED/PICKED_UP and
     * were created more than 2 hours ago.
     */
    @Scheduled(fixedDelay = 300_000) // every 5 minutes
    public void checkTimeouts() {
        LocalDateTime cutoff = LocalDateTime.now().minus(TIMEOUT_HOURS, ChronoUnit.HOURS);

        List<DeliveryAssignment> timedOut = assignmentRepo
                .findByStatusInAndAssignedAtBefore(
                    List.of("ASSIGNED", "ACCEPTED", "PICKED_UP"), cutoff);

        if (!timedOut.isEmpty()) {
            System.out.println("[TIMEOUT] Found " + timedOut.size() +
                " assignment(s) exceeding " + TIMEOUT_HOURS + "h SLA");
        }

        for (DeliveryAssignment a : timedOut) {
            try {
                processTimeout(a);
            } catch (Exception e) {
                System.err.println("[TIMEOUT-ERROR] Assignment #" + a.getId() +
                    ": " + e.getMessage());
            }
        }
    }

    private void processTimeout(DeliveryAssignment assignment) {
        Order order = assignment.getOrder();
        System.out.println("[TIMEOUT] Processing order #" + order.getId() +
            " (assigned " + ChronoUnit.MINUTES.between(assignment.getAssignedAt(),
            LocalDateTime.now()) + " min ago)");

        // 1. Mark assignment as FAILED
        assignment.setStatus("FAILED");
        assignmentRepo.save(assignment);

        // 2. Free delivery partner back to ONLINE
        if (assignment.getPartner() != null) {
            var partner = assignment.getPartner();
            partner.setAvailability("ONLINE");
            // Note: partnerRepo saved via cascade from assignment or separately
            System.out.println("[TIMEOUT] Freed partner: " + partner.getName());
        }

        // 3. Cancel order
        order.setStatus("Cancelled");
        order.setTrackingNote("Order automatically cancelled: not delivered within " +
            TIMEOUT_HOURS + " hours of assignment.");
        order.setUpdatedAt(LocalDateTime.now());
        orderRepo.save(order);

        // 4. Initiate refund if payment was made
        processRefund(order);

        // 5. SMS customer
        smsService.send(order.getCustomerPhone(),
            "Hi " + order.getCustomerName() + ", your Flamehaus order #" + order.getId() +
            " was automatically cancelled as it could not be delivered within " +
            TIMEOUT_HOURS + " hours. " +
            "If payment was made, a full refund will be credited within 5-7 business days. " +
            "We apologise for the inconvenience.");

        System.out.println("[TIMEOUT] Order #" + order.getId() + " cancelled and refund initiated");
    }

    private void processRefund(Order order) {
        paymentRepo.findByOrderId(order.getId()).ifPresent(payment -> {
            if (!"PAID".equals(payment.getStatus())) return; // nothing to refund

            try {
                if ("RAZORPAY".equals(payment.getGateway())) {
                    refundRazorpay(payment);
                } else if ("STRIPE".equals(payment.getGateway())) {
                    refundStripe(payment);
                }
                payment.setStatus("REFUNDED");
                paymentRepo.save(payment);
                System.out.println("[TIMEOUT-REFUND] Refund initiated for order #" +
                    order.getId() + " via " + payment.getGateway());
            } catch (Exception e) {
                System.err.println("[TIMEOUT-REFUND-ERROR] Order #" + order.getId() +
                    ": " + e.getMessage());
                // Mark as REFUND_PENDING so admin can manually process
                payment.setStatus("REFUND_PENDING");
                paymentRepo.save(payment);
            }
        });
    }

    private void refundRazorpay(Payment payment) throws Exception {
        RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
        JSONObject options = new JSONObject();
        options.put("speed", "normal");
        client.payments.refund(payment.getGatewayPaymentId(), options);
    }

    private void refundStripe(Payment payment) throws Exception {
        Stripe.apiKey = stripeSecretKey;
        RefundCreateParams params = RefundCreateParams.builder()
                .setPaymentIntent(payment.getGatewayPaymentId())
                .setReason(RefundCreateParams.Reason.FRAUDULENT) // closest to "service not rendered"
                .build();
        Refund.create(params);
    }
}