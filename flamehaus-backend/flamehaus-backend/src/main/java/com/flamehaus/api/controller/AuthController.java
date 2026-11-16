package com.flamehaus.api.controller;

import com.flamehaus.api.dto.*;
import com.flamehaus.api.entity.AdminUser;
import com.flamehaus.api.repository.AdminUserRepository;
import com.flamehaus.api.security.JwtUtil;
import com.flamehaus.api.security.OtpStore;
import com.flamehaus.api.security.TokenBlacklistService;
import com.flamehaus.api.service.AuthService;
import com.flamehaus.api.service.SmsService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService           authService;
    private final TokenBlacklistService blacklistService;
    private final JwtUtil               jwtUtil;
    private final OtpStore              otpStore;
    private final SmsService            smsService;
    private final AdminUserRepository   adminRepo;

    public AuthController(AuthService authService,
                          TokenBlacklistService blacklistService,
                          JwtUtil jwtUtil,
                          OtpStore otpStore,
                          SmsService smsService,
                          AdminUserRepository adminRepo) {
        this.authService      = authService;
        this.blacklistService = blacklistService;
        this.jwtUtil          = jwtUtil;
        this.otpStore         = otpStore;
        this.smsService       = smsService;
        this.adminRepo        = adminRepo;
    }

    // ── Password login ────────────────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        try { return ResponseEntity.ok(authService.login(req)); }
        catch (RuntimeException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    // ── OTP login ─────────────────────────────────────────────────────────────

    @PostMapping("/otp/send")
    public ResponseEntity<?> sendAdminOtp(@Valid @RequestBody OtpRequest req) {
        String username = req.getIdentifier();
        AdminUser admin = adminRepo.findByUsername(username).orElse(null);

        if (admin == null || !Boolean.TRUE.equals(admin.getActive())) {
            return ResponseEntity.ok(Map.of("message", "OTP sent if the username exists"));
        }

        String otp   = otpStore.generate(username);
        // FIX: admin.getPhone() now exists — returns null if not set
        String phone = admin.getPhone();
        smsService.sendAdminOtp(phone, otp, username);

        return ResponseEntity.ok(Map.of(
            "message",    phone != null && !phone.isBlank()
                ? "OTP sent to " + maskPhone(phone)
                : "OTP printed to server console (no phone set for this admin)",
            "hasSmsPhone", phone != null && !phone.isBlank()
        ));
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<?> verifyAdminOtp(@Valid @RequestBody OtpVerifyRequest req) {
        String username = req.getIdentifier();

        if (!otpStore.verify(username, req.getOtp())) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Invalid or expired OTP. Please try again."));
        }

        AdminUser admin = adminRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        // FIX: admin.getRole() is now a plain String — no .name() or enum conversion needed
        String token = jwtUtil.generateAdminToken(admin.getUsername(), admin.getRole());
        return ResponseEntity.ok(new LoginResponse(
            token, admin.getUsername(), admin.getRole(), admin.getDisplayName()
        ));
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    @PostMapping("/logout")
    public ResponseEntity<?> logout(Authentication auth) {
        if (auth != null && auth.getCredentials() instanceof String token) {
            blacklistService.blacklist(token, jwtUtil.extractExpiryMs(token));
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    // ── Password management ───────────────────────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgot(@Valid @RequestBody ForgotPasswordRequest req) {
        try {
            String token = authService.forgotPassword(req.getUsername());
            return ResponseEntity.ok(Map.of("message", "Reset token generated", "resetToken", token));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> reset(@Valid @RequestBody ResetPasswordRequest req) {
        try {
            authService.resetPassword(req);
            return ResponseEntity.ok(Map.of("message", "Password updated"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> change(Authentication auth,
                                    @Valid @RequestBody ChangePasswordRequest req) {
        try {
            authService.changePassword(auth.getName(), req);
            return ResponseEntity.ok(Map.of("message", "Password changed"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Util ─────────────────────────────────────────────────────────────────

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) return "****";
        return phone.substring(0, phone.length() - 4).replaceAll("[0-9]", "*")
             + phone.substring(phone.length() - 4);
    }
}
