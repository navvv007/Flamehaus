package com.flamehaus.api.security;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe in-memory OTP store.
 * Stores OTPs keyed by phone number (E.164).
 * Each OTP expires after 5 minutes and can only be used once.
 */
@Component
public class OtpStore {

    private static final int    OTP_TTL_SECONDS = 300; // 5 minutes
    private static final int    MAX_ATTEMPTS    = 3;
    private final SecureRandom  random          = new SecureRandom();

    private record OtpEntry(String otp, Instant expiresAt, int attempts) {}

    private final Map<String, OtpEntry> store = new ConcurrentHashMap<>();

    /** Generate and store a 6-digit OTP for the given key (phone or username). */
    public String generate(String key) {
        purgeExpired();
        String otp = String.format("%06d", random.nextInt(1_000_000));
        store.put(key, new OtpEntry(otp, Instant.now().plusSeconds(OTP_TTL_SECONDS), 0));
        return otp;
    }

    /**
     * Verify the OTP for the given key.
     * Returns true if valid. Removes it after successful verification.
     * Returns false if expired, wrong, or max attempts exceeded.
     */
    public boolean verify(String key, String otp) {
        OtpEntry entry = store.get(key);
        if (entry == null) return false;
        if (Instant.now().isAfter(entry.expiresAt())) {
            store.remove(key);
            return false;
        }
        if (entry.attempts() >= MAX_ATTEMPTS) {
            store.remove(key);
            return false;
        }
        if (!entry.otp().equals(otp)) {
            store.put(key, new OtpEntry(entry.otp(), entry.expiresAt(), entry.attempts() + 1));
            return false;
        }
        store.remove(key); // consumed — single use
        return true;
    }

    public boolean hasPending(String key) {
        OtpEntry entry = store.get(key);
        if (entry == null) return false;
        if (Instant.now().isAfter(entry.expiresAt())) { store.remove(key); return false; }
        return true;
    }

    private void purgeExpired() {
        Instant now = Instant.now();
        store.entrySet().removeIf(e -> now.isAfter(e.getValue().expiresAt()));
    }
}
