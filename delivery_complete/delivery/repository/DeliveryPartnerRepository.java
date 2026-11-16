package com.flamehaus.api.repository;

import com.flamehaus.api.entity.DeliveryPartner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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
     * Find ACTIVE + ONLINE partners ordered by distance from a point.
     * Uses Haversine approximation — good enough for city-level proximity.
     */
    @Query(value = """
        SELECT * FROM delivery_partners
        WHERE status = 'ACTIVE'
          AND availability = 'ONLINE'
          AND current_lat IS NOT NULL
          AND current_lng IS NOT NULL
        ORDER BY (
            POW(current_lat  - :lat, 2) +
            POW(current_lng  - :lng, 2)
        ) ASC
        LIMIT 1
        """, nativeQuery = true)
    Optional<DeliveryPartner> findNearestAvailable(double lat, double lng);

    /** Fallback: any ACTIVE + ONLINE partner when no GPS data available */
    @Query("SELECT p FROM DeliveryPartner p WHERE p.status = 'ACTIVE' AND p.availability = 'ONLINE' ORDER BY p.totalDeliveries ASC")
    List<DeliveryPartner> findAvailableByLeastBusy();
}
