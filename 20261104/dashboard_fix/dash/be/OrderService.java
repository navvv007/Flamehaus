package com.flamehaus.api.service;

import com.flamehaus.api.dto.OrderRequest;
import com.flamehaus.api.entity.Order;
import com.flamehaus.api.repository.CustomerRepository;
import com.flamehaus.api.repository.OrderRepository;
import com.flamehaus.api.repository.PaymentRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class OrderService {

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
        order.setTrackingNote("Order placed successfully. Awaiting confirmation.");
        order.setCreatedAt(LocalDateTime.now());
        order.setEstimatedDelivery(LocalDateTime.now().plusHours(1));
        if (customerId != null)
            customerRepo.findById(customerId).ifPresent(order::setCustomer);
        return orderRepo.save(order);
    }

    // ── Track order ───────────────────────────────────────────────────────────

    public Map<String, Object> trackOrder(Long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        Map<String, Object> res = buildOrderMap(order);
        deliveryService.getAssignmentByOrderId(orderId)
                .ifPresent(a -> res.put("assignment", a));
        paymentRepo.findByOrderId(orderId)
                .ifPresent(p -> res.put("payment", p));
        return res;
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
            default -> throw new RuntimeException(
                "Cannot advance from: " + order.getStatus());
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

    // ── Customer cancel (kept for reuse; endpoints live in CancellationController)

    public Map<String, Object> cancelCustomerOrder(Long orderId, Long customerId, String reason) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        if (order.getCustomer() == null || !order.getCustomer().getId().equals(customerId))
            throw new RuntimeException("Access denied");
        if (!List.of("Pending","Confirmed","Preparing").contains(order.getStatus()))
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
        if (List.of("Delivered","Refunded").contains(order.getStatus()))
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

    // ── Dashboard (full payload for the admin Overview page) ──────────────────
    // Revenue counts DELIVERED orders only (money actually earned).
    // Order total is stored in USD-equivalent, so * 84 gives INR.

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

        // Last 6 calendar months, oldest first: [orders placed, delivered revenue USD]
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

    /** Older/simple stats — kept so any existing caller still compiles. */
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

    private Map<String, Object> buildOrderMap(Order order) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id",                order.getId());
        res.put("status",            order.getStatus());
        res.put("trackingNote",      order.getTrackingNote());
        res.put("customerName",      order.getCustomerName());
        res.put("customerPhone",     order.getCustomerPhone());
        res.put("deliveryAddress",   order.getDeliveryAddress());
        res.put("addressLine1",      order.getAddressLine1());
        res.put("addressLine2",      order.getAddressLine2());
        res.put("landmark",          order.getLandmark());
        res.put("city",              order.getCity());
        res.put("state",             order.getState());
        res.put("pincode",           order.getPincode());
        res.put("deliveryLat",       order.getDeliveryLat());
        res.put("deliveryLng",       order.getDeliveryLng());
        res.put("total",             order.getTotal());
        res.put("itemsSummary",      order.getItemsSummary());
        res.put("couponCode",        order.getCouponCode());
        res.put("discountAmountInr", order.getDiscountAmountInr());
        res.put("createdAt",         order.getCreatedAt());
        res.put("updatedAt",         order.getUpdatedAt());
        res.put("estimatedDelivery", order.getEstimatedDelivery());
        return res;
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
