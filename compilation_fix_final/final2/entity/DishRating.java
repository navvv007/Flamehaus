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
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(
        {"hibernateLazyInitializer","handler","customer","password"})
    private Order order;

    // FIX: added menuItem FK — matches RatingService.setMenuItem()
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_item_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(
        {"hibernateLazyInitializer","handler"})
    private MenuItem menuItem;

    // FIX: added customer FK — matches RatingService.setCustomer()
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(
        {"hibernateLazyInitializer","handler","password","orders"})
    private Customer customer;

    @Column(length = 150)
    private String dishName;

    // FIX: renamed from "rating" to "stars" — matches RatingService.setStars()
    @Column(nullable = false)
    private Integer stars;

    @Column(length = 300)
    private String comment;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long          getId()                      { return id; }
    public void          setId(Long id)               { this.id = id; }
    public Order         getOrder()                   { return order; }
    public void          setOrder(Order o)            { this.order = o; }
    public MenuItem      getMenuItem()                { return menuItem; }
    public void          setMenuItem(MenuItem m)      { this.menuItem = m; }
    public Customer      getCustomer()                { return customer; }
    public void          setCustomer(Customer c)      { this.customer = c; }
    public String        getDishName()                { return dishName; }
    public void          setDishName(String n)        { this.dishName = n; }
    public Integer       getStars()                   { return stars; }
    public void          setStars(Integer s)          { this.stars = s; }
    public String        getComment()                 { return comment; }
    public void          setComment(String c)         { this.comment = c; }
    public LocalDateTime getCreatedAt()               { return createdAt; }
    public void          setCreatedAt(LocalDateTime t){ this.createdAt = t; }
}
