package com.flamehaus.api.controller;

import com.flamehaus.api.dto.*;
import com.flamehaus.api.entity.DeliveryAssignment;
import com.flamehaus.api.entity.DeliveryPartner;
import com.flamehaus.api.security.JwtUtil;
import com.flamehaus.api.security.OtpStore;
import com.flamehaus.api.security.TokenBlacklistService;
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

    private final DeliveryService       deliveryService;
    private final JwtUtil               jwtUtil;
    private final TokenBlacklistService blacklistService;
    private final OtpStore              otpStore;
    private final SmsService            smsService;

    public DeliveryController(DeliveryService deliveryService,
                               JwtUtil jwtUtil,
                               TokenBlacklistService blacklistService,
                               OtpStore otpStore,
                               SmsService smsService) {
        this.deliveryService  = deliveryService;
        this.jwtUtil          = jwtUtil;
        this.blacklistService = blacklistService;
        this.otpStore         = otpStore;
        this.smsService       = smsService;
    }

    // ── Public: auth ──────────────────────────────────────────────────────────

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

    /** OTP login Step 1 — send OTP to registered phone */
    @PostMapping("/auth/otp/send")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> body) {
        try {
            String phone = body.get("phone");
            if (phone == null || phone.isBlank())
                return ResponseEntity.badRequest().body(Map.of("error", "Phone number required"));

            String norm = normalisePhone(phone);

            // Look up partner by phone
            DeliveryPartner p = deliveryService.findByPhone(norm)
                    .or(() -> deliveryService.findByPhone(phone))
                    .orElse(null);

            if (p == null) {
                // Return 200 but with a hint — phone not registered
                return ResponseEntity.ok(Map.of(
                    "message", "OTP sent if number is registered and approved",
                    "maskedPhone", maskPhone(norm)
                ));
            }

            if (!"ACTIVE".equals(p.getStatus())) {
                // Return specific error for pending/rejected — helps debugging
                String msg = "PENDING".equals(p.getStatus())
                    ? "Your account is pending admin approval. OTP login not available yet."
                    : "Your account is not active. Contact support.";
                return ResponseEntity.status(403).body(Map.of("error", msg));
            }

            String otp = otpStore.generate("dp:" + norm);
            smsService.sendOtp(norm, otp, p.getName());

            return ResponseEntity.ok(Map.of(
                "message", "OTP sent to " + maskPhone(norm),
                "maskedPhone", maskPhone(norm)
            ));
        } catch (Exception e) {
            System.err.println("[OTP-ERROR] " + e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to process OTP request: " + e.getMessage()));
        }
    }

    /** OTP login Step 2 — verify OTP, return JWT + partner data */
    @PostMapping("/auth/otp/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String otp   = body.get("otp");
        if (phone == null || otp == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Phone and OTP required"));

        String norm = normalisePhone(phone);
        if (!otpStore.verify("dp:" + norm, otp))
            return ResponseEntity.status(401).body(Map.of("error", "Invalid or expired OTP. Try again."));

        DeliveryPartner p = deliveryService.findByPhone(norm)
                .or(() -> deliveryService.findByPhone(phone))
                .orElse(null);

        if (p == null)
            return ResponseEntity.status(401).body(Map.of("error", "Partner not found"));
        if (!"ACTIVE".equals(p.getStatus()))
            return ResponseEntity.status(403).body(Map.of("error",
                "PENDING".equals(p.getStatus())
                    ? "Account pending admin approval"
                    : "Account not active. Contact support."));

        String token = jwtUtil.generateDeliveryToken(p.getEmail(), p.getId());
        return ResponseEntity.ok(deliveryService.buildLoginResponse(p, token));
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<?> logout(Authentication auth) {
        if (auth != null && auth.getCredentials() instanceof String token) {
            blacklistService.blacklist(token, jwtUtil.extractExpiryMs(token));
        }
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    // ── Admin: partner management ─────────────────────────────────────────────

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
    public ResponseEntity<?> reject(@PathVariable Long id) {
        try { return ResponseEntity.ok(deliveryService.rejectPartner(id)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PatchMapping("/admin/partners/{id}/toggle")
    public ResponseEntity<?> toggle(@PathVariable Long id) {
        try { return ResponseEntity.ok(deliveryService.togglePartnerActive(id)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PostMapping("/admin/assign/{orderId}")
    public ResponseEntity<?> assign(@PathVariable Long orderId) {
        return deliveryService.autoAssign(orderId)
            .map(a -> ResponseEntity.ok((Object) a))
            .orElse(ResponseEntity.badRequest().body(Map.of("error", "No available partners or already assigned")));
    }

    @GetMapping("/admin/assignment/order/{orderId}")
    public ResponseEntity<?> assignmentByOrder(@PathVariable Long orderId) {
        return deliveryService.getAssignmentByOrderId(orderId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // ── Partner: self-service ─────────────────────────────────────────────────

    @GetMapping("/partner/me")
    public ResponseEntity<?> getMe(Authentication auth) {
        Long id = extractPartnerId(auth);
        if (id == null) return unauthorized();
        return deliveryService.getAllPartners().stream()
            .filter(p -> p.getId().equals(id)).findFirst()
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/partner/availability")
    public ResponseEntity<?> setAvailability(Authentication auth,
                                              @RequestBody Map<String, String> body) {
        Long id = extractPartnerId(auth);
        if (id == null) return unauthorized();
        try { return ResponseEntity.ok(deliveryService.updateAvailability(id, body.get("availability"))); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PatchMapping("/partner/location")
    public ResponseEntity<?> updateLocation(Authentication auth,
                                             @RequestBody LocationUpdateRequest req) {
        Long id = extractPartnerId(auth);
        if (id == null) return unauthorized();
        return ResponseEntity.ok(deliveryService.updateLocation(id, req.getLat(), req.getLng()));
    }

    @GetMapping("/partner/assignments")
    public ResponseEntity<?> myAssignments(Authentication auth) {
        Long id = extractPartnerId(auth);
        if (id == null) return unauthorized();
        return ResponseEntity.ok(deliveryService.getPartnerAssignments(id));
    }

    @GetMapping("/partner/assignments/active")
    public ResponseEntity<?> activeAssignment(Authentication auth) {
        Long id = extractPartnerId(auth);
        if (id == null) return unauthorized();
        List<DeliveryAssignment> all = deliveryService.getPartnerAssignments(id);
        return ResponseEntity.ok(
            all.stream()
               .filter(a -> List.of("ASSIGNED","ACCEPTED","PICKED_UP").contains(a.getStatus()))
               .findFirst()
               .orElse(null)
        );
    }

    @PatchMapping("/partner/assignments/{id}/accept")
    public ResponseEntity<?> accept(@PathVariable Long id, Authentication auth) {
        Long partnerId = extractPartnerId(auth);
        if (partnerId == null) return unauthorized();
        try { return ResponseEntity.ok(deliveryService.acceptOrder(id, partnerId)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PatchMapping("/partner/assignments/{id}/pickup")
    public ResponseEntity<?> pickup(@PathVariable Long id, Authentication auth,
                                     @RequestBody LocationUpdateRequest req) {
        Long partnerId = extractPartnerId(auth);
        if (partnerId == null) return unauthorized();
        try { return ResponseEntity.ok(deliveryService.markPickedUp(id, partnerId, req.getLat(), req.getLng())); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PatchMapping("/partner/assignments/{id}/deliver")
    public ResponseEntity<?> deliver(@PathVariable Long id, Authentication auth,
                                      @RequestBody Map<String, String> body) {
        Long partnerId = extractPartnerId(auth);
        if (partnerId == null) return unauthorized();
        try { return ResponseEntity.ok(deliveryService.markDelivered(id, partnerId, body.get("otp"))); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    // ── Rating ────────────────────────────────────────────────────────────────

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

    private String normalisePhone(String raw) {
        if (raw == null) return "";
        String d = raw.replaceAll("[^0-9+]", "");
        if (d.startsWith("+"))                        return d;
        if (d.length() == 10)                         return "+91" + d;
        if (d.length() == 12 && d.startsWith("91"))  return "+" + d;
        return raw;
    }

    private String maskPhone(String p) {
        if (p == null || p.length() < 4) return "****";
        return p.substring(0, p.length() - 4).replaceAll("[0-9]", "*")
             + p.substring(p.length() - 4);
    }
}
