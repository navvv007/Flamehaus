package com.flamehaus.api.repository;

import com.flamehaus.api.entity.DeliveryAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface DeliveryAssignmentRepository extends JpaRepository<DeliveryAssignment, Long> {

    List<DeliveryAssignment> findByPartnerId(Long partnerId);
    List<DeliveryAssignment> findByPartnerIdOrderByAssignedAtDesc(Long partnerId);
    List<DeliveryAssignment> findAllByOrderByAssignedAtDesc();

    @Query("SELECT a FROM DeliveryAssignment a WHERE a.order.id = :orderId " +
           "AND a.status NOT IN ('REJECTED','FAILED') ORDER BY a.assignedAt DESC")
    Optional<DeliveryAssignment> findActiveByOrderId(@Param("orderId") Long orderId);

    @Query("SELECT a FROM DeliveryAssignment a WHERE a.order.id = :orderId ORDER BY a.assignedAt DESC")
    List<DeliveryAssignment> findAllByOrderId(@Param("orderId") Long orderId);

    @Query("SELECT COUNT(a) > 0 FROM DeliveryAssignment a WHERE a.order.id = :orderId " +
           "AND a.status IN :statuses")
    boolean existsByOrderIdAndStatusIn(@Param("orderId") Long orderId,
                                       @Param("statuses") List<String> statuses);

    @Query("SELECT a.partner.id FROM DeliveryAssignment a " +
           "WHERE a.order.id = :orderId AND a.status = 'REJECTED'")
    List<Long> findRejectedPartnerIdsByOrderId(@Param("orderId") Long orderId);

    @Query("SELECT COUNT(a) FROM DeliveryAssignment a " +
           "WHERE a.order.id = :orderId AND a.status = 'REJECTED'")
    long countRejectedByOrderId(@Param("orderId") Long orderId);

    // FIX: added import java.time.LocalDateTime above — was missing
    @Query("SELECT a FROM DeliveryAssignment a " +
           "WHERE a.status IN :statuses AND a.assignedAt < :cutoff")
    List<DeliveryAssignment> findByStatusInAndAssignedAtBefore(
        @Param("statuses") List<String> statuses,
        @Param("cutoff")   LocalDateTime cutoff);

    @Query("SELECT a FROM DeliveryAssignment a " +
           "WHERE a.id = (SELECT MAX(a2.id) FROM DeliveryAssignment a2 " +
           "WHERE a2.order.id = a.order.id AND a2.status NOT IN ('REJECTED')) " +
           "ORDER BY a.assignedAt DESC")
    List<DeliveryAssignment> findLatestPerOrder();
}