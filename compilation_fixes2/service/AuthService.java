package com.flamehaus.api.service;

import com.flamehaus.api.dto.*;
import com.flamehaus.api.entity.AdminUser;
import com.flamehaus.api.entity.PasswordResetToken;
import com.flamehaus.api.repository.AdminUserRepository;
import com.flamehaus.api.repository.PasswordResetTokenRepository;
import com.flamehaus.api.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AuthService {

    private final AdminUserRepository          adminRepo;
    private final PasswordResetTokenRepository resetTokenRepo;
    private final PasswordEncoder              encoder;
    private final JwtUtil                      jwtUtil;
    private final SmsService                   smsService;

    public AuthService(AdminUserRepository adminRepo,
                       PasswordResetTokenRepository resetTokenRepo,
                       PasswordEncoder encoder,
                       JwtUtil jwtUtil,
                       SmsService smsService) {
        this.adminRepo      = adminRepo;
        this.resetTokenRepo = resetTokenRepo;
        this.encoder        = encoder;
        this.jwtUtil        = jwtUtil;
        this.smsService     = smsService;
    }

    public LoginResponse login(LoginRequest req) {
        AdminUser user = adminRepo.findByUsername(req.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!Boolean.TRUE.equals(user.getActive()))
            throw new RuntimeException("Account is disabled");

        if (!encoder.matches(req.getPassword(), user.getPassword()))
            throw new RuntimeException("Invalid credentials");

        // FIX: role is a plain String — no .name() needed
        String token = jwtUtil.generateAdminToken(user.getUsername(), user.getRole());
        return new LoginResponse(token, user.getUsername(), user.getRole(), user.getDisplayName());
    }

    public String forgotPassword(String username) {
        AdminUser user = adminRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Username not found"));

        String raw   = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        String hashed = encoder.encode(raw);

        PasswordResetToken prt = new PasswordResetToken();
        prt.setToken(hashed);
        prt.setUsername(username);
        prt.setExpiresAt(LocalDateTime.now().plusMinutes(15));
        prt.setUsed(false);
        resetTokenRepo.save(prt);

        // SMS if phone set on admin account
        if (user.getPhone() != null && !user.getPhone().isBlank()) {
            smsService.sendAdminOtp(user.getPhone(), raw, username);
        }

        return raw; // return plain token for dev/testing — email it in production
    }

    public void resetPassword(ResetPasswordRequest req) {
        // Find a matching unused, non-expired token
        PasswordResetToken prt = resetTokenRepo.findAll().stream()
                .filter(t -> !t.isUsed()
                        && t.getUsername().equals(req.getUsername())
                        && t.getExpiresAt().isAfter(LocalDateTime.now())
                        && encoder.matches(req.getToken(), t.getToken()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Invalid or expired reset token"));

        AdminUser user = adminRepo.findByUsername(req.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setPassword(encoder.encode(req.getNewPassword()));
        adminRepo.save(user);

        prt.setUsed(true);
        resetTokenRepo.save(prt);
    }

    public void changePassword(String username, ChangePasswordRequest req) {
        AdminUser user = adminRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!encoder.matches(req.getCurrentPassword(), user.getPassword()))
            throw new RuntimeException("Current password is incorrect");
        user.setPassword(encoder.encode(req.getNewPassword()));
        adminRepo.save(user);
    }

    public List<AdminUser> listAdmins() {
        return adminRepo.findAll();
    }

    public AdminUser createAdmin(AdminUserRequest req) {
        if (adminRepo.existsByUsername(req.getUsername()))
            throw new RuntimeException("Username already exists: " + req.getUsername());

        AdminUser u = new AdminUser();
        u.setUsername(req.getUsername());
        u.setPassword(encoder.encode(req.getPassword()));
        // FIX: role is a plain String — set directly, no Role enum
        u.setRole(req.getRole() != null ? req.getRole() : "STAFF");
        u.setDisplayName(req.getDisplayName());
        u.setPhone(req.getPhone());
        u.setActive(true);
        return adminRepo.save(u);
    }

    public void toggleAdmin(Long id) {
        AdminUser u = adminRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Admin not found: " + id));
        u.setActive(!Boolean.TRUE.equals(u.getActive()));
        adminRepo.save(u);
    }

    public void deleteAdmin(Long id) {
        adminRepo.deleteById(id);
    }
}
