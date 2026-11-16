package com.flamehaus.api.dto;
import jakarta.validation.constraints.*;

public class CouponRequest {
    @NotBlank private String code;
    @NotBlank private String description;
    private String discountType = "PERCENTAGE";
    @NotNull @Positive private Double discountValue;
    private Double minimumOrderAmount = 700.0;
    private Double maximumDiscount;
    private Integer usageLimit;
    private Integer perCustomerLimit = 1;
    private String expiresAt;

    public String getCode() { return code; }
    public void setCode(String c) { this.code = c; }
    public String getDescription() { return description; }
    public void setDescription(String d) { this.description = d; }
    public String getDiscountType() { return discountType; }
    public void setDiscountType(String t) { this.discountType = t; }
    public Double getDiscountValue() { return discountValue; }
    public void setDiscountValue(Double v) { this.discountValue = v; }
    public Double getMinimumOrderAmount() { return minimumOrderAmount; }
    public void setMinimumOrderAmount(Double v) { this.minimumOrderAmount = v; }
    public Double getMaximumDiscount() { return maximumDiscount; }
    public void setMaximumDiscount(Double v) { this.maximumDiscount = v; }
    public Integer getUsageLimit() { return usageLimit; }
    public void setUsageLimit(Integer u) { this.usageLimit = u; }
    public Integer getPerCustomerLimit() { return perCustomerLimit; }
    public void setPerCustomerLimit(Integer p) { this.perCustomerLimit = p; }
    public String getExpiresAt() { return expiresAt; }
    public void setExpiresAt(String e) { this.expiresAt = e; }
}