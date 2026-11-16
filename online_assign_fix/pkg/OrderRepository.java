package com.flamehaus.api.repository;

import com.flamehaus.api.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findAllByOrderByCreatedAtDesc();
    List<Order> findByStatus(String status);
    List<Order> findByCustomerId(Long customerId);

    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o")
    Double sumTotalRevenue();

    long countByStatus(String status);

    /**
     * "Preparing" orders with no active delivery assignment.
     * Used when a partner goes ONLINE — assign them immediately.
     */
    @Query("""
        SELECT o FROM Order o
        WHERE o.status = 'Preparing'
          AND NOT EXISTS (
              SELECT a FROM DeliveryAssignment a
              WHERE a.order = o
                AND a.status IN ('ASSIGNED','ACCEPTED','PICKED_UP')
          )
        ORDER BY o.createdAt ASC
        """)
    List<Order> findUnassignedPreparingOrders();
}
