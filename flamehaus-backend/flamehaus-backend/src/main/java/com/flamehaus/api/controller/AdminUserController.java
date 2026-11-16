package com.flamehaus.api.controller;

import com.flamehaus.api.dto.AdminUserRequest;
import com.flamehaus.api.entity.AdminUser;
import com.flamehaus.api.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AuthService authService;

    public AdminUserController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping
    public List<AdminUser> list() {
        return authService.listAdmins();
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody AdminUserRequest req) {
        try {
            return ResponseEntity.ok(authService.createAdmin(req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<?> toggle(@PathVariable Long id) {
        try {
            authService.toggleAdmin(id);
            return ResponseEntity.ok(Map.of("message", "Toggled"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            authService.deleteAdmin(id);
            return ResponseEntity.ok(Map.of("message", "Deleted"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
