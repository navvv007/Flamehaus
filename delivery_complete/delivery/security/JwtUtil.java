package com.flamehaus.api.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${app.jwt.secret}")        private String secret;
    @Value("${app.jwt.expiration-ms}") private long   expirationMs;

    private SecretKey getKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    // ── Token generators ──────────────────────────────────────────────────────

    public String generateAdminToken(String username, String role) {
        return build(username)
                .claim("role", role)
                .claim("type", "ADMIN")
                .compact();
    }

    public String generateCustomerToken(String email, Long customerId) {
        return build(email)
                .claim("customerId", customerId)
                .claim("type", "CUSTOMER")
                .compact();
    }

    public String generateDeliveryToken(String email, Long partnerId) {
        return build(email)
                .claim("partnerId", partnerId)
                .claim("type", "DELIVERY")
                .compact();
    }

    // ── Extractors ────────────────────────────────────────────────────────────

    public String extractSubject(String token)  { return parseClaims(token).getSubject(); }
    public String extractType(String token)     { return (String) parseClaims(token).get("type"); }
    public String extractRole(String token)     { return (String) parseClaims(token).get("role"); }

    public Long extractCustomerId(String token) {
        try {
            Object id = parseClaims(token).get("customerId");
            if (id == null) return null;
            if (id instanceof Number) return ((Number) id).longValue();
            return Long.parseLong(id.toString());
        } catch (Exception e) { return null; }
    }

    public Long extractPartnerId(String token) {
        try {
            Object id = parseClaims(token).get("partnerId");
            if (id == null) return null;
            if (id instanceof Number) return ((Number) id).longValue();
            return Long.parseLong(id.toString());
        } catch (Exception e) { return null; }
    }

    public long extractExpiryMs(String token) {
        Date exp = parseClaims(token).getExpiration();
        return exp != null ? exp.getTime() : System.currentTimeMillis();
    }

    public boolean isValid(String token) {
        try { parseClaims(token); return true; }
        catch (JwtException | IllegalArgumentException e) { return false; }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    // FIX: return type is JwtBuilder, not the non-existent Jwts.BuilderIoJsonWebToken
    private JwtBuilder build(String subject) {
        return Jwts.builder()
                .subject(subject)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getKey());
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(getKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
