package com.flamehaus.api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_partners")
public class DeliveryPartner {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true) private String email;
    @Column(nullable = false) private String password;
    @Column(nullable = false) private String name;
    @Column private String phone;
    @Column private String vehicleType;
    @Column private String vehicleNumber;
    @Column(nullable = false, length = 20) private String status = "PENDING";       // PENDING|ACTIVE|INACTIVE|REJECTED
    @Column(nullable = false, length = 20) private String availability = "OFFLINE"; // OFFLINE|ONLINE|BUSY
    @Column private Double  currentLat;   // Live GPS latitude
    @Column private Double  currentLng;   // Live GPS longitude
    @Column private LocalDateTime locationUpdatedAt;
    @Column private Double  rating = 0.0;
    @Column private Integer totalRatings = 0;
    @Column private Integer totalDeliveries = 0;
    @Column private LocalDateTime approvedAt;
    @Column private LocalDateTime createdAt = LocalDateTime.now();

    public Long          getId()                         { return id; }
    public String        getEmail()                      { return email; }
    public void          setEmail(String e)              { this.email = e; }
    public String        getPassword()                   { return password; }
    public void          setPassword(String p)           { this.password = p; }
    public String        getName()                       { return name; }
    public void          setName(String n)               { this.name = n; }
    public String        getPhone()                      { return phone; }
    public void          setPhone(String p)              { this.phone = p; }
    public String        getVehicleType()                { return vehicleType; }
    public void          setVehicleType(String v)        { this.vehicleType = v; }
    public String        getVehicleNumber()              { return vehicleNumber; }
    public void          setVehicleNumber(String v)      { this.vehicleNumber = v; }
    public String        getStatus()                     { return status; }
    public void          setStatus(String s)             { this.status = s; }
    public String        getAvailability()               { return availability; }
    public void          setAvailability(String a)       { this.availability = a; }
    public Double        getCurrentLat()                 { return currentLat; }
    public void          setCurrentLat(Double v)         { this.currentLat = v; }
    public Double        getCurrentLng()                 { return currentLng; }
    public void          setCurrentLng(Double v)         { this.currentLng = v; }
    public LocalDateTime getLocationUpdatedAt()          { return locationUpdatedAt; }
    public void          setLocationUpdatedAt(LocalDateTime t) { this.locationUpdatedAt = t; }
    public Double        getRating()                     { return rating; }
    public void          setRating(Double r)             { this.rating = r; }
    public Integer       getTotalRatings()               { return totalRatings; }
    public void          setTotalRatings(Integer t)      { this.totalRatings = t; }
    public Integer       getTotalDeliveries()            { return totalDeliveries; }
    public void          setTotalDeliveries(Integer t)   { this.totalDeliveries = t; }
    public LocalDateTime getApprovedAt()                 { return approvedAt; }
    public void          setApprovedAt(LocalDateTime t)  { this.approvedAt = t; }
    public LocalDateTime getCreatedAt()                  { return createdAt; }
    public void          setCreatedAt(LocalDateTime t)   { this.createdAt = t; }
}
