package com.flamehaus.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Records every order cancellation with reason, who cancelled,
 * and refund details.
 */
@Entity
@Table(name = "order_cancellations")
public class OrderCancellation {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","customer","password"})
    private Order order;

    // Who cancelled: "CUSTOMER" | "ADMIN" | "SYSTEM"
    @Column(nullable = false, length = 20)
    private String cancelledBy = "CUSTOMER";

    // Username of admin if admin-cancelled, else customer name
    @Column(length = 100)
    private String cancelledByName;

    @Column(length = 300)
    private String reason;

    @Column(nullable = false)
    private LocalDateTime cancelledAt = LocalDateTime.now();

    // Refund details
    @Column(length = 20)
    private String refundStatus = "NOT_APPLICABLE"; // NOT_APPLICABLE | INITIATED | COMPLETED | FAILED

    @Column(length = 100)
    private String refundId; // gateway refund ID

    @Column
    private Double refundAmount; // in INR

    @Column(length = 20)
    private String refundGateway; // RAZORPAY | STRIPE

    @Column
    private LocalDateTime refundInitiatedAt;

    @Column
    private LocalDateTime refundCompletedAt;

    @Column(length = 300)
    private String refundNote;

    public Long             getId()                         { return id; }
    public Order            getOrder()                      { return order; }
    public void             setOrder(Order o)               { this.order = o; }
    public String           getCancelledBy()                { return cancelledBy; }
    public void             setCancelledBy(String s)        { this.cancelledBy = s; }
    public String           getCancelledByName()            { return cancelledByName; }
    public void             setCancelledByName(String s)    { this.cancelledByName = s; }
    public String           getReason()                     { return reason; }
    public void             setReason(String r)             { this.reason = r; }
    public LocalDateTime    getCancelledAt()                { return cancelledAt; }
    public void             setCancelledAt(LocalDateTime t) { this.cancelledAt = t; }
    public String           getRefundStatus()               { return refundStatus; }
    public void             setRefundStatus(String s)       { this.refundStatus = s; }
    public String           getRefundId()                   { return refundId; }
    public void             setRefundId(String s)           { this.refundId = s; }
    public Double           getRefundAmount()               { return refundAmount; }
    public void             setRefundAmount(Double a)       { this.refundAmount = a; }
    public String           getRefundGateway()              { return refundGateway; }
    public void             setRefundGateway(String g)      { this.refundGateway = g; }
    public LocalDateTime    getRefundInitiatedAt()          { return refundInitiatedAt; }
    public void             setRefundInitiatedAt(LocalDateTime t) { this.refundInitiatedAt = t; }
    public LocalDateTime    getRefundCompletedAt()          { return refundCompletedAt; }
    public void             setRefundCompletedAt(LocalDateTime t) { this.refundCompletedAt = t; }
    public String           getRefundNote()                 { return refundNote; }
    public void             setRefundNote(String s)         { this.refundNote = s; }
}
