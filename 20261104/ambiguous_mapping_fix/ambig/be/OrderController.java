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
 *   OrderController          -> place / track / customer orders / admin list, detail, advance, status, stats
 *   CancellationController   -> ALL cancel + refund endpoints (customer and admin)
 *   DeliveryController       -> /api/delivery/**
 * Do NOT add cancel endpoints here, and do NOT keep a separate AdminOrderController.
 */
@RestController
public class OrderController {

    private final OrderService    orderService;
    private final OrderRepository orderRepo;
    private final JwtUtil         jwtUtil;

    public OrderController(OrderService orderService,
                           OrderRepository orderRepo,
                           JwtUtil jwtUtil) {
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
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/api/orders/{id}/track")
    public ResponseEntity<?> track(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(orderService.trackOrder(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── Customer ──────────────────────────────────────────────────────────────

    @GetMapping("/api/customer/orders")
    public ResponseEntity<?> myOrders(Authentication auth) {
        Long customerId = extractCustomerId(auth);
        if (customerId == null) return unauthorized();
        return ResponseEntity.ok(orderService.getCustomerOrders(customerId));
    }

    @GetMapping("/api/customer/orders/{id}")
    public ResponseEntity<?> myOrder(@PathVariable Long id, Authentication auth) {
        Long customerId = extractCustomerId(auth);
        if (customerId == null) return unauthorized();
        try {
            return ResponseEntity.ok(orderService.trackOrder(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    @GetMapping("/api/admin/orders")
    public ResponseEntity<?> allOrders() {
        return ResponseEntity.ok(orderRepo.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/api/admin/orders/{id}")
    public ResponseEntity<?> adminOrder(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(orderService.trackOrder(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/api/admin/orders/{id}/advance")
    public ResponseEntity<?> advance(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(orderService.advanceStatus(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/api/admin/orders/{id}/status")
    public ResponseEntity<?> setStatus(@PathVariable Long id,
                                       @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(orderService.setStatus(id, body.get("status")));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/api/admin/dashboard/stats")
    public ResponseEntity<?> stats() {
        return ResponseEntity.ok(orderService.getDashboardStats());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Long extractCustomerId(Authentication auth) {
        if (auth == null || !(auth.getCredentials() instanceof String token)) return null;
        return jwtUtil.extractCustomerId(token);
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
    }
}
