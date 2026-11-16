package com.flamehaus.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public class CustomerRatingRequest {

    @NotNull private Long orderId;
    @NotNull @Min(1) @Max(5) private Integer overallRating;
    private String overallComment;
    private List<DishRatingItem> dishRatings;

    public static class DishRatingItem {
        private String dishName;
        @Min(1) @Max(5) private Integer rating;
        private String comment;
        public String  getDishName()          { return dishName; }
        public void    setDishName(String n)  { dishName = n; }
        public Integer getRating()            { return rating; }
        public void    setRating(Integer r)   { rating = r; }
        public String  getComment()           { return comment; }
        public void    setComment(String c)   { comment = c; }
    }

    public Long   getOrderId()                  { return orderId; }
    public void   setOrderId(Long o)            { orderId = o; }
    public Integer getOverallRating()           { return overallRating; }
    public void   setOverallRating(Integer r)   { overallRating = r; }
    public String getOverallComment()           { return overallComment; }
    public void   setOverallComment(String c)   { overallComment = c; }
    public List<DishRatingItem> getDishRatings()         { return dishRatings; }
    public void   setDishRatings(List<DishRatingItem> d) { dishRatings = d; }
}
