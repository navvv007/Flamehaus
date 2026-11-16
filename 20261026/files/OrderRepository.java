package com.flamehaus.api.repository;

import com.flamehaus.api.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    // ── Basic lookups ─────────────────────────────────────────────────────────
    List<Order> findAllByOrderByCreatedAtDesc();

    List<Order> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<Order> findByCustomerIdAndStatus(Long customerId, String status);

    long countByStatus(String status);

    long countByCustomerId(Long customerId);

    // ── Status queries ────────────────────────────────────────────────────────
    List<Order> findByStatus(String status);

    List<Order> findByStatusIn(List<String> statuses);

    // ── Unassigned preparing orders — for auto-assign when partner goes ONLINE ─
    @Query("SELECT o FROM Order o WHERE o.status = 'Preparing' " +
           "AND NOT EXISTS (" +
           "  SELECT a FROM DeliveryAssignment a " +
           "  WHERE a.order.id = o.id " +
           "  AND a.status IN ('ASSIGNED','ACCEPTED','PICKED_UP')" +
           ")")
    List<Order> findUnassignedPreparingOrders();

    // ── Dashboard stats ───────────────────────────────────────────────────────
    @Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status")
    long countOrdersByStatus(@Param("status") String status);
}
