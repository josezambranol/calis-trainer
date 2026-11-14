package com.calishome.api.notifications;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.calishome.api.common.web.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class PushEndpointValidatorTest {

    @ParameterizedTest
    @ValueSource(strings = {
            "https://fcm.googleapis.com/fcm/send/token-123",
            "https://updates.push.services.mozilla.com/wpush/v2/abc",
            "https://web.push.apple.com/QBa9xyz"
    })
    void allowsPublicHttpsPushServices(String endpoint) {
        assertThat(PushEndpointValidator.validateExternalHttpsEndpoint(endpoint)).isEqualTo(endpoint);
        assertThat(PushEndpointValidator.isSafeExternalEndpoint(endpoint)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "http://fcm.googleapis.com/fcm/send/token-123",
            "https://localhost/push",
            "https://sub.localhost/push",
            "https://service.internal/push",
            "https://printer.local/push",
            "https://127.0.0.1/push",
            "https://169.254.169.254/latest/meta-data/",
            "https://10.0.0.12/push",
            "https://192.168.1.25/push",
            "https://172.16.0.4/push",
            "https://100.64.0.10/push",
            "https://0.0.0.0/push",
            "https://[::1]/push",
            "https://[fe80::1]/push",
            "https://[fc00::1]/push",
            "https://user:secret@fcm.googleapis.com/fcm/send/token"
    })
    void blocksHttpInternalAndMetadataEndpointsAgainstSsrf(String endpoint) {
        assertThatThrownBy(() -> PushEndpointValidator.validateExternalHttpsEndpoint(endpoint))
                .isInstanceOf(ApiException.class);
        assertThat(PushEndpointValidator.isSafeExternalEndpoint(endpoint)).isFalse();
    }

    @Test
    void trimsValidEndpointWhitespace() {
        String trimmed = PushEndpointValidator.validateExternalHttpsEndpoint(
                "  https://fcm.googleapis.com/fcm/send/abc  "
        );
        assertThat(trimmed).isEqualTo("https://fcm.googleapis.com/fcm/send/abc");
    }
}
