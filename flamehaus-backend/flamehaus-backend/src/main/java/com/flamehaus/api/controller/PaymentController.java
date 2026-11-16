package com.flamehaus.api.controller;

import com.flamehaus.api.dto.PaymentCreateRequest;
import com.flamehaus.api.dto.PaymentVerifyRequest;
import com.flamehaus.api.entity.Payment;
import com.flamehaus.api.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * Step 1 — Create a gateway order/intent before showing the payment UI.
     * Public: called right after the order is placed (no JWT needed).
     * Body: { orderId, gateway: "RAZORPAY" | "STRIPE" }
     */
    @PostMapping("/create")
    public ResponseEntity<?> create(@Valid @RequestBody PaymentCreateRequest req) {
        try {
            return ResponseEntity.ok(paymentService.createPayment(req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Step 2 — Verify & confirm after the frontend completes the payment flow.
     * Public: called from the browser callback (Razorpay handler / Stripe confirmPayment).
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verify(@Valid @RequestBody PaymentVerifyRequest req) {
        try {
            return ResponseEntity.ok(paymentService.verifyPayment(req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get payment status for an order.
     * Public — used in order tracking page to show payment badge.
     */
    @GetMapping("/order/{orderId}")
    public ResponseEntity<?> getByOrder(@PathVariable Long orderId) {
        Payment p = paymentService.getPaymentByOrderId(orderId);
        if (p == null) return ResponseEntity.ok(Map.of("status", "NONE"));
        return ResponseEntity.ok(Map.of(
            "id",               p.getId(),
            "gateway",          p.getGateway(),
            "status",           p.getStatus(),
            "amount",           p.getAmountSmallestUnit(),
            "currency",         p.getCurrency(),
            "gatewayPaymentId", p.getGatewayPaymentId() != null ? p.getGatewayPaymentId() : "",
            "paidAt",           p.getPaidAt() != null ? p.getPaidAt().toString() : null
        ));
    }
}
