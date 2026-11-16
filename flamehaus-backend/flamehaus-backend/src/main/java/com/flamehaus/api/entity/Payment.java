package com.flamehaus.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Stores a payment record for every order.
 * gateway = RAZORPAY | STRIPE
 * status  = CREATED | PAID | FAILED | REFUNDED
 */
@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "customer", "payments"})
    private Order order;

    /** RAZORPAY | STRIPE */
    @Column(nullable = false, length = 20)
    private String gateway;

    /** Gateway-generated order/intent ID (before payment) */
    @Column(length = 200)
    private String gatewayOrderId;

    /** Gateway-generated payment ID (after successful payment) */
    @Column(length = 200)
    private String gatewayPaymentId;

    /** Gateway-generated signature (Razorpay) or event ID (Stripe) for verification */
    @Column(length = 500)
    private String gatewaySignature;

    /** CREATED | PAID | FAILED | REFUNDED */
    @Column(nullable = false, length = 20)
    private String status = "CREATED";

    /** Amount in INR paise (Razorpay) or cents (Stripe) */
    @Column(nullable = false)
    private Long amountSmallestUnit;

    /** Currency code — INR or USD */
    @Column(length = 5)
    private String currency = "INR";

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column
    private LocalDateTime paidAt;

    public Payment() {}

    // ── Getters / Setters ──────────────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public String getGateway() { return gateway; }
    public void setGateway(String gateway) { this.gateway = gateway; }
    public String getGatewayOrderId() { return gatewayOrderId; }
    public void setGatewayOrderId(String gatewayOrderId) { this.gatewayOrderId = gatewayOrderId; }
    public String getGatewayPaymentId() { return gatewayPaymentId; }
    public void setGatewayPaymentId(String gatewayPaymentId) { this.gatewayPaymentId = gatewayPaymentId; }
    public String getGatewaySignature() { return gatewaySignature; }
    public void setGatewaySignature(String gatewaySignature) { this.gatewaySignature = gatewaySignature; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getAmountSmallestUnit() { return amountSmallestUnit; }
    public void setAmountSmallestUnit(Long amountSmallestUnit) { this.amountSmallestUnit = amountSmallestUnit; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
}
