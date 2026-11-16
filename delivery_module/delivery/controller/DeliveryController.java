package com.flamehaus.api.controller;

import com.flamehaus.api.dto.*;
import com.flamehaus.api.entity.DeliveryAssignment;
import com.flamehaus.api.entity.DeliveryPartner;
import com.flamehaus.api.security.JwtUtil;
import com.flamehaus.api.security.TokenBlacklistService;
import com.flamehaus.api.service.DeliveryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/delivery")
public class DeliveryController {

    private final DeliveryService       deliveryService;
    private final JwtUtil               jwtUtil;
    private final TokenBlacklistService blacklistService;

    public DeliveryController(DeliveryService deliveryService,
                               JwtUtil jwtUtil,
                               TokenBlacklistService blacklistService) {
        this.deliveryService  = deliveryService;
        this.jwtUtil          = jwtUtil;
        this.blacklistService = blacklistService;
    }

    // ── Public: register ──────────────────────────────────────────────────────

    @PostMapping("/auth/register")
    public ResponseEntity<?> register(@Valid @RequestBody DeliveryPartnerRegisterRequest req) {
        try { return ResponseEntity.ok(deliveryService.register(req)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        try { return ResponseEntity.ok(deliveryService.login(body.get("email"), body.get("password"))); }
        catch (RuntimeException e) { return ResponseEntity.status(401).body(Map.of("error", e.getMessage())); }
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<?> logout(Authentication auth) {
        if (auth != null && auth.getCredentials() instanceof String token) {
            blacklistService.blacklist(token, jwtUtil.extractExpiryMs(token));
        }
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    // ── Admin: partner management (SUPERADMIN) ────────────────────────────────

    @GetMapping("/admin/partners")
    public List<DeliveryPartner> allPartners() {
        return deliveryService.getAllPartners();
    }

    @GetMapping("/admin/partners/pending")
    public List<DeliveryPartner> pendingPartners() {
        return deliveryService.getPendingPartners();
    }

    @PatchMapping("/admin/partners/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id) {
        try { return ResponseEntity.ok(deliveryService.approvePartner(id)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PatchMapping("/admin/partners/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id) {
        try { return ResponseEntity.ok(deliveryService.rejectPartner(id)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PatchMapping("/admin/partners/{id}/toggle")
    public ResponseEntity<?> toggle(@PathVariable Long id) {
        try { return ResponseEntity.ok(deliveryService.togglePartnerActive(id)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    /** Admin manually triggers auto-assign for an order */
    @PostMapping("/admin/assign/{orderId}")
    public ResponseEntity<?> assign(@PathVariable Long orderId) {
        return deliveryService.autoAssign(orderId)
            .map(a -> ResponseEntity.ok((Object) a))
            .orElse(ResponseEntity.badRequest().body(Map.of("error", "No available partners or already assigned")));
    }

    /** Get assignment for a specific order */
    @GetMapping("/admin/assignment/order/{orderId}")
    public ResponseEntity<?> assignmentByOrder(@PathVariable Long orderId) {
        return deliveryService.getAssignmentByOrderId(orderId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // ── Partner: self-service (DELIVERY role) ─────────────────────────────────

    @GetMapping("/partner/me")
    public ResponseEntity<?> getMe(Authentication auth) {
        Long partnerId = extractPartnerId(auth);
        if (partnerId == null) return unauthorized();
        return deliveryService.getAllPartners().stream()
            .filter(p -> p.getId().equals(partnerId))
            .findFirst()
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/partner/availability")
    public ResponseEntity<?> setAvailability(Authentication auth,
                                              @RequestBody Map<String, String> body) {
        Long partnerId = extractPartnerId(auth);
        if (partnerId == null) return unauthorized();
        try {
            return ResponseEntity.ok(
                deliveryService.updateAvailability(partnerId, body.get("availability")));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/partner/location")
    public ResponseEntity<?> updateLocation(Authentication auth,
                                             @RequestBody LocationUpdateRequest req) {
        Long partnerId = extractPartnerId(auth);
        if (partnerId == null) return unauthorized();
        return ResponseEntity.ok(
            deliveryService.updateLocation(partnerId, req.getLat(), req.getLng()));
    }

    @GetMapping("/partner/assignments")
    public ResponseEntity<?> myAssignments(Authentication auth) {
        Long partnerId = extractPartnerId(auth);
        if (partnerId == null) return unauthorized();
        return ResponseEntity.ok(deliveryService.getPartnerAssignments(partnerId));
    }

    @PatchMapping("/partner/assignments/{id}/accept")
    public ResponseEntity<?> accept(@PathVariable Long id, Authentication auth) {
        Long partnerId = extractPartnerId(auth);
        if (partnerId == null) return unauthorized();
        try { return ResponseEntity.ok(deliveryService.acceptOrder(id, partnerId)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PatchMapping("/partner/assignments/{id}/pickup")
    public ResponseEntity<?> pickup(@PathVariable Long id,
                                     Authentication auth,
                                     @RequestBody LocationUpdateRequest req) {
        Long partnerId = extractPartnerId(auth);
        if (partnerId == null) return unauthorized();
        try {
            return ResponseEntity.ok(
                deliveryService.markPickedUp(id, partnerId, req.getLat(), req.getLng()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/partner/assignments/{id}/deliver")
    public ResponseEntity<?> deliver(@PathVariable Long id,
                                      Authentication auth,
                                      @RequestBody Map<String, String> body) {
        Long partnerId = extractPartnerId(auth);
        if (partnerId == null) return unauthorized();
        try {
            return ResponseEntity.ok(
                deliveryService.markDelivered(id, partnerId, body.get("otp")));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Rating (customer rates delivery partner) ──────────────────────────────

    @PostMapping("/rate/{assignmentId}")
    public ResponseEntity<?> rate(@PathVariable Long assignmentId,
                                   @Valid @RequestBody DeliveryRatingRequest req) {
        try { return ResponseEntity.ok(deliveryService.rateDelivery(assignmentId, req)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    // ── Util ──────────────────────────────────────────────────────────────────

    private Long extractPartnerId(Authentication auth) {
        if (auth == null || !(auth.getCredentials() instanceof String token)) return null;
        return jwtUtil.extractPartnerId(token);
    }

    private ResponseEntity<Object> unauthorized() {
        return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
    }
}
