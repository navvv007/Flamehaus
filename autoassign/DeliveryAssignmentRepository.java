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

    List<DeliveryAssignment> findAllByOrderByAssignedAtDesc();

    /** FIX: no longer uses findByOrderId (removed unique constraint)
     *  Instead find the ACTIVE assignment — status not in REJECTED/FAILED */
    @Query("SELECT a FROM DeliveryAssignment a WHERE a.order.id = :orderId " +
           "AND a.status NOT IN ('REJECTED','FAILED') ORDER BY a.assignedAt DESC")
    Optional<DeliveryAssignment> findActiveByOrderId(@Param("orderId") Long orderId);

    /** All assignments ever for an order — includes rejected ones */
    @Query("SELECT a FROM DeliveryAssignment a WHERE a.order.id = :orderId ORDER BY a.assignedAt DESC")
    List<DeliveryAssignment> findAllByOrderId(@Param("orderId") Long orderId);

    /** Check if an active (non-rejected) assignment exists for an order */
    @Query("SELECT COUNT(a) > 0 FROM DeliveryAssignment a WHERE a.order.id = :orderId " +
           "AND a.status IN :statuses")
    boolean existsByOrderIdAndStatusIn(@Param("orderId") Long orderId,
                                       @Param("statuses") List<String> statuses);

    /** Partners who already rejected this order — exclude from reassignment */
    @Query("SELECT a.partner.id FROM DeliveryAssignment a " +
           "WHERE a.order.id = :orderId AND a.status = 'REJECTED'")
    List<Long> findRejectedPartnerIdsByOrderId(@Param("orderId") Long orderId);

    /** Count rejections for an order */
    @Query("SELECT COUNT(a) FROM DeliveryAssignment a " +
           "WHERE a.order.id = :orderId AND a.status = 'REJECTED'")
    long countRejectedByOrderId(@Param("orderId") Long orderId);
}
