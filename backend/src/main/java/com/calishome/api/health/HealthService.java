package com.calishome.api.health;

import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HealthService {

    private static final Logger log = LoggerFactory.getLogger(HealthService.class);
    private final JdbcTemplate jdbcTemplate;

    public HealthService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public HealthResponse checkHealth() {
        boolean dbUp = isDatabaseUp();
        return new HealthResponse(
                dbUp ? "UP" : "DOWN",
                "calishome-api",
                dbUp ? "UP" : "DOWN",
                Instant.now()
        );
    }

    private boolean isDatabaseUp() {
        try {
            Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return result != null && result == 1;
        } catch (DataAccessException ex) {
            log.warn("Database health check failed: {}", ex.getMessage());
            return false;
        }
    }
}
