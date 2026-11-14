package com.calishome.api.auth;

public interface EmailSender {
    void sendEmailVerification(String toEmail, String fullName, String rawToken);

    void sendPasswordReset(String toEmail, String fullName, String rawToken);

    default void sendPaymentReceipt(
            String toEmail,
            String fullName,
            String planName,
            String formattedAmount,
            String reference) {
        // Implementación opcional para adaptadores de pruebas unitarias heredados
    }
}
