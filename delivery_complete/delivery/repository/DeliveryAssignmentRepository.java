package com.flamehaus.api.repository;

import com.flamehaus.api.entity.DeliveryAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeliveryAssignmentRepository extends JpaRepository<DeliveryAssignment, Long> {

    Optional<DeliveryAssignment> findByOrderId(Long orderId);
    List<DeliveryAssignment> findByPartnerId(Long partnerId);
    List<DeliveryAssignment> findByPartnerIdAndStatus(Long partnerId, String status);
    List<DeliveryAssignment> findByPartnerIdOrderByAssignedAtDesc(Long partnerId);
    boolean existsByOrderId(Long orderId);
    long countByPartnerId(Long partnerId);
    long countByPartnerIdAndStatus(Long partnerId, String status);
}
