package com.flamehaus.api.service;

import com.flamehaus.api.dto.CustomerRatingRequest;
import com.flamehaus.api.entity.*;
import com.flamehaus.api.repository.*;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class RatingService {

    private final OrderRatingRepository    orderRatingRepo;
    private final DishRatingRepository     dishRatingRepo;
    private final OrderRepository          orderRepo;
    private final MenuItemRepository       menuItemRepo;
    private final CustomerRepository       customerRepo;

    public RatingService(OrderRatingRepository orderRatingRepo,
                         DishRatingRepository dishRatingRepo,
                         OrderRepository orderRepo,
                         MenuItemRepository menuItemRepo,
                         CustomerRepository customerRepo) {
        this.orderRatingRepo = orderRatingRepo;
        this.dishRatingRepo  = dishRatingRepo;
        this.orderRepo       = orderRepo;
        this.menuItemRepo    = menuItemRepo;
        this.customerRepo    = customerRepo;
    }

    // ── Submit combined rating (order + individual dishes) ────────────────────

    public Map<String, Object> submitRating(String customerEmail,
                                             CustomerRatingRequest req) {
        Order order = orderRepo.findById(req.getOrderId())
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (orderRatingRepo.existsByOrderId(order.getId()))
            throw new RuntimeException("Order already rated");

        Customer customer = customerRepo.findByEmail(customerEmail)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        // Save overall order rating
        OrderRating or = new OrderRating();
        or.setOrder(order);
        or.setCustomer(customer);                   // uses setCustomer()
        or.setStars(req.getOverallRating());        // uses setStars()
        or.setComment(req.getOverallComment());
        or.setCreatedAt(LocalDateTime.now());
        orderRatingRepo.save(or);

        // Save individual dish ratings
        if (req.getDishRatings() != null) {
            for (var d : req.getDishRatings()) {
                if (d.getRating() == null || d.getRating() < 1) continue;

                // Try to match dish name to a MenuItem
                List<MenuItem> items = menuItemRepo.findByNameContainingIgnoreCase(d.getDishName());
                MenuItem menuItem = items.isEmpty() ? null : items.get(0);

                // Skip duplicate (same order + dish + customer)
                if (menuItem != null &&
                    dishRatingRepo.existsByOrderIdAndMenuItemIdAndCustomerId(
                        order.getId(), menuItem.getId(), customer.getId())) {
                    continue;
                }

                DishRating dr = new DishRating();
                dr.setOrder(order);
                dr.setMenuItem(menuItem);           // uses setMenuItem()
                dr.setCustomer(customer);           // uses setCustomer()
                dr.setDishName(d.getDishName());
                dr.setStars(d.getRating());         // uses setStars()
                dr.setComment(d.getComment());
                dr.setCreatedAt(LocalDateTime.now());
                dishRatingRepo.save(dr);

                // Update MenuItem aggregate rating
                if (menuItem != null) {
                    Double avg   = dishRatingRepo.avgStarsByMenuItem(menuItem.getId());
                    Long   count = dishRatingRepo.countByMenuItem(menuItem.getId());
                    menuItem.setRating(avg != null ? avg : 0.0);
                    menuItem.setReviews(count != null ? count.intValue() : 0);
                    menuItemRepo.save(menuItem);
                }
            }
        }

        return Map.of("message", "Rating submitted successfully", "orderId", order.getId());
    }

    // ── Check if already rated ─────────────────────────────────────────────────

    public boolean hasRated(Long orderId) {
        return orderRatingRepo.existsByOrderId(orderId);
    }

    // ── Admin: all order ratings ───────────────────────────────────────────────

    public List<OrderRating> getAllOrderRatings() {
        return orderRatingRepo.findAllByOrderByCreatedAtDesc();
    }

    // ── Admin: order rating by order ID ───────────────────────────────────────

    public OrderRating getByOrderId(Long orderId) {
        return orderRatingRepo.findByOrderId(orderId)  // uses findByOrderId()
                .orElse(null);
    }

    // ── Admin: dish ratings for a specific menu item ───────────────────────────

    public Map<String, Object> getDishStats(Long menuItemId) {
        Double avg   = dishRatingRepo.avgStarsByMenuItem(menuItemId);    // uses avgStarsByMenuItem()
        Long   count = dishRatingRepo.countByMenuItem(menuItemId);       // uses countByMenuItem()
        List<DishRating> reviews = dishRatingRepo.findByMenuItemId(menuItemId); // uses findByMenuItemId()
        return Map.of(
            "menuItemId", menuItemId,
            "avgStars",   avg   != null ? avg   : 0.0,
            "totalRatings", count != null ? count : 0L,
            "reviews",    reviews
        );
    }

    // ── Admin: dashboard summary ───────────────────────────────────────────────

    public Map<String, Object> getSummary() {
        List<OrderRating> all = orderRatingRepo.findAllByOrderByCreatedAtDesc();
        long total = all.size();
        double avg = all.stream()
            .filter(r -> r.getStars() != null)
            .mapToInt(OrderRating::getStars)
            .average().orElse(0.0);

        // Star distribution (1–5)
        Map<Integer, Long> dist = new LinkedHashMap<>();
        for (int i = 5; i >= 1; i--) {
            final int star = i;
            dist.put(star, all.stream().filter(r -> r.getStars() != null && r.getStars() == star).count());
        }

        return Map.of(
            "totalRatings",      total,
            "averageStars",      Math.round(avg * 10.0) / 10.0,
            "starDistribution",  dist,
            "recentRatings",     all.stream().limit(20).toList()
        );
    }
}
