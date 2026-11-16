package com.flamehaus.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
public class Order {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Customer relationship ─────────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","password","orders"})
    private Customer customer;

    // ── Customer info (denormalised for quick access) ─────────────────────────
    @Column private String customerName;
    @Column private String customerPhone;

    // ── Delivery address — flat string (legacy + fallback) ────────────────────
    @Column(length = 500) private String deliveryAddress;

    // ── Structured address fields ─────────────────────────────────────────────
    @Column(length = 200) private String addressLine1;
    @Column(length = 200) private String addressLine2;
    @Column(length = 100) private String landmark;
    @Column(length = 100) private String city;
    @Column(length = 100) private String state;
    @Column(length = 10)  private String pincode;

    // ── GPS coordinates ───────────────────────────────────────────────────────
    @Column private Double deliveryLat;
    @Column private Double deliveryLng;

    // ── Order content ─────────────────────────────────────────────────────────
    @Column(nullable = false) private Double total;
    @Column(length = 1000)    private String itemsSummary;

    // ── Status ────────────────────────────────────────────────────────────────
    @Column(nullable = false, length = 30)
    private String status = "Pending";

    @Column(length = 500) private String trackingNote;

    // ── Payment fields (used by PaymentService) ───────────────────────────────
    @Column(length = 20)  private String paymentStatus;
    @Column(length = 30)  private String paymentMethod;

    // ── Estimated delivery (used by OrderService) ─────────────────────────────
    @Column private LocalDateTime estimatedDelivery;

    // ── Coupon ────────────────────────────────────────────────────────────────
    @Column(length = 30) private String couponCode;
    @Column              private Double discountAmountInr;

    // ── Timestamps ────────────────────────────────────────────────────────────
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column private LocalDateTime updatedAt;

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public Long          getId()                         { return id; }
    public void          setId(Long id)                  { this.id = id; }

    public Customer      getCustomer()                   { return customer; }
    public void          setCustomer(Customer c)         { this.customer = c; }

    public String        getCustomerName()               { return customerName; }
    public void          setCustomerName(String n)       { this.customerName = n; }

    public String        getCustomerPhone()              { return customerPhone; }
    public void          setCustomerPhone(String p)      { this.customerPhone = p; }

    public String        getDeliveryAddress()            { return deliveryAddress; }
    public void          setDeliveryAddress(String a)    { this.deliveryAddress = a; }

    public String        getAddressLine1()               { return addressLine1; }
    public void          setAddressLine1(String a)       { this.addressLine1 = a; }

    public String        getAddressLine2()               { return addressLine2; }
    public void          setAddressLine2(String a)       { this.addressLine2 = a; }

    public String        getLandmark()                   { return landmark; }
    public void          setLandmark(String l)           { this.landmark = l; }

    public String        getCity()                       { return city; }
    public void          setCity(String c)               { this.city = c; }

    public String        getState()                      { return state; }
    public void          setState(String s)              { this.state = s; }

    public String        getPincode()                    { return pincode; }
    public void          setPincode(String p)            { this.pincode = p; }

    public Double        getDeliveryLat()                { return deliveryLat; }
    public void          setDeliveryLat(Double v)        { this.deliveryLat = v; }

    public Double        getDeliveryLng()                { return deliveryLng; }
    public void          setDeliveryLng(Double v)        { this.deliveryLng = v; }

    public Double        getTotal()                      { return total; }
    public void          setTotal(Double t)              { this.total = t; }

    public String        getItemsSummary()               { return itemsSummary; }
    public void          setItemsSummary(String s)       { this.itemsSummary = s; }

    public String        getStatus()                     { return status; }
    public void          setStatus(String s)             { this.status = s; }

    public String        getTrackingNote()               { return trackingNote; }
    public void          setTrackingNote(String t)       { this.trackingNote = t; }

    public String        getPaymentStatus()              { return paymentStatus; }
    public void          setPaymentStatus(String s)      { this.paymentStatus = s; }

    public String        getPaymentMethod()              { return paymentMethod; }
    public void          setPaymentMethod(String m)      { this.paymentMethod = m; }

    public LocalDateTime getEstimatedDelivery()          { return estimatedDelivery; }
    public void          setEstimatedDelivery(LocalDateTime t) { this.estimatedDelivery = t; }

    public String        getCouponCode()                 { return couponCode; }
    public void          setCouponCode(String c)         { this.couponCode = c; }

    public Double        getDiscountAmountInr()          { return discountAmountInr; }
    public void          setDiscountAmountInr(Double d)  { this.discountAmountInr = d; }

    public LocalDateTime getCreatedAt()                  { return createdAt; }
    public void          setCreatedAt(LocalDateTime t)   { this.createdAt = t; }

    public LocalDateTime getUpdatedAt()                  { return updatedAt; }
    public void          setUpdatedAt(LocalDateTime t)   { this.updatedAt = t; }

    // ── Convenience: full formatted address string ────────────────────────────
    public String getFullAddress() {
        StringBuilder sb = new StringBuilder();
        if (addressLine1 != null && !addressLine1.isBlank()) sb.append(addressLine1);
        if (addressLine2 != null && !addressLine2.isBlank()) { if (sb.length()>0) sb.append(", "); sb.append(addressLine2); }
        if (landmark     != null && !landmark.isBlank())     { if (sb.length()>0) sb.append(", Near "); else sb.append("Near "); sb.append(landmark); }
        if (city         != null && !city.isBlank())         { if (sb.length()>0) sb.append(", "); sb.append(city); }
        if (state        != null && !state.isBlank())        { if (sb.length()>0) sb.append(", "); sb.append(state); }
        if (pincode      != null && !pincode.isBlank())      { if (sb.length()>0) sb.append(" - "); sb.append(pincode); }
        return sb.length() > 0 ? sb.toString() : (deliveryAddress != null ? deliveryAddress : "");
    }
}
