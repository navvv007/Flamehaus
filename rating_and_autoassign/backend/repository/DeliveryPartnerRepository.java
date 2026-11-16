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

    List<DeliveryPartner> findByStatus(String status);
    List<DeliveryPartner> findByStatusAndAvailability(String status, String availability);

    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);

    /**
     * Find the nearest ACTIVE+ONLINE partner using Haversine distance.
     * Returns partners ordered by distance from the given coordinates.
     * Used for auto-assignment when an order is placed.
     */
    @Query(value = """
        SELECT dp.*,
               (6371 * ACOS(
                   COS(RADIANS(:lat)) * COS(RADIANS(dp.current_lat))
                   * COS(RADIANS(dp.current_lng) - RADIANS(:lng))
                   + SIN(RADIANS(:lat)) * SIN(RADIANS(dp.current_lat))
               )) AS distance
        FROM delivery_partners dp
        WHERE dp.status       = 'ACTIVE'
          AND dp.availability = 'ONLINE'
          AND dp.current_lat  IS NOT NULL
          AND dp.current_lng  IS NOT NULL
        ORDER BY distance ASC
        LIMIT :limit
        """, nativeQuery = true)
    List<DeliveryPartner> findNearestAvailable(
        @Param("lat")   double lat,
        @Param("lng")   double lng,
        @Param("limit") int    limit
    );

    /**
     * Fallback: find any ACTIVE+ONLINE partner (no GPS coords required)
     * when the order has no delivery coordinates.
     */
    @Query("""
        SELECT dp FROM DeliveryPartner dp
        WHERE dp.status = 'ACTIVE' AND dp.availability = 'ONLINE'
        ORDER BY dp.totalDeliveries ASC
        """)
    List<DeliveryPartner> findAvailableByLeastDeliveries();
}
