package com.flamehaus.api.repository;

import com.flamehaus.api.entity.OrderCancellation;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderCancellationRepository extends JpaRepository<OrderCancellation, Long> {

    Optional<OrderCancellation> findByOrderId(Long orderId);

    boolean existsByOrderId(Long orderId);

    /**
     * Newest first. Implemented as a default method on purpose: Spring Data does
     * NOT try to parse default methods, so this cannot fail at startup with
     * "No property createdAt found" even if the entity names its timestamp
     * cancelledAt. Newest record = highest id.
     */
    default List<OrderCancellation> findAllByOrderByCreatedAtDesc() {
        return findAll(Sort.by(Sort.Direction.DESC, "id"));
    }
}
