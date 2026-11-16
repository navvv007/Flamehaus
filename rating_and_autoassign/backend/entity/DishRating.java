package com.flamehaus.api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "dish_ratings")
public class DishRating {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer","handler","customer","password"})
    private Order order;

    @Column(length = 150) private String dishName;
    @Column(nullable = false) private Integer rating;
    @Column(length = 300) private String comment;
    @Column(nullable = false) private LocalDateTime createdAt = LocalDateTime.now();

    public Long          getId()           { return id; }
    public Order         getOrder()        { return order; }
    public void          setOrder(Order o) { this.order = o; }
    public String        getDishName()     { return dishName; }
    public void          setDishName(String n) { this.dishName = n; }
    public Integer       getRating()       { return rating; }
    public void          setRating(Integer r)  { this.rating = r; }
    public String        getComment()      { return comment; }
    public void          setComment(String c)  { this.comment = c; }
    public LocalDateTime getCreatedAt()    { return createdAt; }
    public void          setCreatedAt(LocalDateTime t) { this.createdAt = t; }
}
