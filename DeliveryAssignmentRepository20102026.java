package com.flamehaus.api.repository;

import com.flamehaus.api.entity.DeliveryAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DeliveryAssignmentRepository extends JpaRepository<DeliveryAssignment, Long> {

    Optional<DeliveryAssignment> findByOrderId(Long orderId);

    List<DeliveryAssignment> findByPartnerId(Long partnerId);

    List<DeliveryAssignment> findByPartnerIdOrderByAssignedAtDesc(Long partnerId);

    List<DeliveryAssignment> findAllByOrderByAssignedAtDesc();

    boolean existsByOrderIdAndStatusIn(Long orderId, List<String> statuses);

    /** All assignments ever made for an order (including rejected ones) */
    List<DeliveryAssignment> findByOrderIdOrderByAssignedAtDesc(Long orderId);

    /** Count how many times this order has been rejected by partners */
    @Query("SELECT COUNT(a) FROM DeliveryAssignment a WHERE a.order.id = :orderId AND a.status = 'REJECTED'")
    long countRejectedByOrderId(@Param("orderId") Long orderId);

    /** Partners who already rejected this order — exclude from reassignment */
    @Query("SELECT a.partner.id FROM DeliveryAssignment a WHERE a.order.id = :orderId AND a.status = 'REJECTED'")
    List<Long> findRejectedPartnerIdsByOrderId(@Param("orderId") Long orderId);

    /** Active assignment for an order (not rejected/failed) */
    @Query("SELECT a FROM DeliveryAssignment a WHERE a.order.id = :orderId AND a.status NOT IN ('REJECTED','FAILED') ORDER BY a.assignedAt DESC")
    Optional<DeliveryAssignment> findActiveByOrderId(@Param("orderId") Long orderId);

    /**
     * Find active assignments older than the timeout cutoff.
     * Used by OrderTimeoutService to auto-cancel stale deliveries.
     */
    @Query("SELECT a FROM DeliveryAssignment a WHERE a.status IN :statuses AND a.assignedAt < :cutoff")
    List<DeliveryAssignment> findByStatusInAndAssignedAtBefore(@Param("statuses") List<String> statuses,@Param("cutoff")   LocalDateTime cutoff);
}
