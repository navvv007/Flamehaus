package com.flamehaus.api.dto;
import jakarta.validation.constraints.*;

public class ApplyCouponRequest {
    @NotBlank private String code;
    @NotNull private Double orderTotalInr;
    private Long customerId;

    public String getCode() { return code; }
    public void setCode(String c) { this.code = c; }
    public Double getOrderTotalInr() { return orderTotalInr; }
    public void setOrderTotalInr(Double v) { this.orderTotalInr = v; }
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long id) { this.customerId = id; }
}