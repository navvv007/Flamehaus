package com.flamehaus.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;
import java.util.Map;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpiration; // default 24 hours in ms

    // ── Signing key ───────────────────────────────────────────────────────────

    private SecretKey signingKey() {
        byte[] keyBytes = Base64.getDecoder().decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // ── Token generation ──────────────────────────────────────────────────────

    /** Admin token — contains username + role + type=ADMIN */
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

    /** Customer token — contains email + customerId + type=CUSTOMER */
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

    /** Delivery partner token — contains email + partnerId + type=DELIVERY */
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

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public String extractType(String token) {
        try {
            return (String) extractAllClaims(token).get("type");
        } catch (Exception e) {
            return null;
        }
    }

    public String extractRole(String token) {
        try {
            return (String) extractAllClaims(token).get("role");
        } catch (Exception e) {
            return null;
        }
    }

    public Long extractCustomerId(String token) {
        try {
            Object cid = extractAllClaims(token).get("customerId");
            return cid != null ? Long.parseLong(cid.toString()) : null;
        } catch (Exception e) {
            return null;
        }
    }

    public Long extractPartnerId(String token) {
        try {
            Object pid = extractAllClaims(token).get("partnerId");
            return pid != null ? Long.parseLong(pid.toString()) : null;
        } catch (Exception e) {
            return null;
        }
    }

    // ── Validation ────────────────────────────────────────────────────────────

    public boolean isTokenValid(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return claims.getExpiration().after(new Date());
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isTokenValid(String token, String expectedType) {
        try {
            Claims claims = extractAllClaims(token);
            boolean notExpired = claims.getExpiration().after(new Date());
            boolean typeMatch  = expectedType.equals(claims.get("type"));
            return notExpired && typeMatch;
        } catch (Exception e) {
            return false;
        }
    }
}
