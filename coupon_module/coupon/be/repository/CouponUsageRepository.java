package com.flamehaus.api.repository;
import com.flamehaus.api.entity.CouponUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface CouponUsageRepository extends JpaRepository<CouponUsage, Long> {
    Optional<CouponUsage> findByOrderId(Long orderId);
    long countByCouponIdAndCustomerId(Long couponId, Long customerId);
    @Query("SELECT COALESCE(SUM(u.discountAmountInr),0) FROM CouponUsage u WHERE u.coupon.id = :id")
    Double totalSavingsByCoupon(@Param("id") Long couponId);
}