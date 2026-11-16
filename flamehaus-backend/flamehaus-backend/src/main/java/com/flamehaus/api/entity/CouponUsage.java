package com.flamehaus.api.entity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "coupon_usage",
       uniqueConstraints = @UniqueConstraint(columnNames = {"coupon_id","order_id"}))
public class CouponUsage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "coupon_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler"}) private Coupon coupon;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "customer_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","password"}) private Customer customer;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","customer","password"}) private Order order;
    @Column(nullable = false) private Double discountAmountInr;
    @Column(nullable = false) private LocalDateTime usedAt = LocalDateTime.now();

    public Long getId() { return id; }
    public Coupon getCoupon() { return coupon; }
    public void setCoupon(Coupon c) { this.coupon = c; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer c) { this.customer = c; }
    public Order getOrder() { return order; }
    public void setOrder(Order o) { this.order = o; }
    public Double getDiscountAmountInr() { return discountAmountInr; }
    public void setDiscountAmountInr(Double d) { this.discountAmountInr = d; }
    public LocalDateTime getUsedAt() { return usedAt; }
    public void setUsedAt(LocalDateTime t) { this.usedAt = t; }
}