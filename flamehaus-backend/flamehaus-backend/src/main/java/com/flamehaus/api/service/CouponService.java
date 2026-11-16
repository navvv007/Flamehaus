package com.flamehaus.api.service;

import com.flamehaus.api.dto.ApplyCouponRequest;
import com.flamehaus.api.dto.CouponRequest;
import com.flamehaus.api.entity.*;
import com.flamehaus.api.repository.*;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class CouponService {

    private final CouponRepository      couponRepo;
    private final CouponUsageRepository usageRepo;
    private final CustomerRepository    customerRepo;
    private final OrderRepository       orderRepo;

    public CouponService(CouponRepository couponRepo, CouponUsageRepository usageRepo,
                         CustomerRepository customerRepo, OrderRepository orderRepo) {
        this.couponRepo   = couponRepo;
        this.usageRepo    = usageRepo;
        this.customerRepo = customerRepo;
        this.orderRepo    = orderRepo;
    }

    // ── Admin CRUD ──────────────────────────────────────────────────────────

    public Coupon create(CouponRequest req) {
        if (couponRepo.existsByCodeIgnoreCase(req.getCode()))
            throw new RuntimeException("Coupon code already exists: " + req.getCode());
        Coupon c = new Coupon();
        fill(c, req);
        return couponRepo.save(c);
    }

    public Coupon update(Long id, CouponRequest req) {
        Coupon c = get(id);
        if (!c.getCode().equalsIgnoreCase(req.getCode()) &&
            couponRepo.existsByCodeIgnoreCase(req.getCode()))
            throw new RuntimeException("Coupon code already exists: " + req.getCode());
        fill(c, req);
        return couponRepo.save(c);
    }

    public List<Coupon> getAll()    { return couponRepo.findAll(); }
    public List<Coupon> getActive() { return couponRepo.findByActiveTrue(); }

    public Coupon toggle(Long id) {
        Coupon c = get(id);
        c.setActive(!Boolean.TRUE.equals(c.getActive()));
        return couponRepo.save(c);
    }

    public void delete(Long id) { couponRepo.deleteById(id); }

    // ── Validate (preview — no DB write) ───────────────────────────────────

    public Map<String, Object> validate(ApplyCouponRequest req) {
        Coupon c = couponRepo.findByCodeIgnoreCase(req.getCode())
                .orElseThrow(() -> new RuntimeException("Coupon code not found"));

        if (!Boolean.TRUE.equals(c.getActive()))
            throw new RuntimeException("This coupon is no longer active");

        if (c.getExpiresAt() != null && LocalDateTime.now().isAfter(c.getExpiresAt()))
            throw new RuntimeException("This coupon has expired");

        double orderInr = req.getOrderTotalInr();
        if (orderInr < c.getMinimumOrderAmount())
            throw new RuntimeException(String.format(
                "Minimum order is \u20b9%.0f. Add \u20b9%.0f more to use this coupon.",
                c.getMinimumOrderAmount(), c.getMinimumOrderAmount() - orderInr));

        if (c.getUsageLimit() != null && c.getUsageCount() >= c.getUsageLimit())
            throw new RuntimeException("This coupon has reached its usage limit");

        if (req.getCustomerId() != null) {
            long used = usageRepo.countByCouponIdAndCustomerId(c.getId(), req.getCustomerId());
            if (used >= c.getPerCustomerLimit())
                throw new RuntimeException("You have already used this coupon "
                    + c.getPerCustomerLimit() + " time(s)");
        }

        double discount  = calcDiscount(c, orderInr);
        double finalTotal= orderInr - discount;

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("valid",             true);
        res.put("couponCode",        c.getCode());
        res.put("description",       c.getDescription());
        res.put("discountType",      c.getDiscountType());
        res.put("discountValue",     c.getDiscountValue());
        res.put("discountAmountInr", discount);
        res.put("originalTotal",     orderInr);
        res.put("finalTotal",        finalTotal);
        res.put("savings",           discount);
        return res;
    }

    // ── Apply (called after order is placed) ────────────────────────────────

    public CouponUsage apply(String code, Long orderId, Long customerId) {
        Coupon c = couponRepo.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new RuntimeException("Coupon not found: " + code));
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

        double discount = calcDiscount(c, order.getTotal() * 84);

        CouponUsage u = new CouponUsage();
        u.setCoupon(c);
        u.setOrder(order);
        u.setDiscountAmountInr(discount);
        if (customerId != null)
            customerRepo.findById(customerId).ifPresent(u::setCustomer);
        usageRepo.save(u);

        c.setUsageCount(c.getUsageCount() + 1);
        couponRepo.save(c);
        return u;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private double calcDiscount(Coupon c, double orderInr) {
        double d = "PERCENTAGE".equals(c.getDiscountType())
            ? orderInr * c.getDiscountValue() / 100.0
            : c.getDiscountValue();
        if (c.getMaximumDiscount() != null) d = Math.min(d, c.getMaximumDiscount());
        return Math.min(d, orderInr);
    }

    private void fill(Coupon c, CouponRequest req) {
        c.setCode(req.getCode());
        c.setDescription(req.getDescription());
        c.setDiscountType(req.getDiscountType() != null ? req.getDiscountType() : "PERCENTAGE");
        c.setDiscountValue(req.getDiscountValue());
        c.setMinimumOrderAmount(req.getMinimumOrderAmount() != null ? req.getMinimumOrderAmount() : 700.0);
        c.setMaximumDiscount(req.getMaximumDiscount());
        c.setUsageLimit(req.getUsageLimit());
        c.setPerCustomerLimit(req.getPerCustomerLimit() != null ? req.getPerCustomerLimit() : 1);
        if (req.getExpiresAt() != null && !req.getExpiresAt().isBlank())
            c.setExpiresAt(LocalDateTime.parse(req.getExpiresAt()));
        else c.setExpiresAt(null);
    }

    private Coupon get(Long id) {
        return couponRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Coupon not found: " + id));
    }
}