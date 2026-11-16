package com.flamehaus.api.service;

import com.flamehaus.api.dto.OrderRequest;
import com.flamehaus.api.entity.DeliveryAssignment;
import com.flamehaus.api.entity.DeliveryPartner;
import com.flamehaus.api.entity.Order;
import com.flamehaus.api.repository.CustomerRepository;
import com.flamehaus.api.repository.OrderRepository;
import com.flamehaus.api.repository.PaymentRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class OrderService {

    /** Thrown only when the order really does not exist (or is not the caller's). */
    public static class OrderNotFoundException extends RuntimeException {
        public OrderNotFoundException(Long id) { super("Order not found: " + id); }
    }

    private static final List<String> LIVE = List.of("ASSIGNED", "ACCEPTED", "PICKED_UP");

    private final OrderRepository    orderRepo;
    private final CustomerRepository customerRepo;
    private final PaymentRepository  paymentRepo;
    private final DeliveryService    deliveryService;
    private final SmsService         smsService;

    public OrderService(OrderRepository orderRepo,
                        CustomerRepository customerRepo,
                        PaymentRepository paymentRepo,
                        @Lazy DeliveryService deliveryService,
                        SmsService smsService) {
        this.orderRepo       = orderRepo;
        this.customerRepo    = customerRepo;
        this.paymentRepo     = paymentRepo;
        this.deliveryService = deliveryService;
        this.smsService      = smsService;
    }

    // ── Place order ───────────────────────────────────────────────────────────

    public Order placeOrder(OrderRequest req, Long customerId) {
        Order order = new Order();
        order.setCustomerName(req.getCustomerName());
        order.setCustomerPhone(req.getCustomerPhone());
        order.setDeliveryAddress(req.getDeliveryAddress());
        order.setAddressLine1(req.getAddressLine1());
        order.setAddressLine2(req.getAddressLine2());
        order.setLandmark(req.getLandmark());
        order.setCity(req.getCity());
        order.setState(req.getState());
        order.setPincode(req.getPincode());
        order.setDeliveryLat(req.getDeliveryLat());
        order.setDeliveryLng(req.getDeliveryLng());
        order.setTotal(req.getTotal());
        order.setItemsSummary(req.getItemsSummary());
        order.setCouponCode(req.getCouponCode());
        order.setDiscountAmountInr(req.getDiscountAmountInr());
        order.setStatus("Pending");
        order.setPaymentStatus("PENDING");          // payment_status column is NOT NULL
        order.setTrackingNote("Order placed successfully. Awaiting confirmation.");
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());
        order.setEstimatedDelivery(LocalDateTime.now().plusHours(1));
        if (customerId != null)
            customerRepo.findById(customerId).ifPresent(order::setCustomer);
        return orderRepo.save(order);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Order views. Every one returns PLAIN FIELDS ONLY - never a database entity -
    // so JSON conversion cannot fail and nothing sensitive leaks by accident.
    // ══════════════════════════════════════════════════════════════════════════

    /** PUBLIC (no login): safe summary only. Used by the payment page and as a guest fallback. */
    @Transactional(readOnly = true)
    public Map<String, Object> trackOrder(Long orderId) {
        return publicView(findOrder(orderId));
    }

    /** The logged-in customer's own order: adds address, partner and the delivery OTP. */
    @Transactional(readOnly = true)
    public Map<String, Object> orderDetailForCustomer(Long orderId, Long customerId) {
        Order o = findOrder(orderId);
        if (o.getCustomer() == null || !o.getCustomer().getId().equals(customerId))
            throw new OrderNotFoundException(orderId);      // don't reveal other people's orders

        Map<String, Object> m = publicView(o);
        addContactAndAddress(m, o);

        Map<String, Object> pay = new LinkedHashMap<>();
        pay.put("status", o.getPaymentStatus());
        pay.put("gateway", o.getPaymentMethod());
        m.put("payment", pay);

        currentAssignment(orderId).ifPresent(a -> m.put("assignment", assignmentView(a, true, false)));
        return m;
    }

    /** Admin: everything the admin order page needs. */
    @Transactional(readOnly = true)
    public Map<String, Object> orderDetailForAdmin(Long orderId) {
        Order o = findOrder(orderId);
        Map<String, Object> m = publicView(o);
        addContactAndAddress(m, o);
        m.put("deliveryLat", o.getDeliveryLat());
        m.put("deliveryLng", o.getDeliveryLng());

        Map<String, Object> pay = new LinkedHashMap<>();
        pay.put("status", o.getPaymentStatus());
        pay.put("gateway", o.getPaymentMethod());
        try {
            paymentRepo.findByOrderId(orderId).ifPresent(p -> {
                pay.put("status", p.getStatus());
                pay.put("gateway", p.getGateway());
                pay.put("gatewayPaymentId", p.getGatewayPaymentId());
            });
        } catch (RuntimeException e) {
            // several payment rows / lookup problem: keep the order's own payment fields
            System.err.println("[ORDER] payment lookup failed for #" + orderId + ": " + e.getMessage());
        }
        if (pay.get("status") != null || pay.get("gateway") != null) m.put("payment", pay);

        currentAssignment(orderId).ifPresent(a -> m.put("assignment", assignmentView(a, true, true)));
        return m;
    }

    private Map<String, Object> publicView(Order o) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",                o.getId());
        m.put("status",            o.getStatus());
        m.put("trackingNote",      o.getTrackingNote());
        m.put("itemsSummary",      o.getItemsSummary());
        m.put("total",             o.getTotal());
        m.put("couponCode",        o.getCouponCode());
        m.put("discountAmountInr", o.getDiscountAmountInr());
        m.put("paymentStatus",     o.getPaymentStatus());
        m.put("city",              o.getCity());
        m.put("createdAt",         o.getCreatedAt());
        m.put("updatedAt",         o.getUpdatedAt());
        m.put("estimatedDelivery", o.getEstimatedDelivery());
        return m;
    }

    private void addContactAndAddress(Map<String, Object> m, Order o) {
        m.put("customerName",    o.getCustomerName());
        m.put("customerPhone",   o.getCustomerPhone());
        m.put("deliveryAddress", o.getDeliveryAddress());
        m.put("addressLine1",    o.getAddressLine1());
        m.put("addressLine2",    o.getAddressLine2());
        m.put("landmark",        o.getLandmark());
        m.put("state",           o.getState());
        m.put("pincode",         o.getPincode());
    }

    private Map<String, Object> assignmentView(DeliveryAssignment a, boolean includeOtp, boolean admin) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          a.getId());
        m.put("status",      a.getStatus());
        m.put("assignedAt",  a.getAssignedAt());
        m.put("acceptedAt",  a.getAcceptedAt());
        m.put("pickedUpAt",  a.getPickedUpAt());
        m.put("deliveredAt", a.getDeliveredAt());
        if (admin) {
            m.put("rejectedAt",      a.getRejectedAt());
            m.put("rejectionReason", a.getRejectionReason());
        }
        if (includeOtp && LIVE.contains(a.getStatus()))     // OTP only while delivery is in progress
            m.put("deliveryOtp", a.getDeliveryOtp());
        DeliveryPartner p = a.getPartner();
        if (p != null) {
            Map<String, Object> pm = new LinkedHashMap<>();
            pm.put("id",            p.getId());
            pm.put("name",          p.getName());
            pm.put("phone",         p.getPhone());
            pm.put("vehicleType",   p.getVehicleType());
            pm.put("vehicleNumber", p.getVehicleNumber());
            m.put("partner", pm);
        }
        return m;
    }

    /** Never throws: if the lookup misbehaves the order page still loads, just without partner info. */
    private Optional<DeliveryAssignment> currentAssignment(Long orderId) {
        try {
            return deliveryService.getAssignmentByOrderId(orderId);
        } catch (RuntimeException e) {
            System.err.println("[ORDER] assignment lookup failed for #" + orderId + ": " + e.getMessage());
            return Optional.empty();
        }
    }

    private Order findOrder(Long orderId) {
        return orderRepo.findById(orderId).orElseThrow(() -> new OrderNotFoundException(orderId));
    }

    // ── Customer orders ───────────────────────────────────────────────────────

    public List<Order> getCustomerOrders(Long customerId) {
        return orderRepo.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    // ── Advance status ────────────────────────────────────────────────────────

    public Order advanceStatus(Long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        String next = switch (order.getStatus()) {
            case "Pending"    -> "Confirmed";
            case "Confirmed"  -> "Preparing";
            case "Preparing"  -> "On the Way";
            case "On the Way" -> "Delivered";
            default -> throw new RuntimeException("Cannot advance from: " + order.getStatus());
        };
        order.setStatus(next);
        order.setTrackingNote(trackingNote(next));
        order.setUpdatedAt(LocalDateTime.now());
        orderRepo.save(order);
        if ("Preparing".equals(next))
            deliveryService.autoAssign(orderId);
        return order;
    }

    // ── Set specific status ───────────────────────────────────────────────────

    public Order setStatus(Long orderId, String newStatus) {
        if (newStatus == null || newStatus.isBlank())
            throw new RuntimeException("Status is required");
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        order.setStatus(newStatus);
        order.setTrackingNote(trackingNote(newStatus));
        order.setUpdatedAt(LocalDateTime.now());
        return orderRepo.save(order);
    }

    // ── Cancel helpers (HTTP endpoints for these live in CancellationController) ─

    public Map<String, Object> cancelCustomerOrder(Long orderId, Long customerId, String reason) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        if (order.getCustomer() == null || !order.getCustomer().getId().equals(customerId))
            throw new RuntimeException("Access denied");
        if (!List.of("Pending", "Confirmed", "Preparing").contains(order.getStatus()))
            throw new RuntimeException("Cannot cancel order in status: " + order.getStatus());
        order.setStatus("Cancelled");
        order.setTrackingNote("Cancelled by customer: " + reason);
        order.setUpdatedAt(LocalDateTime.now());
        orderRepo.save(order);
        freeDeliveryPartner(orderId);
        smsService.send(order.getCustomerPhone(),
            "Hi " + order.getCustomerName() + ", your Flamehaus order #" + orderId
            + " has been cancelled. Refund (if paid) within 5-7 business days.");
        return Map.of("message", "Order cancelled", "orderId", orderId);
    }

    public Map<String, Object> cancelAdminOrder(Long orderId, String reason) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        if (List.of("Delivered", "Refunded").contains(order.getStatus()))
            throw new RuntimeException("Cannot cancel: " + order.getStatus());
        order.setStatus("Cancelled");
        order.setTrackingNote("Cancelled by admin: " + reason);
        order.setUpdatedAt(LocalDateTime.now());
        orderRepo.save(order);
        freeDeliveryPartner(orderId);
        smsService.send(order.getCustomerPhone(),
            "Hi " + order.getCustomerName() + ", your Flamehaus order #" + orderId
            + " was cancelled by admin. Refund (if paid) within 5-7 business days.");
        return Map.of("message", "Order cancelled by admin", "orderId", orderId);
    }

    // ── Dashboard (revenue = Delivered orders only; totals stored USD-equivalent, x84 = INR) ─

    public Map<String, Object> getDashboardData() {
        List<Order> all = orderRepo.findAll();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalOrders",    all.size());
        data.put("pending",        countStatus(all, "Pending"));
        data.put("confirmed",      countStatus(all, "Confirmed"));
        data.put("preparing",      countStatus(all, "Preparing"));
        data.put("onTheWay",       countStatus(all, "On the Way"));
        data.put("delivered",      countStatus(all, "Delivered"));
        data.put("cancelled",      countStatus(all, "Cancelled"));
        data.put("totalCustomers", customerRepo.count());

        double deliveredUsd = all.stream()
                .filter(o -> "Delivered".equals(o.getStatus()))
                .mapToDouble(o -> o.getTotal() != null ? o.getTotal() : 0.0)
                .sum();
        data.put("totalRevenueInr", Math.round(deliveredUsd * 84));

        YearMonth current = YearMonth.now();
        Map<YearMonth, double[]> buckets = new LinkedHashMap<>();
        for (int i = 5; i >= 0; i--) buckets.put(current.minusMonths(i), new double[]{0, 0});
        for (Order o : all) {
            if (o.getCreatedAt() == null) continue;
            double[] b = buckets.get(YearMonth.from(o.getCreatedAt()));
            if (b == null) continue;
            b[0] += 1;
            if ("Delivered".equals(o.getStatus()))
                b[1] += o.getTotal() != null ? o.getTotal() : 0.0;
        }
        List<Map<String, Object>> monthlyRevenue = new ArrayList<>();
        List<Map<String, Object>> monthlyOrders  = new ArrayList<>();
        buckets.forEach((ym, b) -> {
            String label = ym.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            Map<String, Object> rev = new LinkedHashMap<>();
            rev.put("month", label);
            rev.put("revenue", Math.round(b[1] * 84));
            monthlyRevenue.add(rev);
            Map<String, Object> ord = new LinkedHashMap<>();
            ord.put("month", label);
            ord.put("orders", (long) b[0]);
            monthlyOrders.add(ord);
        });
        data.put("monthlyRevenue", monthlyRevenue);
        data.put("monthlyOrders",  monthlyOrders);

        List<Map<String, Object>> recent = new ArrayList<>();
        for (Order o : orderRepo.findAllByOrderByCreatedAtDesc().stream().limit(5).toList()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",           o.getId());
            m.put("customerName", o.getCustomerName());
            m.put("status",       o.getStatus());
            m.put("totalInr",     Math.round((o.getTotal() != null ? o.getTotal() : 0.0) * 84));
            m.put("createdAt",    o.getCreatedAt());
            recent.add(m);
        }
        data.put("recentOrders", recent);
        return data;
    }

    public Map<String, Object> getDashboardStats() {
        return getDashboardData();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private long countStatus(List<Order> orders, String status) {
        return orders.stream().filter(o -> status.equals(o.getStatus())).count();
    }

    private void freeDeliveryPartner(Long orderId) {
        deliveryService.getAssignmentByOrderId(orderId).ifPresent(a -> {
            a.setStatus("FAILED");
            if (a.getPartner() != null) a.getPartner().setAvailability("ONLINE");
        });
    }

    private String trackingNote(String status) {
        return switch (status) {
            case "Confirmed"  -> "Your order has been confirmed.";
            case "Preparing"  -> "The kitchen is preparing your order.";
            case "On the Way" -> "Your order is on the way!";
            case "Delivered"  -> "Delivered! Enjoy your meal.";
            case "Cancelled"  -> "Order cancelled.";
            case "Refunded"   -> "Payment refunded (5-7 business days).";
            case "Failed"     -> "Delivery unsuccessful.";
            default           -> status;
        };
    }
}
