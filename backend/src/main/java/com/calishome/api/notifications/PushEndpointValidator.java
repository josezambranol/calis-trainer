package com.calishome.api.notifications;

import com.calishome.api.common.web.ApiException;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import java.util.Locale;
import org.springframework.http.HttpStatus;

public final class PushEndpointValidator {

    private PushEndpointValidator() {
    }

    public static String validateExternalHttpsEndpoint(String rawEndpoint) {
        if (rawEndpoint == null || rawEndpoint.isBlank()) {
            throw invalidEndpoint("El endpoint Push es obligatorio.");
        }

        String trimmed = rawEndpoint.trim();
        URI uri;
        try {
            uri = new URI(trimmed);
        } catch (URISyntaxException ex) {
            throw invalidEndpoint("El endpoint Push no tiene un formato URI válido.");
        }

        if (!"https".equalsIgnoreCase(uri.getScheme())) {
            throw invalidEndpoint("El endpoint Push debe usar protocolo HTTPS.");
        }
        if (uri.getUserInfo() != null) {
            throw invalidEndpoint("El endpoint Push no puede contener credenciales en la URL.");
        }

        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw invalidEndpoint("El endpoint Push debe incluir un host válido.");
        }

        String normalizedHost = stripIpv6Brackets(host).toLowerCase(Locale.ROOT);
        if (normalizedHost.equals("localhost")
                || normalizedHost.endsWith(".localhost")
                || normalizedHost.endsWith(".local")
                || normalizedHost.endsWith(".internal")) {
            throw invalidEndpoint("El endpoint Push no puede apuntar a direcciones internas.");
        }

        try {
            InetAddress[] addresses = InetAddress.getAllByName(normalizedHost);
            for (InetAddress address : addresses) {
                if (isDisallowedAddress(address)) {
                    throw invalidEndpoint("El endpoint Push apunta a una dirección de red restringida.");
                }
            }
        } catch (UnknownHostException ex) {
            // En entornos sin DNS externo permitimos dominios públicos válidos si no coinciden con prefijos locales;
            // los literales IP (127.0.0.1, 169.254.x.x, ::1, etc.) se resuelven localmente sin DNS y sí se bloquean arriba.
        }

        return trimmed;
    }

    public static boolean isSafeExternalEndpoint(String rawEndpoint) {
        try {
            validateExternalHttpsEndpoint(rawEndpoint);
            return true;
        } catch (ApiException ex) {
            return false;
        }
    }

    private static boolean isDisallowedAddress(InetAddress address) {
        if (address.isAnyLocalAddress()
                || address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isMulticastAddress()) {
            return true;
        }

        byte[] raw = address.getAddress();
        if (raw.length == 4) {
            int first = raw[0] & 0xFF;
            int second = raw[1] & 0xFF;
            // Bloquear CGNAT 100.64.0.0/10 y bloque 0.0.0.0/8
            if (first == 0 || (first == 100 && second >= 64 && second <= 127)) {
                return true;
            }
        } else if (raw.length == 16) {
            int first = raw[0] & 0xFF;
            // Bloquear IPv6 Unique Local Address (fc00::/7)
            if ((first & 0xFE) == 0xFC) {
                return true;
            }
        }

        return false;
    }

    private static String stripIpv6Brackets(String host) {
        if (host.startsWith("[") && host.endsWith("]") && host.length() > 2) {
            return host.substring(1, host.length() - 1);
        }
        return host;
    }

    private static ApiException invalidEndpoint(String message) {
        return new ApiException(
                HttpStatus.BAD_REQUEST,
                "Endpoint Push inválido",
                message,
                "invalid-push-endpoint"
        );
    }
}
