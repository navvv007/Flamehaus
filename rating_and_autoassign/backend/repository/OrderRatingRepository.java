package com.flamehaus.api.repository;

import com.flamehaus.api.entity.OrderRating;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderRatingRepository extends JpaRepository<OrderRating, Long> {
    boolean existsByOrderId(Long orderId);
    List<OrderRating> findAllByOrderByCreatedAtDesc();
}
