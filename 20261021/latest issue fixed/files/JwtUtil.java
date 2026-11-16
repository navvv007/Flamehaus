package com.flamehaus.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpiration;

    // ── Signing key ───────────────────────────────────────────────────────────

    private SecretKey signingKey() {
        byte[] keyBytes = Base64.getDecoder().decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // ── Token generation ──────────────────────────────────────────────────────

    public String generateAdminToken(String username, String role) {
        return Jwts.builder()
                .subject(username)
                .claim("type", "ADMIN")
                .claim("role", role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(signingKey())
                .compact();
    }

    public String generateCustomerToken(String email, Long customerId) {
        return Jwts.builder()
                .subject(email)
                .claim("type",       "CUSTOMER")
                .claim("customerId", customerId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(signingKey())
                .compact();
    }

    public String generateDeliveryToken(String email, Long partnerId) {
        return Jwts.builder()
                .subject(email)
                .claim("type",      "DELIVERY")
                .claim("partnerId", partnerId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(signingKey())
                .compact();
    }

    // ── Claims extraction ─────────────────────────────────────────────────────

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /** Used by JwtAuthFilter — same as extractUsername */
    public String extractSubject(String token) {
        return extractAllClaims(token).getSubject();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public String extractType(String token) {
        try { return (String) extractAllClaims(token).get("type"); }
        catch (Exception e) { return null; }
    }

    public String extractRole(String token) {
        try { return (String) extractAllClaims(token).get("role"); }
        catch (Exception e) { return null; }
    }

    public Long extractCustomerId(String token) {
        try {
            Object cid = extractAllClaims(token).get("customerId");
            return cid != null ? Long.parseLong(cid.toString()) : null;
        } catch (Exception e) { return null; }
    }

    public Long extractPartnerId(String token) {
        try {
            Object pid = extractAllClaims(token).get("partnerId");
            return pid != null ? Long.parseLong(pid.toString()) : null;
        } catch (Exception e) { return null; }
    }

    /**
     * Used by AuthController and CustomerAuthController.
     * Returns the token expiry time as Unix epoch milliseconds.
     */
    public long extractExpiryMs(String token) {
        return extractAllClaims(token).getExpiration().getTime();
    }

    // ── Validation ────────────────────────────────────────────────────────────

    /** Used by JwtAuthFilter */
    public boolean isValid(String token) {
        try {
            return extractAllClaims(token).getExpiration().after(new Date());
        } catch (Exception e) { return false; }
    }

    /** Alias kept for compatibility */
    public boolean isTokenValid(String token) {
        return isValid(token);
    }

    public boolean isTokenValid(String token, String expectedType) {
        try {
            Claims c = extractAllClaims(token);
            return c.getExpiration().after(new Date())
                && expectedType.equals(c.get("type"));
        } catch (Exception e) { return false; }
    }
}
