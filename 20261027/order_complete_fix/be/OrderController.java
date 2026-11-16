package com.flamehaus.api.controller;

import com.flamehaus.api.dto.OrderRequest;
import com.flamehaus.api.entity.Order;
import com.flamehaus.api.repository.OrderRepository;
import com.flamehaus.api.security.JwtUtil;
import com.flamehaus.api.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class OrderController {

    private final OrderService   orderService;
    private final OrderRepository orderRepo;
    private final JwtUtil        jwtUtil;

    public OrderController(OrderService orderService,
                            OrderRepository orderRepo,
                            JwtUtil jwtUtil) {
        this.orderService = orderService;
        this.orderRepo    = orderRepo;
        this.jwtUtil      = jwtUtil;
    }

    // ── Public: place order ───────────────────────────────────────────────────
    @PostMapping("/api/orders")
    public ResponseEntity<?> place(@RequestBody OrderRequest req,
                                    Authentication auth) {
        try {
            Long customerId = extractCustomerId(auth);
            return ResponseEntity.ok(orderService.placeOrder(req, customerId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Public: track order by ID ─────────────────────────────────────────────
    @GetMapping("/api/orders/{id}/track")
    public ResponseEntity<?> track(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(orderService.trackOrder(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── Customer: my orders ───────────────────────────────────────────────────
    @GetMapping("/api/customer/orders")
    public ResponseEntity<?> myOrders(Authentication auth) {
        Long customerId = extractCustomerId(auth);
        if (customerId == null) return unauthorized();
        return ResponseEntity.ok(orderService.getCustomerOrders(customerId));
    }

    // ── Customer: single order detail ─────────────────────────────────────────
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

    // ── Customer: cancel own order ────────────────────────────────────────────
    @PostMapping("/api/customer/orders/{id}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable Long id,
                                          @RequestBody(required = false) Map<String, String> body,
                                          Authentication auth) {
        Long customerId = extractCustomerId(auth);
        if (customerId == null) return unauthorized();
        try {
            String reason = (body != null && body.get("reason") != null)
                    ? body.get("reason") : "Customer requested cancellation";
            return ResponseEntity.ok(orderService.cancelCustomerOrder(id, customerId, reason));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Admin: all orders ─────────────────────────────────────────────────────
    @GetMapping("/api/admin/orders")
    public ResponseEntity<?> allOrders() {
        return ResponseEntity.ok(orderRepo.findAllByOrderByCreatedAtDesc());
    }

    // ── Admin: single order ───────────────────────────────────────────────────
    @GetMapping("/api/admin/orders/{id}")
    public ResponseEntity<?> adminOrder(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(orderService.trackOrder(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── Admin: advance status ─────────────────────────────────────────────────
    @PatchMapping("/api/admin/orders/{id}/advance")
    public ResponseEntity<?> advance(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(orderService.advanceStatus(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Admin: set specific status ────────────────────────────────────────────
    @PatchMapping("/api/admin/orders/{id}/status")
    public ResponseEntity<?> setStatus(@PathVariable Long id,
                                        @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(orderService.setStatus(id, body.get("status")));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Admin: cancel order ───────────────────────────────────────────────────
    @PostMapping("/api/admin/orders/{id}/cancel")
    public ResponseEntity<?> adminCancel(@PathVariable Long id,
                                          @RequestBody(required = false) Map<String, String> body) {
        try {
            String reason = (body != null && body.get("reason") != null)
                    ? body.get("reason") : "Cancelled by admin";
            return ResponseEntity.ok(orderService.cancelAdminOrder(id, reason));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Admin: dashboard stats ────────────────────────────────────────────────
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