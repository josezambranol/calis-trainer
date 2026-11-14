package com.calishome.api.auth;

public interface EmailSender {
    void sendEmailVerification(String toEmail, String fullName, String rawToken);

    void sendPasswordReset(String toEmail, String fullName, String rawToken);
}
