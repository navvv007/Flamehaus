package com.flamehaus.api.security;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory JWT blacklist.
 *
 * When a user logs out the token is stored here until it naturally expires.
 * The JwtAuthFilter checks this before accepting any token.
 * Expired entries are pruned on every blacklist() call to keep memory bounded.
 */
@Service
public class TokenBlacklistService {

    // token → expiry epoch-second
    private final Map<String, Long> blacklist = new ConcurrentHashMap<>();

    /**
     * Add a token to the blacklist.
     * @param token     raw JWT string
     * @param expiryMs  token expiry as epoch-milliseconds (from JWT 'exp' claim)
     */
    public void blacklist(String token, long expiryMs) {
        purgeExpired();
        blacklist.put(token, expiryMs);
    }

    /** Returns true if the token has been explicitly invalidated. */
    public boolean isBlacklisted(String token) {
        Long expiry = blacklist.get(token);
        if (expiry == null) return false;
        // If the entry itself is stale, treat as not blacklisted (token already dead)
        if (Instant.now().toEpochMilli() > expiry) {
            blacklist.remove(token);
            return false;
        }
        return true;
    }

    /** Remove all entries whose tokens have already expired. */
    private void purgeExpired() {
        long now = Instant.now().toEpochMilli();
        blacklist.entrySet().removeIf(e -> now > e.getValue());
    }
}
