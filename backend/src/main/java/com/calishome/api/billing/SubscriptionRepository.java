package com.calishome.api.billing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionRepository extends JpaRepository<SubscriptionEntity, UUID> {

    Optional<SubscriptionEntity> findByExternalReference(String externalReference);

    Optional<SubscriptionEntity> findFirstByUserIdOrderByUpdatedAtDesc(UUID userId);

    List<SubscriptionEntity> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<SubscriptionEntity> findFirstByUserIdAndStatusInOrderByUpdatedAtDesc(
            UUID userId,
            java.util.Collection<SubscriptionStatus> statuses
    );
}
