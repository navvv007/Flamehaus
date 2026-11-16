package com.flamehaus.api.controller;

import com.flamehaus.api.dto.ApplyCouponRequest;
import com.flamehaus.api.dto.CouponRequest;
import com.flamehaus.api.security.JwtUtil;
import com.flamehaus.api.service.CouponService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
public class CouponController {

    private final CouponService couponService;
    private final JwtUtil       jwtUtil;

    public CouponController(CouponService couponService, JwtUtil jwtUtil) {
        this.couponService = couponService;
        this.jwtUtil       = jwtUtil;
    }

    // ── Public ───────────────────────────────────────────────────────────────

    @GetMapping("/api/coupons/active")
    public ResponseEntity<?> listActive() {
        return ResponseEntity.ok(couponService.getActive());
    }

    @PostMapping("/api/coupons/validate")
    public ResponseEntity<?> validate(@Valid @RequestBody ApplyCouponRequest req,
                                       Authentication auth) {
        try {
            if (auth != null && auth.getCredentials() instanceof String token) {
                Long cid = jwtUtil.extractCustomerId(token);
                if (cid != null) req.setCustomerId(cid);
            }
            return ResponseEntity.ok(couponService.validate(req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/api/coupons/apply")
    public ResponseEntity<?> apply(@RequestBody Map<String, Object> body) {
        try {
            String code       = (String) body.get("code");
            Long   orderId    = Long.parseLong(body.get("orderId").toString());
            Long   customerId = body.get("customerId") != null
                ? Long.parseLong(body.get("customerId").toString()) : null;
            return ResponseEntity.ok(couponService.apply(code, orderId, customerId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    @GetMapping("/api/admin/coupons")
    public ResponseEntity<?> listAll() {
        return ResponseEntity.ok(couponService.getAll());
    }

    @PostMapping("/api/admin/coupons")
    public ResponseEntity<?> create(@Valid @RequestBody CouponRequest req) {
        try   { return ResponseEntity.ok(couponService.create(req)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PutMapping("/api/admin/coupons/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody CouponRequest req) {
        try   { return ResponseEntity.ok(couponService.update(id, req)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PatchMapping("/api/admin/coupons/{id}/toggle")
    public ResponseEntity<?> toggle(@PathVariable Long id) {
        try   { return ResponseEntity.ok(couponService.toggle(id)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @DeleteMapping("/api/admin/coupons/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try   { couponService.delete(id); return ResponseEntity.ok(Map.of("message","Deleted")); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }
}