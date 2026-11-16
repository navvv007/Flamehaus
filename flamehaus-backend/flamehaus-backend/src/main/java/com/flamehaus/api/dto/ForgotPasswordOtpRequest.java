package com.flamehaus.api.dto;

import jakarta.validation.constraints.NotBlank;

public class ForgotPasswordOtpRequest {
    @NotBlank private String email;
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
