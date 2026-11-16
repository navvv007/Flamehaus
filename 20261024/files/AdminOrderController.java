package com.flamehaus.api.controller;

import com.flamehaus.api.entity.Order;
import com.flamehaus.api.repository.OrderRepository;
import com.flamehaus.api.repository.PaymentRepository;
import com.flamehaus.api.service.CancellationService;
import com.flamehaus.api.service.DeliveryService;
import com.flamehaus.api.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    private final OrderService       orderService;
    private final OrderRepository    orderRepo;
    private final PaymentRepository  paymentRepo;
    private final DeliveryService    deliveryService;
    private final CancellationService cancellationService;

    public AdminOrderController(OrderService orderService,
                                 OrderRepository orderRepo,
                                 PaymentRepository paymentRepo,
                                 DeliveryService deliveryService,
                                 CancellationService cancellationService) {
        this.orderService        = orderService;
        this.orderRepo           = orderRepo;
        this.paymentRepo         = paymentRepo;
        this.deliveryService     = deliveryService;
        this.cancellationService = cancellationService;
    }

    // ── List all orders ───────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<?> listAll() {
        try {
            List<Order> orders = orderRepo.findAllByOrderByCreatedAtDesc();
            return ResponseEntity.ok(orders);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Get single order with payment + assignment ────────────────────────────

    @GetMapping("/{id}")
    public ResponseEntity<?> getOrder(@PathVariable Long id) {
        return orderRepo.findById(id)
                .map(order -> {
                    // Attach payment info if present
                    paymentRepo.findByOrderId(id).ifPresent(order::setPayment);
                    // Attach active delivery assignment if present
                    deliveryService.getAssignmentByOrderId(id).ifPresent(order::setAssignment);
                    return ResponseEntity.ok(order);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ── Advance order to next status ──────────────────────────────────────────
    // Pending → Confirmed → Preparing → On the Way → Delivered

    @PatchMapping("/{id}/advance")
    public ResponseEntity<?> advance(@PathVariable Long id) {
        try {
            Order order = orderService.advanceStatus(id);
            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Set order to any specific status (admin override) ────────────────────

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
            orderRepo.save(order);
            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Cancel order + trigger refund ─────────────────────────────────────────

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id,
                                     @RequestBody(required = false) Map<String, String> body) {
        try {
            String reason = (body != null && body.get("reason") != null)
                    ? body.get("reason") : "Cancelled by admin";
            return ResponseEntity.ok(cancellationService.cancelByAdmin(id, reason));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Get all cancellations ─────────────────────────────────────────────────

    @GetMapping("/cancellations")
    public ResponseEntity<?> cancellations() {
        try {
            return ResponseEntity.ok(cancellationService.getAllCancellations());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Dashboard stats ───────────────────────────────────────────────────────

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        try {
            long total     = orderRepo.count();
            long pending   = orderRepo.countByStatus("Pending");
            long preparing = orderRepo.countByStatus("Preparing");
            long onTheWay  = orderRepo.countByStatus("On the Way");
            long delivered = orderRepo.countByStatus("Delivered");
            long cancelled = orderRepo.countByStatus("Cancelled");

            return ResponseEntity.ok(Map.of(
                "total",     total,
                "pending",   pending,
                "preparing", preparing,
                "onTheWay",  onTheWay,
                "delivered", delivered,
                "cancelled", cancelled
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
            case "Refunded"   -> "Your payment has been refunded.";
            case "Failed"     -> "Delivery was unsuccessful.";
            default           -> status;
        };
    }
}
