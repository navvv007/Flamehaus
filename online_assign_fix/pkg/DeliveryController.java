package com.flamehaus.api.controller;

import com.flamehaus.api.dto.DeliveryPartnerRegisterRequest;
import com.flamehaus.api.dto.DeliveryRatingRequest;
import com.flamehaus.api.entity.DeliveryAssignment;
import com.flamehaus.api.entity.DeliveryPartner;
import com.flamehaus.api.security.JwtUtil;
import com.flamehaus.api.security.OtpStore;
import com.flamehaus.api.service.DeliveryService;
import com.flamehaus.api.service.SmsService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/delivery")
public class DeliveryController {

    private final DeliveryService deliveryService;
    private final JwtUtil         jwtUtil;
    private final OtpStore        otpStore;
    private final SmsService      smsService;

    public DeliveryController(DeliveryService deliveryService, JwtUtil jwtUtil,
                               OtpStore otpStore, SmsService smsService) {
        this.deliveryService = deliveryService;
        this.jwtUtil = jwtUtil;
        this.otpStore = otpStore;
        this.smsService = smsService;
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

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

    @PostMapping("/auth/otp/send")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> body) {
        try {
            String phone = body.get("phone");
            if (phone == null || phone.isBlank())
                return ResponseEntity.badRequest().body(Map.of("error", "Phone number required"));
            String norm = normalisePhone(phone);
            DeliveryPartner p = deliveryService.findByPhone(norm)
                    .or(() -> deliveryService.findByPhone(phone)).orElse(null);
            if (p == null)
                return ResponseEntity.ok(Map.of("message", "OTP sent if registered and approved",
                    "maskedPhone", maskPhone(norm)));
            if (!"ACTIVE".equals(p.getStatus())) {
                String msg = "PENDING".equals(p.getStatus())
                    ? "Account pending admin approval." : "Account not active. Contact support.";
                return ResponseEntity.status(403).body(Map.of("error", msg));
            }
            String otp = otpStore.generate("dp:" + norm);
            smsService.sendOtp(norm, otp, p.getName());
            return ResponseEntity.ok(Map.of("message","OTP sent to " + maskPhone(norm),
                "maskedPhone", maskPhone(norm)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/auth/otp/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        try {
            String norm = normalisePhone(body.get("phone"));
            if (!otpStore.verify("dp:" + norm, body.get("otp")))
                return ResponseEntity.status(401).body(Map.of("error", "Invalid or expired OTP"));
            DeliveryPartner p = deliveryService.findByPhone(norm)
                    .or(() -> deliveryService.findByPhone(body.get("phone")))
                    .orElseThrow(() -> new RuntimeException("Partner not found"));
            return ResponseEntity.ok(deliveryService.buildLoginResponse(p,
                    jwtUtil.generateDeliveryToken(p.getEmail(), p.getId())));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<?> logout() { return ResponseEntity.ok(Map.of("message", "Logged out")); }

    // ── Admin — partners ──────────────────────────────────────────────────────

    @GetMapping("/admin/partners")
    public List<DeliveryPartner> allPartners() { return deliveryService.getAllPartners(); }

    @GetMapping("/admin/partners/pending")
    public List<DeliveryPartner> pendingPartners() { return deliveryService.getPendingPartners(); }

    @PatchMapping("/admin/partners/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id) {
        try { return ResponseEntity.ok(deliveryService.approvePartner(id)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PatchMapping("/admin/partners/{id}/reject")
    public ResponseEntity<?> rejectPartnerAccount(@PathVariable Long id) {
        try { return ResponseEntity.ok(deliveryService.rejectPartner(id)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PatchMapping("/admin/partners/{id}/toggle")
    public ResponseEntity<?> togglePartner(@PathVariable Long id) {
        try { return ResponseEntity.ok(deliveryService.togglePartnerActive(id)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    // ── Admin — assignments ───────────────────────────────────────────────────

    @GetMapping("/admin/assignments")
    public List<DeliveryAssignment> allAssignments() { return deliveryService.getAllAssignments(); }

    @GetMapping("/admin/assignment/order/{orderId}")
    public ResponseEntity<?> assignmentByOrder(@PathVariable Long orderId) {
        return deliveryService.getAssignmentByOrderId(orderId)
                .map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/admin/assign/{orderId}")
    public ResponseEntity<?> autoAssign(@PathVariable Long orderId) {
        try {
            return deliveryService.autoAssign(orderId)
                    .map(a -> ResponseEntity.ok((Object) a))
                    .orElse(ResponseEntity.ok(Map.of("message",
                        "No ONLINE partner available. Will auto-assign when one goes online.")));
        } catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    /** Admin manually reassigns — optionally to a specific partner ID */
    @PostMapping("/admin/reassign/{orderId}")
    public ResponseEntity<?> adminReassign(@PathVariable Long orderId,
                                            @RequestBody(required = false) Map<String, Object> body) {
        try {
            Long partnerId = (body != null && body.get("partnerId") != null)
                ? Long.parseLong(body.get("partnerId").toString()) : null;
            return ResponseEntity.ok(deliveryService.adminReassign(orderId, partnerId));
        } catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    // ── Partner ───────────────────────────────────────────────────────────────

    @GetMapping("/partner/me")
    public ResponseEntity<?> me(Authentication auth) {
        Long id = extractPartnerId(auth);
        if (id == null) return unauthorized();
        return deliveryService.getAllPartners().stream().filter(p -> p.getId().equals(id))
                .findFirst().map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/partner/availability")
    public ResponseEntity<?> availability(@RequestBody Map<String, String> body, Authentication auth) {
        Long id = extractPartnerId(auth);
        if (id == null) return unauthorized();
        try { return ResponseEntity.ok(deliveryService.updateAvailability(id, body.get("availability"))); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PatchMapping("/partner/location")
    public ResponseEntity<?> location(@RequestBody Map<String, Object> body, Authentication auth) {
        Long id = extractPartnerId(auth);
        if (id == null) return unauthorized();
        try {
            double lat = Double.parseDouble(body.get("lat").toString());
            double lng = Double.parseDouble(body.get("lng").toString());
            return ResponseEntity.ok(deliveryService.updateLocation(id, lat, lng));
        } catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @GetMapping("/partner/assignments")
    public ResponseEntity<?> myAssignments(Authentication auth) {
        Long id = extractPartnerId(auth);
        if (id == null) return unauthorized();
        return ResponseEntity.ok(deliveryService.getPartnerAssignments(id));
    }

    @PatchMapping("/partner/assignments/{id}/accept")
    public ResponseEntity<?> accept(@PathVariable Long id, Authentication auth) {
        Long partnerId = extractPartnerId(auth);
        if (partnerId == null) return unauthorized();
        try { return ResponseEntity.ok(deliveryService.acceptOrder(id, partnerId)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    /**
     * Partner rejects an assigned order.
     * Sets assignment REJECTED, frees partner to ONLINE,
     * immediately auto-reassigns to next available ONLINE partner.
     */
    @PatchMapping("/partner/assignments/{id}/reject")
    public ResponseEntity<?> rejectOrder(@PathVariable Long id,
                                          @RequestBody(required = false) Map<String, String> body,
                                          Authentication auth) {
        Long partnerId = extractPartnerId(auth);
        if (partnerId == null) return unauthorized();
        try {
            String reason = (body != null && body.get("reason") != null)
                ? body.get("reason") : "Partner declined";
            DeliveryAssignment rejected = deliveryService.rejectOrder(id, partnerId, reason);
            return ResponseEntity.ok(Map.of(
                "message",    "Order rejected. Auto-reassigning to next available ONLINE partner.",
                "assignment", rejected));
        } catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PatchMapping("/partner/assignments/{id}/pickup")
    public ResponseEntity<?> pickup(@PathVariable Long id,
                                     @RequestBody(required = false) Map<String, Object> body,
                                     Authentication auth) {
        Long partnerId = extractPartnerId(auth);
        if (partnerId == null) return unauthorized();
        try {
            Double lat = (body != null && body.get("lat") != null)
                ? Double.parseDouble(body.get("lat").toString()) : null;
            Double lng = (body != null && body.get("lng") != null)
                ? Double.parseDouble(body.get("lng").toString()) : null;
            return ResponseEntity.ok(deliveryService.markPickedUp(id, partnerId, lat, lng));
        } catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PatchMapping("/partner/assignments/{id}/deliver")
    public ResponseEntity<?> deliver(@PathVariable Long id,
                                      @RequestBody Map<String, String> body,
                                      Authentication auth) {
        Long partnerId = extractPartnerId(auth);
        if (partnerId == null) return unauthorized();
        try { return ResponseEntity.ok(deliveryService.markDelivered(id, partnerId, body.get("otp"))); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PostMapping("/partner/rate-order/{assignmentId}")
    public ResponseEntity<?> rateOrder(@PathVariable Long assignmentId,
                                        @RequestBody Map<String, Object> body,
                                        Authentication auth) {
        Long partnerId = extractPartnerId(auth);
        if (partnerId == null) return unauthorized();
        try {
            int rating     = Integer.parseInt(body.get("rating").toString());
            String comment = body.get("comment") != null ? body.get("comment").toString() : "";
            return ResponseEntity.ok(deliveryService.rateOrderExperience(assignmentId, partnerId, rating, comment));
        } catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PostMapping("/rate/{assignmentId}")
    public ResponseEntity<?> ratePartner(@PathVariable Long assignmentId,
                                          @Valid @RequestBody DeliveryRatingRequest req) {
        try { return ResponseEntity.ok(deliveryService.rateDelivery(assignmentId, req)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Long extractPartnerId(Authentication auth) {
        if (auth == null || !(auth.getCredentials() instanceof String token)) return null;
        return jwtUtil.extractPartnerId(token);
    }
    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
    }
    private String normalisePhone(String raw) {
        if (raw == null) return "";
        String d = raw.replaceAll("[^0-9+]", "");
        if (d.startsWith("+")) return d;
        if (d.length() == 10) return "+91" + d;
        if (d.length() == 12 && d.startsWith("91")) return "+" + d;
        return raw;
    }
    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) return "****";
        return phone.substring(0, phone.length()-4).replaceAll("[0-9]","*")
             + phone.substring(phone.length()-4);
    }
}
