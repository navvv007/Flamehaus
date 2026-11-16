package com.flamehaus.api.repository;

import com.flamehaus.api.entity.DishRating;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DishRatingRepository extends JpaRepository<DishRating, Long> {
    List<DishRating> findByDishName(String dishName);
    List<DishRating> findByOrderId(Long orderId);
}
