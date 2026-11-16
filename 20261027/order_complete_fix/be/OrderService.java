package com.flamehaus.api.service;

import com.flamehaus.api.dto.OrderRequest;
import com.flamehaus.api.entity.Order;
import com.flamehaus.api.repository.CustomerRepository;
import com.flamehaus.api.repository.OrderRepository;
import com.flamehaus.api.repository.PaymentRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
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

    // ── Customer cancel ───────────────────────────────────────────────────────

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

    // ── Admin cancel ──────────────────────────────────────────────────────────

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

    // ── Dashboard stats ───────────────────────────────────────────────────────

    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalOrders",    orderRepo.count());
        stats.put("pending",        orderRepo.countByStatus("Pending"));
        stats.put("confirmed",      orderRepo.countByStatus("Confirmed"));
        stats.put("preparing",      orderRepo.countByStatus("Preparing"));
        stats.put("onTheWay",       orderRepo.countByStatus("On the Way"));
        stats.put("delivered",      orderRepo.countByStatus("Delivered"));
        stats.put("cancelled",      orderRepo.countByStatus("Cancelled"));
        Double rev = orderRepo.sumTotalRevenue();
        stats.put("totalRevenueInr", rev != null ? Math.round(rev * 84) : 0);
        return stats;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void freeDeliveryPartner(Long orderId) {
        deliveryService.getAssignmentByOrderId(orderId).ifPresent(a -> {
            a.setStatus("FAILED");
            if (a.getPartner() != null) a.getPartner().setAvailability("ONLINE");
        });
    }

    private Map<String, Object> buildOrderMap(Order order) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id",              order.getId());
        res.put("status",          order.getStatus());
        res.put("trackingNote",    order.getTrackingNote());
        res.put("customerName",    order.getCustomerName());
        res.put("customerPhone",   order.getCustomerPhone());
        res.put("deliveryAddress", order.getDeliveryAddress());
        res.put("addressLine1",    order.getAddressLine1());
        res.put("addressLine2",    order.getAddressLine2());
        res.put("landmark",        order.getLandmark());
        res.put("city",            order.getCity());
        res.put("state",           order.getState());
        res.put("pincode",         order.getPincode());
        res.put("deliveryLat",     order.getDeliveryLat());
        res.put("deliveryLng",     order.getDeliveryLng());
        res.put("total",           order.getTotal());
        res.put("itemsSummary",    order.getItemsSummary());
        res.put("couponCode",      order.getCouponCode());
        res.put("discountAmountInr", order.getDiscountAmountInr());
        res.put("createdAt",       order.getCreatedAt());
        res.put("updatedAt",       order.getUpdatedAt());
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