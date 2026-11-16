package com.flamehaus.api.dto;

import jakarta.validation.constraints.*;
import java.util.List;

public class RatingRequest {

    @NotNull
    private Long orderId;

    /** Overall order rating — 1 to 5 */
    @NotNull @Min(1) @Max(5)
    private Integer orderStars;

    @Size(max = 1000)
    private String orderComment;

    /** Individual dish ratings — can be empty */
    private List<DishRatingItem> dishRatings;

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public Integer getOrderStars() { return orderStars; }
    public void setOrderStars(Integer orderStars) { this.orderStars = orderStars; }
    public String getOrderComment() { return orderComment; }
    public void setOrderComment(String orderComment) { this.orderComment = orderComment; }
    public List<DishRatingItem> getDishRatings() { return dishRatings; }
    public void setDishRatings(List<DishRatingItem> dishRatings) { this.dishRatings = dishRatings; }

    public static class DishRatingItem {
        @NotNull
        private Long menuItemId;
        @NotNull @Min(1) @Max(5)
        private Integer stars;
        @Size(max = 500)
        private String comment;

        public Long getMenuItemId() { return menuItemId; }
        public void setMenuItemId(Long menuItemId) { this.menuItemId = menuItemId; }
        public Integer getStars() { return stars; }
        public void setStars(Integer stars) { this.stars = stars; }
        public String getComment() { return comment; }
        public void setComment(String comment) { this.comment = comment; }
    }
}
