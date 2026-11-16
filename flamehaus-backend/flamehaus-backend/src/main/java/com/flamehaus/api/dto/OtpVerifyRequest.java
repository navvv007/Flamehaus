package com.flamehaus.api.dto;

import jakarta.validation.constraints.NotBlank;

public class OtpVerifyRequest {
    @NotBlank private String identifier; // phone (customer) or username (admin)
    @NotBlank private String otp;

    public String getIdentifier() { return identifier; }
    public void setIdentifier(String identifier) { this.identifier = identifier; }
    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }
}
