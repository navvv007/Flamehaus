package com.flamehaus.api.controller;

import com.flamehaus.api.dto.OrderRequest;
import com.flamehaus.api.repository.OrderRepository;
import com.flamehaus.api.security.JwtUtil;
import com.flamehaus.api.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * URL ownership (each URL is mapped in exactly ONE controller):
 *   OrderController          -> place / track / customer orders / admin list, detail, advance, status, dashboard
 *   CancellationController   -> ALL cancel + refund endpoints
 *   DeliveryController       -> /api/delivery/**
 *   TimeoutController        -> /api/admin/timeout/**, refund-status, delivery-timer
 */
@RestController
public class OrderController {

    private final OrderService    orderService;
    private final OrderRepository orderRepo;
    private final JwtUtil         jwtUtil;

    public OrderController(OrderService orderService, OrderRepository orderRepo, JwtUtil jwtUtil) {
        this.orderService = orderService;
        this.orderRepo    = orderRepo;
        this.jwtUtil      = jwtUtil;
    }

    // ── Public ────────────────────────────────────────────────────────────────

    @PostMapping("/api/orders")
    public ResponseEntity<?> place(@RequestBody OrderRequest req, Authentication auth) {
        try {
            return ResponseEntity.ok(orderService.placeOrder(req, extractCustomerId(auth)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", String.valueOf(e.getMessage())));
        }
    }

    /** Public: safe summary only (no phone, address, OTP or payment details). */
    @GetMapping("/api/orders/{id}/track")
    public ResponseEntity<?> track(@PathVariable Long id) {
        return respond(id, () -> orderService.trackOrder(id));
    }

    // ── Customer ──────────────────────────────────────────────────────────────

    @GetMapping("/api/customer/orders")
    public ResponseEntity<?> myOrders(Authentication auth) {
        Long customerId = extractCustomerId(auth);
        if (customerId == null) return unauthorized();
        return ResponseEntity.ok(orderService.getCustomerOrders(customerId));
    }

    /** The customer's own order, in full. Someone else's order looks like "not found". */
    @GetMapping("/api/customer/orders/{id}")
    public ResponseEntity<?> myOrder(@PathVariable Long id, Authentication auth) {
        Long customerId = extractCustomerId(auth);
        if (customerId == null) return unauthorized();
        return respond(id, () -> orderService.orderDetailForCustomer(id, customerId));
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    @GetMapping("/api/admin/orders")
    public ResponseEntity<?> allOrders() {
        return ResponseEntity.ok(orderRepo.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/api/admin/orders/{id}")
    public ResponseEntity<?> adminOrder(@PathVariable Long id) {
        return respond(id, () -> orderService.orderDetailForAdmin(id));
    }

    @PatchMapping("/api/admin/orders/{id}/advance")
    public ResponseEntity<?> advance(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(orderService.advanceStatus(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", String.valueOf(e.getMessage())));
        }
    }

    @PatchMapping("/api/admin/orders/{id}/status")
    public ResponseEntity<?> setStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(orderService.setStatus(id, body.get("status")));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", String.valueOf(e.getMessage())));
        }
    }

    // Dashboard: one method, two URLs
    @GetMapping({"/api/admin/dashboard", "/api/admin/dashboard/stats"})
    public ResponseEntity<?> dashboard() {
        try {
            return ResponseEntity.ok(orderService.getDashboardData());
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", String.valueOf(e.getMessage())));
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** 404 ONLY for a genuinely missing order; any other failure is a 500 with the real message. */
    private ResponseEntity<?> respond(Long id, java.util.function.Supplier<Map<String, Object>> body) {
        try {
            return ResponseEntity.ok(body.get());
        } catch (OrderService.OrderNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", "Order not found"));
        } catch (RuntimeException e) {
            System.err.println("[ORDER] failed to load order #" + id + ": " + e);
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", String.valueOf(e.getMessage())));
        }
    }

    private Long extractCustomerId(Authentication auth) {
        if (auth == null || !(auth.getCredentials() instanceof String token)) return null;
        return jwtUtil.extractCustomerId(token);
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
    }
}
