package com.calishome.api.auth;

public interface GoogleTokenVerifier {
    GoogleUserClaims verify(String idToken);
}
