package com.flamehaus.api.controller;

import com.flamehaus.api.security.JwtUtil;
import com.flamehaus.api.service.OrderTimeoutService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Delivery-SLA endpoints. All URLs here are new and unique:
 *   /api/admin/timeout/**                         (admin only - enforced in code too)
 *   /api/customer/orders/{id}/refund-status       (customer, own orders only)
 *   /api/customer/orders/{id}/delivery-timer      (customer, own orders only)
 */
@RestController
public class TimeoutController {

    private final OrderTimeoutService svc;
    private final JwtUtil jwtUtil;

    public TimeoutController(OrderTimeoutService svc, JwtUtil jwtUtil) {
        this.svc = svc;
        this.jwtUtil = jwtUtil;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    @GetMapping("/api/admin/timeout/overview")
    public ResponseEntity<?> overview(Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        try { return ResponseEntity.ok(svc.overview()); }
        catch (RuntimeException e) { return ResponseEntity.internalServerError().body(Map.of("error", String.valueOf(e.getMessage()))); }
    }

    /** Run the SLA check immediately instead of waiting for the next scheduled pass. */
    @PostMapping("/api/admin/timeout/run-now")
    public ResponseEntity<?> runNow(Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        try {
            svc.checkTimeouts();
            svc.reconcileRefunds();
            return ResponseEntity.ok(Map.of("message", "Timeout check completed"));
        } catch (RuntimeException e) { return bad(e); }
    }

    @PostMapping("/api/admin/timeout/{orderId}/cancel-now")
    public ResponseEntity<?> cancelNow(@PathVariable Long orderId,
                                       @RequestBody(required = false) Map<String, String> body,
                                       Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        try {
            String reason = body != null ? body.get("reason") : null;
            return ResponseEntity.ok(Map.of("message", svc.cancelNow(orderId, reason, auth.getName())));
        } catch (RuntimeException e) { return bad(e); }
    }

    @PostMapping("/api/admin/timeout/{orderId}/reassign")
    public ResponseEntity<?> reassign(@PathVariable Long orderId, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        try { return ResponseEntity.ok(Map.of("message", svc.reassignNow(orderId))); }
        catch (RuntimeException e) { return bad(e); }
    }

    @PostMapping("/api/admin/timeout/{orderId}/retry-refund")
    public ResponseEntity<?> retryRefund(@PathVariable Long orderId, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        try { return ResponseEntity.ok(Map.of("message", svc.retryRefund(orderId))); }
        catch (RuntimeException e) { return bad(e); }
    }

    // ── Customer ──────────────────────────────────────────────────────────────

    @GetMapping("/api/customer/orders/{id}/refund-status")
    public ResponseEntity<?> refundStatus(@PathVariable Long id, Authentication auth) {
        Long cid = customerId(auth);
        if (cid == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        try { return ResponseEntity.ok(svc.refundStatusForCustomer(id, cid)); }
        catch (RuntimeException e) { return ResponseEntity.status(404).body(Map.of("error", String.valueOf(e.getMessage()))); }
    }

    @GetMapping("/api/customer/orders/{id}/delivery-timer")
    public ResponseEntity<?> deliveryTimer(@PathVariable Long id, Authentication auth) {
        Long cid = customerId(auth);
        if (cid == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        try { return ResponseEntity.ok(svc.deliveryTimerForCustomer(id, cid)); }
        catch (RuntimeException e) { return ResponseEntity.status(404).body(Map.of("error", String.valueOf(e.getMessage()))); }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private boolean isAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    private Long customerId(Authentication auth) {
        if (auth == null || !(auth.getCredentials() instanceof String token)) return null;
        return jwtUtil.extractCustomerId(token);
    }

    private ResponseEntity<?> forbidden() {
        return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
    }

    private ResponseEntity<?> bad(RuntimeException e) {
        return ResponseEntity.badRequest().body(Map.of("error", String.valueOf(e.getMessage())));
    }
}
