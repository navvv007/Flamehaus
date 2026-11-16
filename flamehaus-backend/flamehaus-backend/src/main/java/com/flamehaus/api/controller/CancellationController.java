package com.flamehaus.api.controller;

import com.flamehaus.api.dto.CancelOrderRequest;
import com.flamehaus.api.entity.OrderCancellation;
import com.flamehaus.api.security.JwtUtil;
import com.flamehaus.api.service.CancellationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class CancellationController {

    private final CancellationService cancellationService;
    private final JwtUtil             jwtUtil;

    public CancellationController(CancellationService cancellationService, JwtUtil jwtUtil) {
        this.cancellationService = cancellationService;
        this.jwtUtil             = jwtUtil;
    }

    // ── Customer cancels their own order ──────────────────────────────────────

    @PostMapping("/customer/orders/{orderId}/cancel")
    public ResponseEntity<?> customerCancel(@PathVariable Long orderId,
                                             @RequestBody(required = false) CancelOrderRequest req,
                                             Authentication auth) {
        try {
            Long customerId = extractCustomerId(auth);
            if (customerId == null)
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

            String reason = req != null ? req.getReason() : "Customer requested cancellation";
            OrderCancellation c = cancellationService.customerCancel(orderId, customerId, reason);
            return ResponseEntity.ok(c);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/customer/orders/{orderId}/cancellation")
    public ResponseEntity<?> customerGetCancellation(@PathVariable Long orderId) {
        try { return ResponseEntity.ok(cancellationService.getCancellation(orderId)); }
        catch (RuntimeException e) { return ResponseEntity.notFound().build(); }
    }

    // ── Admin cancels any order ───────────────────────────────────────────────

    @PostMapping("/admin/orders/{orderId}/cancel")
    public ResponseEntity<?> adminCancel(@PathVariable Long orderId,
                                          @RequestBody(required = false) CancelOrderRequest req,
                                          Authentication auth) {
        try {
            String username = auth != null ? auth.getName() : "admin";
            String reason   = req != null ? req.getReason() : "Admin cancelled";
            OrderCancellation c = cancellationService.adminCancel(orderId, username, reason);
            return ResponseEntity.ok(c);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/admin/cancellations")
    public List<OrderCancellation> allCancellations() {
        return cancellationService.getAllCancellations();
    }

    @GetMapping("/admin/orders/{orderId}/cancellation")
    public ResponseEntity<?> adminGetCancellation(@PathVariable Long orderId) {
        try { return ResponseEntity.ok(cancellationService.getCancellation(orderId)); }
        catch (RuntimeException e) { return ResponseEntity.notFound().build(); }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Long extractCustomerId(Authentication auth) {
        if (auth == null || !(auth.getCredentials() instanceof String token)) return null;
        return jwtUtil.extractCustomerId(token);
    }
}
