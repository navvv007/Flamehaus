package com.flamehaus.api.service;

import com.flamehaus.api.dto.OrderRequest;
import com.flamehaus.api.entity.Order;
import com.flamehaus.api.repository.CustomerRepository;
import com.flamehaus.api.repository.MenuItemRepository;
import com.flamehaus.api.repository.OrderRepository;
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
    private final DeliveryService    deliveryService;

    public OrderService(OrderRepository orderRepo,
                        CustomerRepository customerRepo,
                        @Lazy DeliveryService deliveryService) {
        this.orderRepo       = orderRepo;
        this.customerRepo    = customerRepo;
        this.deliveryService = deliveryService;
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
        order.setCreatedAt(LocalDateTime.now());
        order.setEstimatedDelivery(LocalDateTime.now().plusHours(1));

        // Link customer if logged in
        if (customerId != null) {
            customerRepo.findById(customerId).ifPresent(order::setCustomer);
        }

        return orderRepo.save(order);
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
                "Cannot advance from status: " + order.getStatus());
        };

        order.setStatus(next);
        order.setTrackingNote(trackingNote(next));
        order.setUpdatedAt(LocalDateTime.now());
        orderRepo.save(order);

        // Auto-assign delivery partner when order moves to Preparing
        if ("Preparing".equals(next)) {
            deliveryService.autoAssign(orderId).ifPresent(a ->
                System.out.println("[ORDER] Auto-assigned order #" + orderId
                    + " to " + a.getPartner().getName()));
        }

        return order;
    }

    // ── Track order (public) ──────────────────────────────────────────────────

    public Map<String, Object> trackOrder(Long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

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
        res.put("total",           order.getTotal());
        res.put("itemsSummary",    order.getItemsSummary());
        res.put("couponCode",      order.getCouponCode());
        res.put("discountAmountInr", order.getDiscountAmountInr());
        res.put("createdAt",       order.getCreatedAt());
        res.put("updatedAt",       order.getUpdatedAt());
        res.put("estimatedDelivery", order.getEstimatedDelivery());

        // Attach active delivery assignment
        deliveryService.getAssignmentByOrderId(orderId)
                .ifPresent(a -> res.put("assignment", a));

        return res;
    }

    // ── Customer orders ───────────────────────────────────────────────────────

    public List<Order> getCustomerOrders(Long customerId) {
        return orderRepo.findByCustomerIdOrderByCreatedAtDesc(customerId);
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
        Double revenue = orderRepo.sumTotalRevenue();
        stats.put("totalRevenueUsd", revenue != null ? revenue : 0.0);
        stats.put("totalRevenueInr", revenue != null ? Math.round(revenue * 84) : 0);
        return stats;
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private String trackingNote(String status) {
        return switch (status) {
            case "Confirmed"  -> "Your order has been confirmed by the restaurant.";
            case "Preparing"  -> "The kitchen is preparing your order.";
            case "On the Way" -> "Your order is on the way!";
            case "Delivered"  -> "Order delivered successfully. Enjoy your meal!";
            case "Cancelled"  -> "Order has been cancelled.";
            case "Refunded"   -> "Your payment has been refunded (5-7 business days).";
            case "Failed"     -> "Delivery was unsuccessful.";
            default           -> status;
        };
    }
}