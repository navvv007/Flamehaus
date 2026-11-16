package com.flamehaus.api.controller;
import com.flamehaus.api.dto.AddressRequest;
import com.flamehaus.api.security.JwtUtil;
import com.flamehaus.api.service.AddressService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/customer/addresses")
public class AddressController {
    private final AddressService addressService;
    private final JwtUtil        jwtUtil;

    public AddressController(AddressService addressService, JwtUtil jwtUtil) {
        this.addressService = addressService;
        this.jwtUtil        = jwtUtil;
    }

    @GetMapping
    public ResponseEntity<?> list(Authentication auth) {
        Long id = extractCustomerId(auth);
        if (id == null) return unauthorized();
        return ResponseEntity.ok(addressService.getAddresses(id));
    }

    @PostMapping
    public ResponseEntity<?> create(Authentication auth, @Valid @RequestBody AddressRequest req) {
        Long id = extractCustomerId(auth);
        if (id == null) return unauthorized();
        try { return ResponseEntity.ok(addressService.save(id, req)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PutMapping("/{addressId}")
    public ResponseEntity<?> update(Authentication auth, @PathVariable Long addressId,
                                     @Valid @RequestBody AddressRequest req) {
        Long id = extractCustomerId(auth);
        if (id == null) return unauthorized();
        try { return ResponseEntity.ok(addressService.update(id, addressId, req)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @DeleteMapping("/{addressId}")
    public ResponseEntity<?> delete(Authentication auth, @PathVariable Long addressId) {
        Long id = extractCustomerId(auth);
        if (id == null) return unauthorized();
        try { addressService.delete(id, addressId); return ResponseEntity.ok(Map.of("message","Deleted")); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PatchMapping("/{addressId}/default")
    public ResponseEntity<?> setDefault(Authentication auth, @PathVariable Long addressId) {
        Long id = extractCustomerId(auth);
        if (id == null) return unauthorized();
        try { return ResponseEntity.ok(addressService.setDefault(id, addressId)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    private Long extractCustomerId(Authentication auth) {
        if (auth == null || !(auth.getCredentials() instanceof String token)) return null;
        return jwtUtil.extractCustomerId(token);
    }
    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(401).body(Map.of("error","Unauthorized"));
    }
}