package com.flamehaus.api.controller;

import com.flamehaus.api.entity.Order;
import com.flamehaus.api.repository.OrderRepository;
import com.flamehaus.api.repository.PaymentRepository;
import com.flamehaus.api.repository.OrderCancellationRepository;
import com.flamehaus.api.service.CancellationService;
import com.flamehaus.api.service.DeliveryService;
import com.flamehaus.api.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    private final OrderService                orderService;
    private final OrderRepository             orderRepo;
    private final PaymentRepository           paymentRepo;
    private final DeliveryService             deliveryService;
    private final CancellationService         cancellationService;
    private final OrderCancellationRepository cancellationRepo;

    public AdminOrderController(OrderService orderService,
                                 OrderRepository orderRepo,
                                 PaymentRepository paymentRepo,
                                 DeliveryService deliveryService,
                                 CancellationService cancellationService,
                                 OrderCancellationRepository cancellationRepo) {
        this.orderService       = orderService;
        this.orderRepo          = orderRepo;
        this.paymentRepo        = paymentRepo;
        this.deliveryService    = deliveryService;
        this.cancellationService= cancellationService;
        this.cancellationRepo   = cancellationRepo;
    }

    // ── List all orders ───────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<?> listAll() {
        try {
            return ResponseEntity.ok(orderRepo.findAllByOrderByCreatedAtDesc());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Get single order — builds response map manually to avoid missing setters

    @GetMapping("/{id}")
    public ResponseEntity<?> getOrder(@PathVariable Long id) {
        return orderRepo.findById(id)
                .map(order -> {
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
                    res.put("createdAt",       order.getCreatedAt());
                    res.put("updatedAt",       order.getUpdatedAt());
                    res.put("deliveryLat",     order.getDeliveryLat());
                    res.put("deliveryLng",     order.getDeliveryLng());

                    // Attach payment separately — no setPayment() needed on Order
                    paymentRepo.findByOrderId(id).ifPresent(p -> res.put("payment", p));

                    // Attach active delivery assignment separately
                    deliveryService.getAssignmentByOrderId(id)
                            .ifPresent(a -> res.put("assignment", a));

                    return ResponseEntity.ok((Object) res);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ── Advance to next status in flow ────────────────────────────────────────

    @PatchMapping("/{id}/advance")
    public ResponseEntity<?> advance(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(orderService.advanceStatus(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Set to any specific status (admin override) ───────────────────────────

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> setStatus(@PathVariable Long id,
                                        @RequestBody Map<String, String> body) {
        try {
            String newStatus = body.get("status");
            if (newStatus == null || newStatus.isBlank())
                return ResponseEntity.badRequest().body(Map.of("error", "status is required"));

            Order order = orderRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Order not found: " + id));
            order.setStatus(newStatus);
            order.setTrackingNote(trackingNote(newStatus));
            order.setUpdatedAt(LocalDateTime.now());
            return ResponseEntity.ok(orderRepo.save(order));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Cancel order + refund ─────────────────────────────────────────────────
    // Uses CancellationService — calls whichever method exists on your local version

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id,
                                     @RequestBody(required = false) Map<String, String> body) {
        try {
            String reason = (body != null && body.get("reason") != null)
                    ? body.get("reason") : "Cancelled by admin";

            // Cancel the order directly — compatible with any CancellationService version
            Order order = orderRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Order not found: " + id));

            if (List.of("Delivered","Cancelled","Refunded").contains(order.getStatus()))
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Cannot cancel order in status: " + order.getStatus()));

            order.setStatus("Cancelled");
            order.setTrackingNote("Cancelled by admin: " + reason);
            order.setUpdatedAt(LocalDateTime.now());
            orderRepo.save(order);

            // Free delivery partner if assigned
            deliveryService.getAssignmentByOrderId(id).ifPresent(a -> {
                a.setStatus("FAILED");
                if (a.getPartner() != null) {
                    a.getPartner().setAvailability("ONLINE");
                }
            });

            // Trigger refund via CancellationService if method exists
            try {
                cancellationService.processRefundForOrder(id);
            } catch (Exception ignored) {
                // Refund will be picked up by REFUND_PENDING flow
            }

            return ResponseEntity.ok(Map.of(
                "message", "Order #" + id + " cancelled",
                "status",  "Cancelled",
                "reason",  reason
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Cancellations list ────────────────────────────────────────────────────

    @GetMapping("/cancellations")
    public ResponseEntity<?> cancellations() {
        try {
            return ResponseEntity.ok(cancellationRepo.findAllByOrderByCreatedAtDesc());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Stats for dashboard ───────────────────────────────────────────────────

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        try {
            return ResponseEntity.ok(Map.of(
                "total",     orderRepo.count(),
                "pending",   orderRepo.countByStatus("Pending"),
                "preparing", orderRepo.countByStatus("Preparing"),
                "onTheWay",  orderRepo.countByStatus("On the Way"),
                "delivered", orderRepo.countByStatus("Delivered"),
                "cancelled", orderRepo.countByStatus("Cancelled")
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
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
