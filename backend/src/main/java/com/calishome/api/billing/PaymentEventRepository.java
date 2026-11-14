package com.calishome.api.billing;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentEventRepository extends JpaRepository<PaymentEventEntity, UUID> {

    boolean existsByProviderEventId(String providerEventId);
}
