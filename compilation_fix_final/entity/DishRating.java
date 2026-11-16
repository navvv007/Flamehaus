package com.flamehaus.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "dish_ratings",
       uniqueConstraints = @UniqueConstraint(
           columnNames = {"order_id","menu_item_id","customer_id"}))
public class DishRating {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","customer","password"})
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_item_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler"})
    private MenuItem menuItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","password"})
    private Customer customer;

    @Column(length = 150)     private String  dishName;
    @Column(nullable = false) private Integer stars;
    @Column(length = 300)     private String  comment;
    @Column(nullable = false) private LocalDateTime createdAt = LocalDateTime.now();

    public Long          getId()                    { return id; }
    public Order         getOrder()                 { return order; }
    public void          setOrder(Order o)          { this.order = o; }
    public MenuItem      getMenuItem()              { return menuItem; }
    public void          setMenuItem(MenuItem m)    { this.menuItem = m; }
    public Customer      getCustomer()              { return customer; }
    public void          setCustomer(Customer c)    { this.customer = c; }
    public String        getDishName()              { return dishName; }
    public void          setDishName(String n)      { this.dishName = n; }
    public Integer       getStars()                 { return stars; }
    public void          setStars(Integer s)        { this.stars = s; }
    public Integer       getRating()                { return stars; }
    public void          setRating(Integer r)       { this.stars = r; }
    public String        getComment()               { return comment; }
    public void          setComment(String c)       { this.comment = c; }
    public LocalDateTime getCreatedAt()             { return createdAt; }
    public void          setCreatedAt(LocalDateTime t) { this.createdAt = t; }
}
