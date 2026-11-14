package com.calishome.api.auth;

import com.calishome.api.common.web.ApiException;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

@Component
public class NimbusGoogleTokenVerifier implements GoogleTokenVerifier {

    private static final String GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> VALID_ISSUERS = Set.of("https://accounts.google.com", "accounts.google.com");

    private final AuthProperties authProperties;
    private volatile JwtDecoder googleDecoder;

    public NimbusGoogleTokenVerifier(AuthProperties authProperties) {
        this.authProperties = authProperties;
    }

    @Override
    public GoogleUserClaims verify(String idToken) {
        String expectedClientId = authProperties.google() != null ? authProperties.google().clientId() : "";
        if (expectedClientId == null || expectedClientId.isBlank()) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Google OAuth no configurado",
                    "El inicio de sesión con Google no está configurado en este entorno.",
                    "google-oauth-not-configured"
            );
        }

        try {
            Jwt jwt = getOrCreateDecoder(expectedClientId).decode(idToken);
            String sub = jwt.getSubject();
            String email = jwt.getClaimAsString("email");
            Boolean emailVerified = jwt.getClaimAsBoolean("email_verified");
            String name = jwt.getClaimAsString("name");

            if (sub == null || sub.isBlank() || email == null || email.isBlank()) {
                throw new ApiException(
                        HttpStatus.UNAUTHORIZED,
                        "Token de Google inválido",
                        "El token de Google no contiene la identidad requerida.",
                        "invalid-google-token"
                );
            }
            if (!Boolean.TRUE.equals(emailVerified)) {
                throw new ApiException(
                        HttpStatus.UNAUTHORIZED,
                        "Correo de Google no verificado",
                        "Tu cuenta de Google debe tener el correo verificado.",
                        "google-email-unverified"
                );
            }

            String resolvedName = (name != null && !name.isBlank()) ? name : email.split("@")[0];
            return new GoogleUserClaims(sub, email.toLowerCase(), true, resolvedName);
        } catch (JwtException ex) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "Token de Google inválido",
                    "No se pudo verificar el token de Google.",
                    "invalid-google-token"
            );
        }
    }

    private JwtDecoder getOrCreateDecoder(String expectedClientId) {
        if (googleDecoder == null) {
            synchronized (this) {
                if (googleDecoder == null) {
                    NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWKS_URI).build();
                    OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
                            new JwtTimestampValidator(),
                            jwt -> {
                                String issuer = jwt.getIssuer() != null ? jwt.getIssuer().toString() : "";
                                if (!VALID_ISSUERS.contains(issuer)) {
                                    return OAuth2TokenValidatorResult.failure(
                                            new OAuth2Error("invalid_issuer", "Invalid Google issuer", null));
                                }
                                List<String> audience = jwt.getAudience();
                                if (audience == null || !audience.contains(expectedClientId)) {
                                    return OAuth2TokenValidatorResult.failure(
                                            new OAuth2Error("invalid_audience", "Invalid Google audience", null));
                                }
                                return OAuth2TokenValidatorResult.success();
                            }
                    );
                    decoder.setJwtValidator(validator);
                    googleDecoder = decoder;
                }
            }
        }
        return googleDecoder;
    }
}
