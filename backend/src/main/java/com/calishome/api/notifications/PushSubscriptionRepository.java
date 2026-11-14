package com.calishome.api.notifications;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscriptionEntity, UUID> {

    Optional<PushSubscriptionEntity> findByEndpoint(String endpoint);

    List<PushSubscriptionEntity> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByUserId(UUID userId);

    void deleteByUserIdAndEndpoint(UUID userId, String endpoint);

    void deleteByUserId(UUID userId);
}
