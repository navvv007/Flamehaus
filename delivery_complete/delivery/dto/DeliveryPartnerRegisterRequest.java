package com.flamehaus.api.dto;

import jakarta.validation.constraints.NotBlank;

// ── Partner registration ───────────────────────────────────────────────────────
public class DeliveryPartnerRegisterRequest {
    @NotBlank private String name;
    @NotBlank private String email;
    @NotBlank private String password;
    @NotBlank private String phone;
    private String vehicleNumber;
    private String vehicleType = "Bike";

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }
    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }
}
