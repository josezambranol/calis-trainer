package com.calishome.api.billing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_events")
public class PaymentEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 30)
    private String provider;

    @Column(name = "provider_event_id", nullable = false, unique = true, length = 160)
    private String providerEventId;

    @Column(name = "event_type", nullable = false, length = 80)
    private String eventType;

    @Column(name = "external_reference", length = 120)
    private String externalReference;

    @Column(name = "transaction_status", length = 40)
    private String transactionStatus;

    @Column(name = "event_timestamp", nullable = false)
    private long eventTimestamp;

    @Column(name = "payload_hash", nullable = false, length = 64)
    private String payloadHash;

    @Column(name = "processing_outcome", nullable = false, length = 40)
    private String processingOutcome;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;

    public static PaymentEventEntity create(
            String provider,
            String providerEventId,
            String eventType,
            String externalReference,
            String transactionStatus,
            long eventTimestamp,
            String payloadHash,
            String processingOutcome,
            Instant processedAt) {
        PaymentEventEntity entity = new PaymentEventEntity();
        entity.provider = provider;
        entity.providerEventId = providerEventId;
        entity.eventType = eventType;
        entity.externalReference = externalReference;
        entity.transactionStatus = transactionStatus;
        entity.eventTimestamp = eventTimestamp;
        entity.payloadHash = payloadHash;
        entity.processingOutcome = processingOutcome;
        entity.processedAt = processedAt;
        return entity;
    }

    public UUID getId() {
        return id;
    }

    public String getProviderEventId() {
        return providerEventId;
    }

    public String getProcessingOutcome() {
        return processingOutcome;
    }
}
