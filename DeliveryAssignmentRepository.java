package com.flamehaus.api.repository;

import com.flamehaus.api.entity.DeliveryAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DeliveryAssignmentRepository extends JpaRepository<DeliveryAssignment, Long> {

    List<DeliveryAssignment> findByPartnerId(Long partnerId);

    List<DeliveryAssignment> findByPartnerIdOrderByAssignedAtDesc(Long partnerId);

    /**
     * For admin panel — returns ONE row per order (the active/latest one).
     * REJECTED rows are excluded from this view to prevent duplicates.
     * Use findAllByOrderByAssignedAtDesc() if you need ALL rows including history.
     */
    @Query("""
        SELECT a FROM DeliveryAssignment a
        WHERE a.id = (
            SELECT MAX(a2.id) FROM DeliveryAssignment a2
            WHERE a2.order.id = a.order.id
            AND a2.status NOT IN ('REJECTED')
        )
        ORDER BY a.assignedAt DESC
        """)
    List<DeliveryAssignment> findLatestPerOrder();

    /** All rows including rejected — used for full history view */
    List<DeliveryAssignment> findAllByOrderByAssignedAtDesc();

    /** All rejected assignments for a specific order */
    @Query("SELECT a FROM DeliveryAssignment a WHERE a.order.id = :orderId ORDER BY a.assignedAt DESC")
    List<DeliveryAssignment> findAllByOrderId(@Param("orderId") Long orderId);

    /** Active assignment for an order (not rejected/failed) */
    @Query("""
        SELECT a FROM DeliveryAssignment a
        WHERE a.order.id = :orderId
        AND a.status NOT IN ('REJECTED','FAILED')
        ORDER BY a.assignedAt DESC
        """)
    Optional<DeliveryAssignment> findActiveByOrderId(@Param("orderId") Long orderId);

    boolean existsByOrderIdAndStatusIn(Long orderId, List<String> statuses);

    @Query("SELECT a.partner.id FROM DeliveryAssignment a WHERE a.order.id = :orderId AND a.status = 'REJECTED'")
    List<Long> findRejectedPartnerIdsByOrderId(@Param("orderId") Long orderId);

    @Query("SELECT COUNT(a) FROM DeliveryAssignment a WHERE a.order.id = :orderId AND a.status = 'REJECTED'")
    long countRejectedByOrderId(@Param("orderId") Long orderId);
}
