package com.flamehaus.api.repository;

import com.flamehaus.api.entity.OrderCancellation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface OrderCancellationRepository extends JpaRepository<OrderCancellation, Long> {
    Optional<OrderCancellation> findByOrderId(Long orderId);
    boolean existsByOrderId(Long orderId);
    List<OrderCancellation> findAllByOrderByIdDesc();
}
