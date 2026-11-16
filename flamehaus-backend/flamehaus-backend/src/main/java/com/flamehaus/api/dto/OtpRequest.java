package com.flamehaus.api.dto;

import jakarta.validation.constraints.NotBlank;

public class OtpRequest {
    @NotBlank private String identifier; // phone for customer, username for admin
    public String getIdentifier() { return identifier; }
    public void setIdentifier(String identifier) { this.identifier = identifier; }
}
