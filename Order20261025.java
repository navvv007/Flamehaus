package com.flamehaus.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String customerName;

    @Column(length = 200)
    private String customerPhone;

    @Column(length = 300)
    private String deliveryAddress;

    @Column(nullable = false)
    private Double total;

    @Column(nullable = false, length = 50)
    private String status = "Pending";

    @Column(columnDefinition = "TEXT")
    private String itemsSummary;

    @Column
    private Double deliveryLat;

    @Column
    private Double deliveryLng;

    @Column(length = 300)
    private String trackingNote;

    @Column
    private LocalDateTime estimatedDelivery;

    // ── Payment ──────────────────────────────────────────────────────────────
    /** PENDING | PAID | FAILED */
    @Column(nullable = false, length = 20)
    private String paymentStatus = "PENDING";

    /** RAZORPAY | STRIPE | COD */
    @Column(length = 20)
    private String paymentMethod;

    // ── Relationships ─────────────────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password"})
    private Customer customer;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Order() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String n) { this.customerName = n; }
    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String p) { this.customerPhone = p; }
    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String a) { this.deliveryAddress = a; }
    public Double getTotal() { return total; }
    public void setTotal(Double t) { this.total = t; }
    public String getStatus() { return status; }
    public void setStatus(String s) { this.status = s; }
    public String getItemsSummary() { return itemsSummary; }
    public void setItemsSummary(String s) { this.itemsSummary = s; }
    public Double getDeliveryLat() { return deliveryLat; }
    public void setDeliveryLat(Double lat) { this.deliveryLat = lat; }
    public Double getDeliveryLng() { return deliveryLng; }
    public void setDeliveryLng(Double lng) { this.deliveryLng = lng; }
    public String getTrackingNote() { return trackingNote; }
    public void setTrackingNote(String n) { this.trackingNote = n; }
    public LocalDateTime getEstimatedDelivery() { return estimatedDelivery; }
    public void setEstimatedDelivery(LocalDateTime t) { this.estimatedDelivery = t; }
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer c) { this.customer = c; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime t) { this.createdAt = t; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime t) { this.updatedAt = t; }
}
