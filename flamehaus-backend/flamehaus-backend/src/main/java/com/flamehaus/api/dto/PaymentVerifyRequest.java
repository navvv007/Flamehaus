package com.flamehaus.api.dto;

import jakarta.validation.constraints.NotBlank;

public class PaymentVerifyRequest {

    /** Razorpay: razorpay_order_id | Stripe: payment_intent_id */
    @NotBlank
    private String gatewayOrderId;

    /** Razorpay: razorpay_payment_id | Stripe: payment_intent_id (same) */
    @NotBlank
    private String gatewayPaymentId;

    /** Razorpay: razorpay_signature | Stripe: empty string */
    private String gatewaySignature;

    /** RAZORPAY | STRIPE */
    @NotBlank
    private String gateway;

    public String getGatewayOrderId() { return gatewayOrderId; }
    public void setGatewayOrderId(String gatewayOrderId) { this.gatewayOrderId = gatewayOrderId; }
    public String getGatewayPaymentId() { return gatewayPaymentId; }
    public void setGatewayPaymentId(String gatewayPaymentId) { this.gatewayPaymentId = gatewayPaymentId; }
    public String getGatewaySignature() { return gatewaySignature; }
    public void setGatewaySignature(String gatewaySignature) { this.gatewaySignature = gatewaySignature; }
    public String getGateway() { return gateway; }
    public void setGateway(String gateway) { this.gateway = gateway; }
}
