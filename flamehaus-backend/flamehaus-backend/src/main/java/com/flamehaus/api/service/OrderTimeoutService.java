package com.flamehaus.api.service;

import com.flamehaus.api.entity.DeliveryAssignment;
import com.flamehaus.api.entity.DeliveryPartner;
import com.flamehaus.api.entity.Order;
import com.flamehaus.api.repository.DeliveryAssignmentRepository;
import com.flamehaus.api.repository.DeliveryPartnerRepository;
import com.flamehaus.api.repository.OrderRepository;
import com.flamehaus.api.repository.PaymentRepository;
import com.razorpay.RazorpayClient;
import com.stripe.Stripe;
import com.stripe.param.RefundCreateParams;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Delivery SLA: an order must be delivered within N minutes (default 120) of being
 * assigned to a delivery partner, otherwise it is cancelled automatically and the
 * customer is refunded.
 *
 * Design notes
 *  - Every database read/write that touches lazy relations runs inside a transaction
 *    (the scheduler thread has no Hibernate session, so lazy loading outside one fails).
 *  - The cancellation is committed FIRST. The refund (an external HTTP call) happens
 *    after, outside any transaction. If it fails the payment becomes REFUND_PENDING
 *    and an admin can retry it - the customer is never left half-cancelled.
 *  - Every cancellation is recorded in order_cancellations (cancelled_by = SYSTEM/ADMIN)
 *    so the admin and customer screens can show refund status.
 */
@Service
public class OrderTimeoutService {

    private static final List<String> LIVE = List.of("ASSIGNED", "ACCEPTED", "PICKED_UP");
    private static final List<String> TERMINAL_ORDER = List.of("Delivered", "Cancelled", "Refunded");
    private static final String AUTO_NOTE_PREFIX = "Auto-cancelled:";
    private static final double USD_TO_INR = 84.0;   // order totals are stored USD-equivalent

    @Value("${app.delivery.timeout-minutes:120}") private int timeoutMinutes;
    @Value("${app.delivery.warning-minutes:30}")  private int warningMinutes;
    @Value("${razorpay.key.id:}")                 private String razorpayKeyId;
    @Value("${razorpay.key.secret:}")             private String razorpayKeySecret;
    @Value("${stripe.secret.key:}")               private String stripeSecretKey;

    private final DeliveryAssignmentRepository assignmentRepo;
    private final DeliveryPartnerRepository    partnerRepo;
    private final OrderRepository              orderRepo;
    private final PaymentRepository            paymentRepo;
    private final SmsService                   smsService;
    private final DeliveryService              deliveryService;
    private final JdbcTemplate                 jdbc;
    private final TransactionTemplate          tx;

    private int runCounter = 0;

    public OrderTimeoutService(DeliveryAssignmentRepository assignmentRepo,
                               DeliveryPartnerRepository partnerRepo,
                               OrderRepository orderRepo,
                               PaymentRepository paymentRepo,
                               SmsService smsService,
                               DeliveryService deliveryService,
                               JdbcTemplate jdbc,
                               PlatformTransactionManager txManager) {
        this.assignmentRepo  = assignmentRepo;
        this.partnerRepo     = partnerRepo;
        this.orderRepo       = orderRepo;
        this.paymentRepo     = paymentRepo;
        this.smsService      = smsService;
        this.deliveryService = deliveryService;
        this.jdbc            = jdbc;
        this.tx              = new TransactionTemplate(txManager);
    }

    // ── Small value types ─────────────────────────────────────────────────────
    private record Cancelled(Long orderId, String customerName, String customerPhone,
                             double totalUsd, String partnerName, String partnerPhone) {}
    private record PayInfo(String gateway, String gatewayPaymentId) {}
    private record RefundResult(String status, String refundId, String gateway,
                                long amountInr, String note) {}

    // ══════════════════════════════════════════════════════════════════════════
    // Scheduler
    // ══════════════════════════════════════════════════════════════════════════

    @Scheduled(fixedDelayString   = "${app.delivery.check-interval-ms:60000}",
               initialDelayString = "${app.delivery.check-initial-delay-ms:30000}")
    public void scheduledRun() {
        try {
            checkTimeouts();
            if (++runCounter % 10 == 0) reconcileRefunds();
        } catch (Exception e) {
            System.err.println("[TIMEOUT] scheduler run failed: " + e.getMessage());
        }
    }

    /** Cancels every live assignment older than the SLA. Public so admin can trigger it. */
    public void checkTimeouts() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(timeoutMinutes);
        List<Long> ids = tx.execute(st ->
                assignmentRepo.findByStatusInAndAssignedAtBefore(LIVE, cutoff).stream()
                        .map(DeliveryAssignment::getId).toList());
        if (ids == null || ids.isEmpty()) return;

        System.out.println("[TIMEOUT] " + ids.size() + " assignment(s) older than " + humanLimit());
        for (Long id : ids) {
            try {
                processCancel(id, "SYSTEM", "Auto-cancel",
                        "Delivery not completed within " + humanLimit() + " of assignment",
                        AUTO_NOTE_PREFIX + " not delivered within " + humanLimit() + " of assignment.",
                        true);
            } catch (Exception e) {
                System.err.println("[TIMEOUT] assignment #" + id + " failed: " + e.getMessage());
            }
        }
    }

    /** Kept so an existing TimeoutTestController still compiles. */
    public String manualTimeoutCheck(Long orderId) {
        return cancelNow(orderId, "Manual timeout test", "admin");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Cancel + refund pipeline
    // ══════════════════════════════════════════════════════════════════════════

    private String processCancel(Long assignmentId, String by, String byName,
                                 String reason, String note, boolean auto) {

        // Phase 1 — one transaction: close assignment, free partner, cancel order.
        Cancelled c = tx.execute(st -> {
            DeliveryAssignment a = assignmentRepo.findById(assignmentId).orElse(null);
            if (a == null || !LIVE.contains(a.getStatus())) return null;

            Order o = a.getOrder();
            DeliveryPartner p = a.getPartner();

            // Order already finished some other way: just close the stale assignment.
            if (TERMINAL_ORDER.contains(o.getStatus())) {
                a.setStatus("Delivered".equals(o.getStatus()) ? "DELIVERED" : "FAILED");
                assignmentRepo.save(a);
                freePartner(p);
                return null;
            }

            a.setStatus("FAILED");
            assignmentRepo.save(a);
            freePartner(p);

            o.setStatus("Cancelled");
            o.setTrackingNote(note);
            o.setUpdatedAt(LocalDateTime.now());
            orderRepo.save(o);

            return new Cancelled(o.getId(), o.getCustomerName(), o.getCustomerPhone(),
                    o.getTotal() != null ? o.getTotal() : 0.0,
                    p != null ? p.getName() : null, p != null ? p.getPhone() : null);
        });
        if (c == null) return "Nothing to cancel - the assignment is already closed.";

        // Phase 2 — refund (external call, outside any transaction).
        RefundResult rr = refundIfPaid(c.orderId(), c.totalUsd());

        // Phase 3 — record + payment status + notifications.
        recordCancellation(c.orderId(), by, byName, reason, rr);
        applyPaymentOutcome(c.orderId(), rr);
        notifyCustomer(c, rr, auto);
        notifyPartner(c);

        String summary = "Order #" + c.orderId() + " cancelled. Refund: " + rr.status()
                + (rr.amountInr() > 0 ? " (Rs." + rr.amountInr() + ")" : "");
        System.out.println("[TIMEOUT] " + summary);
        return summary;
    }

    private void freePartner(DeliveryPartner p) {
        if (p != null && "BUSY".equals(p.getAvailability())) {
            p.setAvailability("ONLINE");
            partnerRepo.save(p);
        }
    }

    private RefundResult refundIfPaid(Long orderId, double totalUsd) {
        PayInfo pi = tx.execute(st -> paymentRepo.findByOrderId(orderId)
                .filter(p -> "PAID".equals(p.getStatus()) || "REFUND_PENDING".equals(p.getStatus()))
                .map(p -> new PayInfo(p.getGateway(), p.getGatewayPaymentId()))
                .orElse(null));
        long amountInr = Math.round(totalUsd * USD_TO_INR);

        if (pi == null)
            return new RefundResult("NOT_APPLICABLE", null, null, 0, "No online payment to refund");

        try {
            String refundId = switch (String.valueOf(pi.gateway()).toUpperCase()) {
                case "RAZORPAY" -> refundRazorpay(pi.gatewayPaymentId());
                case "STRIPE"   -> refundStripe(pi.gatewayPaymentId());
                default -> throw new IllegalStateException("Unknown payment gateway: " + pi.gateway());
            };
            return new RefundResult("INITIATED", refundId, pi.gateway(), amountInr,
                    "Automatic refund via " + pi.gateway() + (refundId != null ? " ref " + refundId : ""));
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return new RefundResult("FAILED", null, pi.gateway(), amountInr, trunc("Refund failed: " + msg, 280));
        }
    }

    private String refundRazorpay(String paymentId) throws Exception {
        if (razorpayKeyId.isBlank() || razorpayKeySecret.isBlank())
            throw new IllegalStateException("Razorpay keys not configured (razorpay.key.id / razorpay.key.secret)");
        RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
        JSONObject opts = new JSONObject();
        opts.put("speed", "normal");
        var refund = client.payments.refund(paymentId, opts);
        return refund.toJson().optString("id", null);
    }

    private String refundStripe(String paymentIntentId) throws Exception {
        if (stripeSecretKey.isBlank())
            throw new IllegalStateException("Stripe key not configured (stripe.secret.key)");
        Stripe.apiKey = stripeSecretKey;
        com.stripe.model.Refund r = com.stripe.model.Refund.create(
                RefundCreateParams.builder().setPaymentIntent(paymentIntentId).build());
        return r.getId();
    }

    /** Insert, or - if a row for this order already exists - update only the refund columns. */
    private void recordCancellation(Long orderId, String by, String byName, String reason, RefundResult rr) {
        try {
            Timestamp now = Timestamp.valueOf(LocalDateTime.now());
            Timestamp initiated = "INITIATED".equals(rr.status()) ? now : null;
            Double amount = rr.amountInr() > 0 ? Double.valueOf(rr.amountInr()) : null;
            jdbc.update(
                "INSERT INTO order_cancellations (order_id, cancelled_by, cancelled_by_name, reason, cancelled_at, " +
                "refund_status, refund_id, refund_amount, refund_gateway, refund_initiated_at, refund_note) " +
                "VALUES (?,?,?,?,?,?,?,?,?,?,?) " +
                "ON DUPLICATE KEY UPDATE refund_status=VALUES(refund_status), refund_id=VALUES(refund_id), " +
                "refund_amount=VALUES(refund_amount), refund_gateway=VALUES(refund_gateway), " +
                "refund_initiated_at=VALUES(refund_initiated_at), refund_note=VALUES(refund_note)",
                orderId, by, byName, trunc(reason, 290), now,
                rr.status(), rr.refundId(), amount, rr.gateway(), initiated, rr.note());
        } catch (Exception e) {
            // Never let a logging failure undo a cancellation that already committed.
            System.err.println("[TIMEOUT] could not write order_cancellations for #" + orderId + ": " + e.getMessage());
        }
    }

    private void applyPaymentOutcome(Long orderId, RefundResult rr) {
        final String payStatus = switch (rr.status()) {
            case "INITIATED" -> "REFUNDED";
            case "FAILED"    -> "REFUND_PENDING";
            default          -> null;
        };
        if (payStatus == null) return;
        tx.executeWithoutResult(st -> {
            paymentRepo.findByOrderId(orderId).ifPresent(p -> { p.setStatus(payStatus); paymentRepo.save(p); });
            orderRepo.findById(orderId).ifPresent(o -> { o.setPaymentStatus(payStatus); orderRepo.save(o); });
        });
    }

    private void notifyCustomer(Cancelled c, RefundResult rr, boolean auto) {
        if (c.customerPhone() == null || c.customerPhone().isBlank()) return;
        String why = auto
                ? "was automatically cancelled because it was not delivered within " + humanLimit()
                : "was cancelled by our team";
        String refundLine = switch (rr.status()) {
            case "INITIATED" -> "A full refund of Rs." + rr.amountInr()
                    + " has been initiated to your original payment method and should reach you in 5-7 business days.";
            case "FAILED"    -> "Your refund of Rs." + rr.amountInr()
                    + " is being processed by our team and will be completed within 24 hours.";
            default          -> "No online payment was received for this order, so no refund is due.";
        };
        try {
            smsService.send(c.customerPhone(), "Hi " + c.customerName() + ", your Flamehaus order #"
                    + c.orderId() + " " + why + ". " + refundLine + " We are sorry for the trouble.");
        } catch (Exception e) {
            System.err.println("[TIMEOUT] customer SMS failed: " + e.getMessage());
        }
    }

    private void notifyPartner(Cancelled c) {
        if (c.partnerPhone() == null || c.partnerPhone().isBlank()) return;
        try {
            smsService.send(c.partnerPhone(), "Order #" + c.orderId()
                    + " has been cancelled (not delivered within the time limit). You are available for new orders again.");
        } catch (Exception e) {
            System.err.println("[TIMEOUT] partner SMS failed: " + e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Admin actions
    // ══════════════════════════════════════════════════════════════════════════

    /** Cancel a live delivery right now (and refund), without waiting for the SLA. */
    public String cancelNow(Long orderId, String reason, String adminName) {
        Long assignmentId = tx.execute(st ->
                assignmentRepo.findActiveByOrderId(orderId).map(DeliveryAssignment::getId).orElse(null));
        if (assignmentId == null)
            throw new RuntimeException("Order #" + orderId + " has no live delivery assignment");
        String r = (reason == null || reason.isBlank()) ? "Cancelled by admin" : reason;
        return processCancel(assignmentId, "ADMIN", adminName, r, "Cancelled by admin: " + r, false);
    }

    /**
     * Move a late order to another partner. The old assignment is closed properly
     * (REJECTED, so that partner is excluded) and the old partner is freed.
     * All-or-nothing: if no other partner is online, nothing changes.
     * Only before pickup - once the food is with the partner, cancel instead.
     */
    public String reassignNow(Long orderId) {
        return tx.execute(st -> {
            DeliveryAssignment a = assignmentRepo.findActiveByOrderId(orderId)
                    .orElseThrow(() -> new RuntimeException("Order #" + orderId + " has no live delivery assignment"));
            if (!List.of("ASSIGNED", "ACCEPTED").contains(a.getStatus()))
                throw new RuntimeException("Cannot reassign: the order is already "
                        + a.getStatus().toLowerCase().replace('_', ' ') + ". Cancel it instead.");

            DeliveryPartner old = a.getPartner();
            String oldName = old != null ? old.getName() : "previous partner";

            a.setStatus("REJECTED");
            a.setRejectedAt(LocalDateTime.now());
            a.setRejectionReason("Reassigned by admin (delivery running late)");
            assignmentRepo.saveAndFlush(a);
            if (old != null && "BUSY".equals(old.getAvailability())) {
                old.setAvailability("ONLINE");
                partnerRepo.saveAndFlush(old);
            }

            DeliveryAssignment next = deliveryService.adminReassign(orderId, null);
            return "Order #" + orderId + " moved from " + oldName + " to " + next.getPartner().getName();
        });
    }

    /** Retry a refund that failed earlier (payment is REFUND_PENDING). */
    public String retryRefund(Long orderId) {
        Order o = tx.execute(st -> orderRepo.findById(orderId).orElse(null));
        if (o == null) throw new RuntimeException("Order not found: " + orderId);

        RefundResult rr = refundIfPaid(orderId, o.getTotal() != null ? o.getTotal() : 0.0);
        if ("NOT_APPLICABLE".equals(rr.status()))
            throw new RuntimeException("No refundable payment found for order #" + orderId);

        recordCancellation(orderId, "ADMIN", "Refund retry", "Refund retry", rr);
        applyPaymentOutcome(orderId, rr);
        return "FAILED".equals(rr.status())
                ? "Refund failed again: " + rr.note()
                : "Refund of Rs." + rr.amountInr() + " initiated for order #" + orderId;
    }

    /**
     * Crash recovery: an auto-cancelled order whose payment is still PAID means the app
     * stopped between "cancel" and "refund". Finish the refund. Runs every ~10 minutes.
     */
    public void reconcileRefunds() {
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        for (Order o : orderRepo.findByStatus("Cancelled")) {
            try {
                String note = o.getTrackingNote();
                if (note == null || !note.startsWith(AUTO_NOTE_PREFIX)) continue;
                if (o.getUpdatedAt() == null || o.getUpdatedAt().isBefore(since)) continue;

                Boolean stillPaid = tx.execute(st -> paymentRepo.findByOrderId(o.getId())
                        .map(p -> "PAID".equals(p.getStatus())).orElse(false));
                if (!Boolean.TRUE.equals(stillPaid)) continue;

                RefundResult rr = refundIfPaid(o.getId(), o.getTotal() != null ? o.getTotal() : 0.0);
                recordCancellation(o.getId(), "SYSTEM", "Auto-cancel",
                        "Delivery not completed within " + humanLimit() + " of assignment", rr);
                applyPaymentOutcome(o.getId(), rr);
                System.out.println("[TIMEOUT] reconciled refund for order #" + o.getId() + ": " + rr.status());
            } catch (Exception e) {
                System.err.println("[TIMEOUT] reconcile failed for order #" + o.getId() + ": " + e.getMessage());
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Read models for the admin and customer screens
    // ══════════════════════════════════════════════════════════════════════════

    public Map<String, Object> overview() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("timeoutMinutes", timeoutMinutes);
        out.put("warningMinutes", warningMinutes);
        out.put("serverNow", LocalDateTime.now());

        // Live deliveries (oldest first). "assigned before now+1min" == every live assignment.
        List<Map<String, Object>> live = tx.execute(st -> {
            List<DeliveryAssignment> list = new ArrayList<>(
                    assignmentRepo.findByStatusInAndAssignedAtBefore(LIVE, LocalDateTime.now().plusMinutes(1)));
            list.sort((x, y) -> x.getAssignedAt().compareTo(y.getAssignedAt()));
            List<Map<String, Object>> rows = new ArrayList<>();
            for (DeliveryAssignment a : list) {
                if (a.getAssignedAt() == null) continue;
                Order o = a.getOrder();
                DeliveryPartner p = a.getPartner();
                long elapsed = ChronoUnit.MINUTES.between(a.getAssignedAt(), LocalDateTime.now());
                long left = timeoutMinutes - elapsed;
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("assignmentId", a.getId());
                m.put("orderId", o.getId());
                m.put("assignmentStatus", a.getStatus());
                m.put("customerName", o.getCustomerName());
                m.put("customerPhone", o.getCustomerPhone());
                m.put("address", o.getFullAddress());
                m.put("totalInr", Math.round((o.getTotal() != null ? o.getTotal() : 0.0) * USD_TO_INR));
                m.put("partnerName", p != null ? p.getName() : null);
                m.put("partnerPhone", p != null ? p.getPhone() : null);
                m.put("assignedAt", a.getAssignedAt());
                m.put("deadline", a.getAssignedAt().plusMinutes(timeoutMinutes));
                m.put("minutesElapsed", elapsed);
                m.put("minutesLeft", left);
                m.put("state", left <= 0 ? "OVERDUE" : left <= warningMinutes ? "WARNING" : "ON_TRACK");
                rows.add(m);
            }
            return rows;
        });
        out.put("live", live);

        // Auto-cancelled orders and their refund status.
        List<Map<String, Object>> auto = new ArrayList<>();
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT order_id, reason, cancelled_at, refund_status, refund_id, refund_amount, refund_gateway, refund_note " +
                "FROM order_cancellations WHERE cancelled_by = 'SYSTEM' ORDER BY id DESC LIMIT 50");
            for (Map<String, Object> r : rows) {
                Long orderId = ((Number) r.get("order_id")).longValue();
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("orderId", orderId);
                orderRepo.findById(orderId).ifPresent(o -> {
                    m.put("customerName", o.getCustomerName());
                    m.put("customerPhone", o.getCustomerPhone());
                });
                m.put("reason", r.get("reason"));
                m.put("cancelledAt", toLdt(r.get("cancelled_at")));
                m.put("refundStatus", r.get("refund_status"));
                m.put("refundId", r.get("refund_id"));
                m.put("refundAmountInr", r.get("refund_amount"));
                m.put("refundGateway", r.get("refund_gateway"));
                m.put("refundNote", r.get("refund_note"));
                auto.add(m);
            }
        } catch (Exception e) {
            System.err.println("[TIMEOUT] overview: could not read order_cancellations: " + e.getMessage());
        }
        out.put("autoCancelled", auto);

        // Cancelled orders whose refund still needs a human.
        List<Map<String, Object>> pending = new ArrayList<>();
        orderRepo.findByStatus("Cancelled").stream()
                .sorted((a, b) -> {
                    LocalDateTime x = a.getUpdatedAt(), y = b.getUpdatedAt();
                    if (x == null && y == null) return 0;
                    if (x == null) return 1;
                    if (y == null) return -1;
                    return y.compareTo(x);
                })
                .limit(100)
                .forEach(o -> paymentRepo.findByOrderId(o.getId()).ifPresent(p -> {
                    if (!"REFUND_PENDING".equals(p.getStatus())) return;
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("orderId", o.getId());
                    m.put("customerName", o.getCustomerName());
                    m.put("customerPhone", o.getCustomerPhone());
                    m.put("totalInr", Math.round((o.getTotal() != null ? o.getTotal() : 0.0) * USD_TO_INR));
                    m.put("gateway", p.getGateway());
                    m.put("note", readRefundNote(o.getId()));
                    pending.add(m);
                }));
        out.put("refundPending", pending);
        return out;
    }

    /** What a customer sees on a cancelled order: why, and where the refund stands. */
    public Map<String, Object> refundStatusForCustomer(Long orderId, Long customerId) {
        Order o = ownedOrder(orderId, customerId);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("orderId", orderId);
        m.put("orderStatus", o.getStatus());
        m.put("expectedCredit", "5-7 business days");

        String payStatus = tx.execute(st -> paymentRepo.findByOrderId(orderId).map(p -> p.getStatus()).orElse(null));
        m.put("paymentStatus", payStatus);

        try {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT cancelled_by, reason, cancelled_at, refund_status, refund_id, refund_amount, " +
                "refund_gateway, refund_initiated_at FROM order_cancellations WHERE order_id = ?", orderId);
            if (!rows.isEmpty()) {
                Map<String, Object> r = rows.get(0);
                m.put("cancelledBy", r.get("cancelled_by"));
                m.put("reason", r.get("reason"));
                m.put("cancelledAt", toLdt(r.get("cancelled_at")));
                m.put("refundStatus", r.get("refund_status"));
                m.put("refundId", r.get("refund_id"));
                m.put("refundAmountInr", r.get("refund_amount"));
                m.put("refundGateway", r.get("refund_gateway"));
                m.put("refundInitiatedAt", toLdt(r.get("refund_initiated_at")));
            }
        } catch (Exception e) {
            System.err.println("[TIMEOUT] refund-status read failed: " + e.getMessage());
        }
        if (!m.containsKey("refundStatus")) {
            // Cancelled through another path: infer from the payment.
            m.put("refundStatus", "REFUNDED".equals(payStatus) ? "INITIATED"
                    : "REFUND_PENDING".equals(payStatus) ? "FAILED" : "NOT_APPLICABLE");
            m.put("refundAmountInr", Math.round((o.getTotal() != null ? o.getTotal() : 0.0) * USD_TO_INR));
        }
        m.put("trackingNote", o.getTrackingNote());
        return m;
    }

    /** Countdown data for the customer banner. Uses the SERVER clock so a wrong phone clock can't mislead. */
    public Map<String, Object> deliveryTimerForCustomer(Long orderId, Long customerId) {
        ownedOrder(orderId, customerId);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("serverNow", LocalDateTime.now());
        m.put("timeoutMinutes", timeoutMinutes);
        m.put("warningMinutes", warningMinutes);
        m.put("active", false);

        tx.executeWithoutResult(st -> {
            Optional<DeliveryAssignment> opt = assignmentRepo.findActiveByOrderId(orderId);
            if (opt.isEmpty()) return;
            DeliveryAssignment a = opt.get();
            if (!LIVE.contains(a.getStatus()) || a.getAssignedAt() == null) return;
            long elapsed = ChronoUnit.MINUTES.between(a.getAssignedAt(), LocalDateTime.now());
            m.put("active", true);
            m.put("status", a.getStatus());
            m.put("assignedAt", a.getAssignedAt());
            m.put("deadline", a.getAssignedAt().plusMinutes(timeoutMinutes));
            m.put("minutesLeft", timeoutMinutes - elapsed);
        });
        return m;
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private Order ownedOrder(Long orderId, Long customerId) {
        Order o = tx.execute(st -> {
            Order x = orderRepo.findById(orderId).orElse(null);
            if (x == null || x.getCustomer() == null || !x.getCustomer().getId().equals(customerId)) return null;
            return x;
        });
        if (o == null) throw new RuntimeException("Order not found");
        return o;
    }

    private String readRefundNote(Long orderId) {
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT refund_note FROM order_cancellations WHERE order_id = ?", orderId);
            return rows.isEmpty() ? null : (String) rows.get(0).get("refund_note");
        } catch (Exception e) {
            return null;
        }
    }

    private static LocalDateTime toLdt(Object v) {
        if (v instanceof Timestamp t) return t.toLocalDateTime();
        if (v instanceof LocalDateTime l) return l;
        return null;
    }

    private String humanLimit() {
        if (timeoutMinutes % 60 == 0) {
            int h = timeoutMinutes / 60;
            return h + (h == 1 ? " hour" : " hours");
        }
        return timeoutMinutes + " minutes";
    }

    private static String trunc(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
