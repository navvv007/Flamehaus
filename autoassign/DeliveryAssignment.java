package com.flamehaus.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
// FIX: Removed UNIQUE constraint on order_id — multiple rows needed per order
// for reject+reassign flow (one REJECTED row + one new ASSIGNED row per reassignment).
// Active assignment is found by querying status, not by uniqueness.
@Table(name = "delivery_assignments",
       indexes = @Index(name = "idx_da_order_id", columnList = "order_id"))
public class DeliveryAssignment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","customer","password"})
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","password"})
    private DeliveryPartner partner;

    @Column(nullable = false, length = 20)
    private String status = "ASSIGNED";

    @Column(nullable = false)
    private LocalDateTime assignedAt = LocalDateTime.now();

    @Column private LocalDateTime acceptedAt;
    @Column private LocalDateTime pickedUpAt;
    @Column private LocalDateTime deliveredAt;

    // Rejection tracking
    @Column private LocalDateTime rejectedAt;
    @Column(length = 300) private String rejectionReason;
    @Column private Integer reassignCount = 0;

    // GPS at pickup
    @Column private Double pickupLat;
    @Column private Double pickupLng;

    // Delivery OTP
    @Column(length = 6) private String deliveryOtp;

    // Customer rates delivery partner (1-5)
    @Column private Integer partnerRating;
    @Column(length = 300) private String ratingComment;
    @Column private LocalDateTime ratedAt;

    // Delivery partner rates order experience (1-5)
    @Column private Integer partnerOrderRating;
    @Column(length = 300) private String partnerOrderComment;
    @Column private LocalDateTime partnerRatedAt;

    public Long            getId()                          { return id; }
    public void            setId(Long id)                   { this.id = id; }
    public Order           getOrder()                       { return order; }
    public void            setOrder(Order o)                { this.order = o; }
    public DeliveryPartner getPartner()                     { return partner; }
    public void            setPartner(DeliveryPartner p)    { this.partner = p; }
    public String          getStatus()                      { return status; }
    public void            setStatus(String s)              { this.status = s; }
    public LocalDateTime   getAssignedAt()                  { return assignedAt; }
    public void            setAssignedAt(LocalDateTime t)   { this.assignedAt = t; }
    public LocalDateTime   getAcceptedAt()                  { return acceptedAt; }
    public void            setAcceptedAt(LocalDateTime t)   { this.acceptedAt = t; }
    public LocalDateTime   getPickedUpAt()                  { return pickedUpAt; }
    public void            setPickedUpAt(LocalDateTime t)   { this.pickedUpAt = t; }
    public LocalDateTime   getDeliveredAt()                 { return deliveredAt; }
    public void            setDeliveredAt(LocalDateTime t)  { this.deliveredAt = t; }
    public LocalDateTime   getRejectedAt()                  { return rejectedAt; }
    public void            setRejectedAt(LocalDateTime t)   { this.rejectedAt = t; }
    public String          getRejectionReason()             { return rejectionReason; }
    public void            setRejectionReason(String r)     { this.rejectionReason = r; }
    public Integer         getReassignCount()               { return reassignCount != null ? reassignCount : 0; }
    public void            setReassignCount(Integer c)      { this.reassignCount = c; }
    public Double          getPickupLat()                   { return pickupLat; }
    public void            setPickupLat(Double v)           { this.pickupLat = v; }
    public Double          getPickupLng()                   { return pickupLng; }
    public void            setPickupLng(Double v)           { this.pickupLng = v; }
    public String          getDeliveryOtp()                 { return deliveryOtp; }
    public void            setDeliveryOtp(String o)         { this.deliveryOtp = o; }
    public Integer         getPartnerRating()               { return partnerRating; }
    public void            setPartnerRating(Integer r)      { this.partnerRating = r; }
    public String          getRatingComment()               { return ratingComment; }
    public void            setRatingComment(String c)       { this.ratingComment = c; }
    public LocalDateTime   getRatedAt()                     { return ratedAt; }
    public void            setRatedAt(LocalDateTime t)      { this.ratedAt = t; }
    public Integer         getPartnerOrderRating()          { return partnerOrderRating; }
    public void            setPartnerOrderRating(int r)     { this.partnerOrderRating = r; }
    public String          getPartnerOrderComment()         { return partnerOrderComment; }
    public void            setPartnerOrderComment(String c) { this.partnerOrderComment = c; }
    public LocalDateTime   getPartnerRatedAt()              { return partnerRatedAt; }
    public void            setPartnerRatedAt(LocalDateTime t){ this.partnerRatedAt = t; }
}
