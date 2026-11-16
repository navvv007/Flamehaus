package com.flamehaus.api.repository;

import com.flamehaus.api.entity.DeliveryPartner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DeliveryPartnerRepository extends JpaRepository<DeliveryPartner, Long> {

    Optional<DeliveryPartner> findByEmail(String email);
    Optional<DeliveryPartner> findByPhone(String phone);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);

    List<DeliveryPartner> findByStatus(String status);
    List<DeliveryPartner> findByStatusAndAvailability(String status, String availability);

    /**
     * Nearest ACTIVE + ONLINE partner using Haversine formula.
     * Excludes partners who already rejected this order.
     * Falls back gracefully when excludedIds is empty.
     */
    @Query(value = """
        SELECT p.*,
            (6371 * ACOS(
                COS(RADIANS(:lat)) * COS(RADIANS(p.current_lat)) *
                COS(RADIANS(p.current_lng) - RADIANS(:lng)) +
                SIN(RADIANS(:lat)) * SIN(RADIANS(p.current_lat))
            )) AS distance_km
        FROM delivery_partners p
        WHERE p.status       = 'ACTIVE'
          AND p.availability = 'ONLINE'
          AND p.current_lat  IS NOT NULL
          AND p.current_lng  IS NOT NULL
          AND p.id NOT IN (:excludedIds)
        ORDER BY distance_km ASC
        LIMIT 1
        """, nativeQuery = true)
    Optional<DeliveryPartner> findNearestOnlinePartner(
        @Param("lat")         double lat,
        @Param("lng")         double lng,
        @Param("excludedIds") List<Long> excludedIds);

    /**
     * Fallback: least-busy ACTIVE + ONLINE partner (when no GPS available).
     * Excludes partners who already rejected this order.
     */
    @Query(value = """
        SELECT * FROM delivery_partners
        WHERE status       = 'ACTIVE'
          AND availability = 'ONLINE'
          AND id NOT IN (:excludedIds)
        ORDER BY total_deliveries ASC
        LIMIT 1
        """, nativeQuery = true)
    Optional<DeliveryPartner> findLeastBusyOnlinePartner(
        @Param("excludedIds") List<Long> excludedIds);
}
