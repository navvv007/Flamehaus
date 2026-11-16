package com.flamehaus.api.repository;

import com.flamehaus.api.entity.DishRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface DishRatingRepository extends JpaRepository<DishRating, Long> {

    List<DishRating> findByDishName(String dishName);
    List<DishRating> findByOrderId(Long orderId);

    boolean existsByOrderIdAndMenuItemIdAndCustomerId(
        Long orderId, Long menuItemId, Long customerId);

    List<DishRating> findByMenuItemId(Long menuItemId);

    @Query("SELECT AVG(d.stars) FROM DishRating d WHERE d.menuItem.id = :menuItemId")
    Double avgStarsByMenuItem(@Param("menuItemId") Long menuItemId);

    @Query("SELECT COUNT(d) FROM DishRating d WHERE d.menuItem.id = :menuItemId")
    Long countByMenuItem(@Param("menuItemId") Long menuItemId);
}
