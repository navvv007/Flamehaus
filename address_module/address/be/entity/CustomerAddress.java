package com.flamehaus.api.entity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "customer_addresses")
public class CustomerAddress {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","password"})
    private Customer customer;

    @Column(length = 50)  private String label;        // Home, Work, Other
    @Column(length = 200) private String addressLine1;  // House/Flat No., Building
    @Column(length = 200) private String addressLine2;  // Street, Area
    @Column(length = 100) private String landmark;
    @Column(length = 100) private String city;
    @Column(length = 100) private String state;
    @Column(length = 10)  private String pincode;
    @Column(length = 100) private String country = "India";
    @Column               private Double latitude;
    @Column               private Double longitude;
    @Column(nullable = false) private Boolean isDefault = false;
    @Column(nullable = false) private LocalDateTime createdAt = LocalDateTime.now();

    public Long     getId()                        { return id; }
    public Customer getCustomer()                  { return customer; }
    public void     setCustomer(Customer c)        { this.customer = c; }
    public String   getLabel()                     { return label; }
    public void     setLabel(String l)             { this.label = l; }
    public String   getAddressLine1()              { return addressLine1; }
    public void     setAddressLine1(String a)      { this.addressLine1 = a; }
    public String   getAddressLine2()              { return addressLine2; }
    public void     setAddressLine2(String a)      { this.addressLine2 = a; }
    public String   getLandmark()                  { return landmark; }
    public void     setLandmark(String l)          { this.landmark = l; }
    public String   getCity()                      { return city; }
    public void     setCity(String c)              { this.city = c; }
    public String   getState()                     { return state; }
    public void     setState(String s)             { this.state = s; }
    public String   getPincode()                   { return pincode; }
    public void     setPincode(String p)           { this.pincode = p; }
    public String   getCountry()                   { return country; }
    public void     setCountry(String c)           { this.country = c; }
    public Double   getLatitude()                  { return latitude; }
    public void     setLatitude(Double v)          { this.latitude = v; }
    public Double   getLongitude()                 { return longitude; }
    public void     setLongitude(Double v)         { this.longitude = v; }
    public Boolean  getIsDefault()                 { return isDefault; }
    public void     setIsDefault(Boolean d)        { this.isDefault = d; }
    public LocalDateTime getCreatedAt()            { return createdAt; }
    public void     setCreatedAt(LocalDateTime t)  { this.createdAt = t; }

    /** Returns a single formatted string for display */
    public String toFullAddress() {
        StringBuilder sb = new StringBuilder();
        if (addressLine1 != null && !addressLine1.isBlank()) sb.append(addressLine1);
        if (addressLine2 != null && !addressLine2.isBlank()) { if (sb.length()>0) sb.append(", "); sb.append(addressLine2); }
        if (landmark    != null && !landmark.isBlank())     { if (sb.length()>0) sb.append(", "); sb.append(landmark); }
        if (city        != null && !city.isBlank())         { if (sb.length()>0) sb.append(", "); sb.append(city); }
        if (state       != null && !state.isBlank())        { if (sb.length()>0) sb.append(", "); sb.append(state); }
        if (pincode     != null && !pincode.isBlank())      { if (sb.length()>0) sb.append(" - "); sb.append(pincode); }
        return sb.toString();
    }
}