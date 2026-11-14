package com.calishome.api.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationTokenEntity, UUID> {

    Optional<EmailVerificationTokenEntity> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update EmailVerificationTokenEntity t set t.usedAt = :now where t.userId = :userId and t.usedAt is null")
    int invalidateActiveForUser(@Param("userId") UUID userId, @Param("now") Instant now);
}
