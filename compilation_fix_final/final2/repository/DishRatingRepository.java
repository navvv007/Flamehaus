package com.flamehaus.api.repository;

import com.flamehaus.api.entity.DishRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DishRatingRepository extends JpaRepository<DishRating, Long> {

    List<DishRating> findByDishName(String dishName);
    List<DishRating> findByOrderId(Long orderId);

    // FIX: added — matches RatingService.findByMenuItemId()
    List<DishRating> findByMenuItemId(Long menuItemId);

    // FIX: added — matches RatingService.existsByOrderIdAndMenuItemIdAndCustomerId()
    boolean existsByOrderIdAndMenuItemIdAndCustomerId(Long orderId, Long menuItemId, Long customerId);

    // FIX: added — matches RatingService.avgStarsByMenuItem()
    @Query("SELECT COALESCE(AVG(d.stars), 0) FROM DishRating d WHERE d.menuItem.id = :id")
    Double avgStarsByMenuItem(@Param("id") Long menuItemId);

    // FIX: added — matches RatingService.countByMenuItem()
    @Query("SELECT COUNT(d) FROM DishRating d WHERE d.menuItem.id = :id")
    Long countByMenuItem(@Param("id") Long menuItemId);
}
