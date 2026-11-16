package com.flamehaus.api.controller;

import com.flamehaus.api.dto.*;
import com.flamehaus.api.entity.Customer;
import com.flamehaus.api.repository.CustomerRepository;
import com.flamehaus.api.security.JwtUtil;
import com.flamehaus.api.security.OtpStore;
import com.flamehaus.api.security.TokenBlacklistService;
import com.flamehaus.api.service.CustomerAuthService;
import com.flamehaus.api.service.SmsService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/customer")
public class CustomerAuthController {

    private final CustomerAuthService   customerAuthService;
    private final CustomerRepository    customerRepo;
    private final JwtUtil               jwtUtil;
    private final TokenBlacklistService blacklistService;
    private final OtpStore              otpStore;
    private final SmsService            smsService;
    private final PasswordEncoder       encoder;

    public CustomerAuthController(CustomerAuthService customerAuthService,
                                   CustomerRepository customerRepo,
                                   JwtUtil jwtUtil,
                                   TokenBlacklistService blacklistService,
                                   OtpStore otpStore,
                                   SmsService smsService,
                                   PasswordEncoder encoder) {
        this.customerAuthService = customerAuthService;
        this.customerRepo        = customerRepo;
        this.jwtUtil             = jwtUtil;
        this.blacklistService    = blacklistService;
        this.otpStore            = otpStore;
        this.smsService          = smsService;
        this.encoder             = encoder;
    }

    // ── Register / Login ──────────────────────────────────────────────────────

    @PostMapping("/auth/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        try { return ResponseEntity.ok(customerAuthService.register(req)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@Valid @RequestBody CustomerLoginRequest req) {
        try { return ResponseEntity.ok(customerAuthService.login(req)); }
        catch (RuntimeException e) { return ResponseEntity.status(401).body(Map.of("error", e.getMessage())); }
    }

    // ── OTP Login ────────────────────────────────────────────────────────────

    @PostMapping("/auth/otp/send")
    public ResponseEntity<?> sendLoginOtp(@Valid @RequestBody OtpRequest req) {
        String phone      = req.getIdentifier();
        String normalised = normalisePhone(phone);

        Customer customer = customerRepo.findByPhone(normalised)
                .or(() -> customerRepo.findByPhone(phone))
                .orElse(null);

        if (customer == null) {
            return ResponseEntity.ok(Map.of("message", "OTP sent if the number is registered"));
        }

        String otp = otpStore.generate("login:" + normalised);
        smsService.sendOtp(normalised, otp, customer.getName());

        return ResponseEntity.ok(Map.of(
            "message",     "OTP sent to " + maskPhone(normalised),
            "maskedPhone", maskPhone(normalised)
        ));
    }

    @PostMapping("/auth/otp/verify")
    public ResponseEntity<?> verifyLoginOtp(@Valid @RequestBody OtpVerifyRequest req) {
        String phone      = req.getIdentifier();
        String normalised = normalisePhone(phone);

        if (!otpStore.verify("login:" + normalised, req.getOtp())) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Invalid or expired OTP. Please try again."));
        }

        Customer customer = customerRepo.findByPhone(normalised)
                .or(() -> customerRepo.findByPhone(phone))
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        String token = jwtUtil.generateCustomerToken(customer.getEmail(), customer.getId());
        return ResponseEntity.ok(new CustomerResponse(
            customer.getId(), customer.getName(), customer.getEmail(), customer.getPhone(), token
        ));
    }

    // ── Forgot Password ───────────────────────────────────────────────────────

    /**
     * Step 1: Customer enters email → OTP sent to their registered phone.
     * Key prefix "pwd:" separates these from login OTPs.
     */
    @PostMapping("/auth/forgot-password/send")
    public ResponseEntity<?> forgotPasswordSend(@Valid @RequestBody ForgotPasswordOtpRequest req) {
        Customer customer = customerRepo.findByEmail(req.getEmail().toLowerCase()).orElse(null);

        // Security: don't reveal whether email exists
        if (customer == null || customer.getPhone() == null || customer.getPhone().isBlank()) {
            return ResponseEntity.ok(Map.of(
                "message", "If that email is registered and has a phone linked, an OTP was sent."
            ));
        }

        String otp = otpStore.generate("pwd:" + customer.getEmail());
        smsService.sendOtp(customer.getPhone(), otp, customer.getName());

        return ResponseEntity.ok(Map.of(
            "message",     "OTP sent to " + maskPhone(customer.getPhone()),
            "maskedPhone", maskPhone(customer.getPhone())
        ));
    }

    /**
     * Step 2: Customer enters OTP + new password → password updated, JWT returned.
     */
    @PostMapping("/auth/forgot-password/reset")
    public ResponseEntity<?> forgotPasswordReset(@Valid @RequestBody ResetPasswordWithOtpRequest req) {
        String email = req.getEmail().toLowerCase();

        if (!otpStore.verify("pwd:" + email, req.getOtp())) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Invalid or expired OTP. Request a new one."));
        }

        Customer customer = customerRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        customer.setPassword(encoder.encode(req.getNewPassword()));
        customerRepo.save(customer);

        // Auto-login after reset
        String token = jwtUtil.generateCustomerToken(customer.getEmail(), customer.getId());
        return ResponseEntity.ok(Map.of(
            "message", "Password reset successfully",
            "token",   token,
            "name",    customer.getName()
        ));
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    @PostMapping("/auth/logout")
    public ResponseEntity<?> logout(Authentication auth) {
        if (auth != null && auth.getCredentials() instanceof String token) {
            blacklistService.blacklist(token, jwtUtil.extractExpiryMs(token));
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    // ── Profile ───────────────────────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth) {
        try {
            var c = customerAuthService.getByEmail(auth.getName());
            return ResponseEntity.ok(Map.of(
                "id",    c.getId(),
                "name",  c.getName(),
                "email", c.getEmail(),
                "phone", c.getPhone() != null ? c.getPhone() : ""
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Util ──────────────────────────────────────────────────────────────────

    private String normalisePhone(String raw) {
        if (raw == null) return "";
        String digits = raw.replaceAll("[^0-9+]", "");
        if (digits.startsWith("+"))                            return digits;
        if (digits.length() == 10)                             return "+91" + digits;
        if (digits.length() == 12 && digits.startsWith("91")) return "+" + digits;
        return raw;
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) return "****";
        return phone.substring(0, phone.length() - 4).replaceAll("[0-9]", "*")
             + phone.substring(phone.length() - 4);
    }
}
