package com.flamehaus.api.controller;

import com.flamehaus.api.dto.CustomerRatingRequest;
import com.flamehaus.api.entity.MenuItem;
import com.flamehaus.api.entity.Order;
import com.flamehaus.api.entity.OrderRating;
import com.flamehaus.api.entity.DishRating;
import com.flamehaus.api.repository.*;
import com.flamehaus.api.security.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customer/ratings")
public class RatingController {

    private final OrderRepository       orderRepo;
    private final OrderRatingRepository orderRatingRepo;
    private final DishRatingRepository  dishRatingRepo;
    private final MenuItemRepository    menuItemRepo;
    private final JwtUtil               jwtUtil;

    public RatingController(OrderRepository orderRepo,
                             OrderRatingRepository orderRatingRepo,
                             DishRatingRepository dishRatingRepo,
                             MenuItemRepository menuItemRepo,
                             JwtUtil jwtUtil) {
        this.orderRepo       = orderRepo;
        this.orderRatingRepo = orderRatingRepo;
        this.dishRatingRepo  = dishRatingRepo;
        this.menuItemRepo    = menuItemRepo;
        this.jwtUtil         = jwtUtil;
    }

    /** Submit food rating — overall order + individual dishes */
    @PostMapping
    public ResponseEntity<?> rateOrder(@Valid @RequestBody CustomerRatingRequest req,
                                        Authentication auth) {
        try {
            Long customerId = extractCustomerId(auth);
            Order order = orderRepo.findById(req.getOrderId())
                    .orElseThrow(() -> new RuntimeException("Order not found"));

            if (!"Delivered".equals(order.getStatus()))
                return ResponseEntity.badRequest().body(Map.of("error", "Order not yet delivered"));

            if (orderRatingRepo.existsByOrderId(req.getOrderId()))
                return ResponseEntity.badRequest().body(Map.of("error", "Already rated"));

            // Save overall order rating
            OrderRating or = new OrderRating();
            or.setOrder(order);
            or.setRating(req.getOverallRating());
            or.setComment(req.getOverallComment());
            or.setCreatedAt(LocalDateTime.now());
            orderRatingRepo.save(or);

            // Save per-dish ratings
            if (req.getDishRatings() != null) {
                for (var dr : req.getDishRatings()) {
                    if (dr.getRating() == null) continue;
                    DishRating dishRating = new DishRating();
                    dishRating.setOrder(order);
                    dishRating.setDishName(dr.getDishName());
                    dishRating.setRating(dr.getRating());
                    dishRating.setComment(dr.getComment());
                    dishRating.setCreatedAt(LocalDateTime.now());
                    dishRatingRepo.save(dishRating);

                    // Update menu item aggregate rating
                    menuItemRepo.findByName(dr.getDishName()).ifPresent(item -> {
                        int total = (item.getReviews() != null ? item.getReviews() : 0) + 1;
                        double cur = item.getRating() != null ? item.getRating() : 0.0;
                        double newRating = ((cur * (total - 1)) + dr.getRating()) / total;
                        item.setRating(Math.round(newRating * 10.0) / 10.0);
                        item.setReviews(total);
                        menuItemRepo.save(item);
                    });
                }
            }

            return ResponseEntity.ok(Map.of("message", "Rating submitted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Check if an order has been rated */
    @GetMapping("/check/{orderId}")
    public ResponseEntity<?> checkRated(@PathVariable Long orderId) {
        boolean rated = orderRatingRepo.existsByOrderId(orderId);
        return ResponseEntity.ok(Map.of("rated", rated));
    }

    /** Admin — all ratings summary */
    @GetMapping("/admin/all")
    public ResponseEntity<?> adminRatings() {
        return ResponseEntity.ok(orderRatingRepo.findAllByOrderByCreatedAtDesc());
    }

    private Long extractCustomerId(Authentication auth) {
        if (auth == null || !(auth.getCredentials() instanceof String token)) return null;
        return jwtUtil.extractCustomerId(token);
    }
}
