package com.flamehaus.api.repository;

import com.flamehaus.api.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findAllByOrderByCreatedAtDesc();

    // Used by OrderService.getCustomerOrders()
    List<Order> findByCustomerId(Long customerId);

    List<Order> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<Order> findByCustomerIdAndStatus(Long customerId, String status);

    List<Order> findByStatus(String status);

    List<Order> findByStatusIn(List<String> statuses);

    long countByStatus(String status);

    long countByCustomerId(Long customerId);

    // Used by OrderService.getDashboardStats() — total revenue
    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o WHERE o.status = 'Delivered'")
    Double sumTotalRevenue();

    // Used by DeliveryService — find preparing orders with no active assignment
    @Query("SELECT o FROM Order o WHERE o.status = 'Preparing' " +
           "AND NOT EXISTS (" +
           "  SELECT a FROM DeliveryAssignment a " +
           "  WHERE a.order.id = o.id " +
           "  AND a.status IN ('ASSIGNED','ACCEPTED','PICKED_UP')" +
           ")")
    List<Order> findUnassignedPreparingOrders();
}
