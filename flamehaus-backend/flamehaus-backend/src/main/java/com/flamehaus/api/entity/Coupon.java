package com.flamehaus.api.entity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "coupons")
public class Coupon {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String code;
    @Column(nullable = false, length = 100) private String description;
    @Column(nullable = false, length = 20) private String discountType = "PERCENTAGE";
    @Column(nullable = false) private Double discountValue;
    @Column(nullable = false) private Double minimumOrderAmount = 700.0;
    @Column private Double maximumDiscount;
    @Column private Integer usageLimit;
    @Column(nullable = false) private Integer usageCount = 0;
    @Column(nullable = false) private Integer perCustomerLimit = 1;
    @Column(nullable = false) private Boolean active = true;
    @Column(nullable = false) private LocalDateTime createdAt = LocalDateTime.now();
    @Column private LocalDateTime expiresAt;

    public Long getId() { return id; }
    public String getCode() { return code; }
    public void setCode(String c) { this.code = c == null ? null : c.toUpperCase().trim(); }
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
    public Integer getUsageCount() { return usageCount; }
    public void setUsageCount(Integer u) { this.usageCount = u; }
    public Integer getPerCustomerLimit() { return perCustomerLimit; }
    public void setPerCustomerLimit(Integer p) { this.perCustomerLimit = p; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean a) { this.active = a; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime t) { this.createdAt = t; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime t) { this.expiresAt = t; }
}