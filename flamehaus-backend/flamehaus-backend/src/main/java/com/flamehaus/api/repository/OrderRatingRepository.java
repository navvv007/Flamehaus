package com.flamehaus.api.repository;

import com.flamehaus.api.entity.OrderRating;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface OrderRatingRepository extends JpaRepository<OrderRating, Long> {
    boolean            existsByOrderId(Long orderId);
    Optional<OrderRating> findByOrderId(Long orderId);
    List<OrderRating>  findAllByOrderByCreatedAtDesc();
}
