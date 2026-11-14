package com.calishome.api.health;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class HealthServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private HealthService healthService;

    @Test
    void returnsUpWhenSelectOneSucceeds() {
        when(jdbcTemplate.queryForObject("SELECT 1", Integer.class)).thenReturn(1);

        HealthResponse result = healthService.checkHealth();

        assertThat(result.status()).isEqualTo("UP");
        assertThat(result.database()).isEqualTo("UP");
        assertThat(result.service()).isEqualTo("calishome-api");
    }

    @Test
    void returnsDownWhenDatabaseThrowsException() {
        when(jdbcTemplate.queryForObject("SELECT 1", Integer.class))
                .thenThrow(new DataAccessResourceFailureException("Connection refused"));

        HealthResponse result = healthService.checkHealth();

        assertThat(result.status()).isEqualTo("DOWN");
        assertThat(result.database()).isEqualTo("DOWN");
    }
}
