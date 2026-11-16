package com.flamehaus.api.dto;

import jakarta.validation.constraints.NotBlank;

public class ResetPasswordWithOtpRequest {
    @NotBlank private String email;
    @NotBlank private String otp;
    @NotBlank private String newPassword;

    public String getEmail()       { return email; }
    public void setEmail(String e) { this.email = e; }
    public String getOtp()         { return otp; }
    public void setOtp(String o)   { this.otp = o; }
    public String getNewPassword()         { return newPassword; }
    public void setNewPassword(String p)   { this.newPassword = p; }
}
