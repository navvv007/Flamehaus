package com.flamehaus.api.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SmsService {

    @Value("${twilio.account.sid}")       private String  accountSid;
    @Value("${twilio.auth.token}")        private String  authToken;
    @Value("${twilio.from.number}")       private String  fromNumber;
    @Value("${twilio.sms.enabled:false}") private boolean smsEnabled;
    @Value("${twilio.use.alpha:false}")   private boolean useAlpha;

    @PostConstruct
    public void init() {
        if (smsEnabled) {
            Twilio.init(accountSid, authToken);
            System.out.println("✅ Twilio SMS initialised | from=" + fromNumber);
        } else {
            System.out.println("ℹ️  SMS disabled — messages will be logged to console");
        }
    }

    public void send(String to, String body) {
        if (to == null || to.isBlank()) return;
        String phone = normalise(to);
        if (phone == null) return;

        if (!smsEnabled) {
            System.out.printf("[SMS-LOG] To:%s | %s%n", phone, body);
            return;
        }

        try {
            // FIX: Twilio SDK 10.x removed Message.Creator inner class.
            // Call Message.creator(...).create() directly without storing intermediate variable.
            if (useAlpha) {
                Message.creator(new PhoneNumber(phone), fromNumber, body).create();
            } else {
                Message.creator(new PhoneNumber(phone), new PhoneNumber(fromNumber), body).create();
            }
        } catch (Exception e) {
            System.err.println("[SMS-ERROR] Failed to send to " + phone + ": " + e.getMessage());
        }
    }

    public void sendOtp(String phone, String otp, String recipientName) {
        send(phone, String.format(
            "Flamehaus OTP: %s. Login OTP for %s. Valid 5 min. Do not share.",
            otp, recipientName));
    }

    public void sendAdminOtp(String phone, String otp, String username) {
        if (phone == null || phone.isBlank()) {
            System.out.printf("[ADMIN-OTP] Username:%s | OTP:%s%n", username, otp);
            return;
        }
        send(phone, String.format(
            "Flamehaus Admin OTP: %s for '%s'. Valid 5 min. Do not share.", otp, username));
    }

    public void sendOrderPlaced(String phone, Long orderId, String name, double totalInr) {
        send(phone, String.format(
            "Hi %s! Flamehaus order #%d placed. Total: Rs.%.0f. Track: flamehaus.in/orders/%d",
            name, orderId, totalInr, orderId));
    }

    public void sendOrderStatusUpdate(String phone, Long orderId, String name,
                                       String status, String eta) {
        String msg = switch (status) {
            case "Preparing"  -> String.format(
                "Hi %s! Order #%d is being prepared. ETA: %s.", name, orderId, eta);
            case "On the Way" -> String.format(
                "Hi %s! Order #%d is on the way! ETA: %s.", name, orderId, eta);
            case "Delivered"  -> String.format(
                "Hi %s! Order #%d delivered! Rate: flamehaus.in/orders/%d", name, orderId, orderId);
            default -> null;
        };
        if (msg != null) send(phone, msg);
    }

    public void sendPaymentSuccess(String phone, Long orderId, String name,
                                    double amountInr, String gateway) {
        send(phone, String.format(
            "Hi %s! Payment Rs.%.0f confirmed via %s for Flamehaus order #%d.",
            name, amountInr, gateway, orderId));
    }

    public void sendPaymentFailed(String phone, Long orderId, String name, String reason) {
        send(phone, String.format(
            "Hi %s! Payment for order #%d failed: %s. Retry: flamehaus.in/payment/%d",
            name, orderId, reason, orderId));
    }

    public void sendWelcome(String phone, String name) {
        send(phone, String.format(
            "Welcome to Flamehaus, %s! Account ready. Order at flamehaus.in", name));
    }

    private String normalise(String raw) {
        String digits = raw.replaceAll("[^0-9+]", "");
        if (digits.startsWith("+"))                            return digits;
        if (digits.length() == 10)                             return "+91" + digits;
        if (digits.length() == 12 && digits.startsWith("91")) return "+" + digits;
        if (digits.length() > 7)                               return "+" + digits;
        return null;
    }
}
