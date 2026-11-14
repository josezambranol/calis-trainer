package com.calishome.api.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class SmtpOrLoggingEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(SmtpOrLoggingEmailSender.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final AuthProperties authProperties;
    private final String mailHost;
    private final String mailFrom;

    public SmtpOrLoggingEmailSender(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            AuthProperties authProperties,
            @Value("${spring.mail.host:}") String mailHost,
            @Value("${app.mail.from:no-reply@calishome.app}") String mailFrom) {
        this.mailSenderProvider = mailSenderProvider;
        this.authProperties = authProperties;
        this.mailHost = mailHost;
        this.mailFrom = mailFrom;
    }

    @Override
    public void sendEmailVerification(String toEmail, String fullName, String rawToken) {
        String link = authProperties.frontendUrl() + "/verify-email?token=" + rawToken;
        String subject = "Verifica tu cuenta en CalisHome";
        String body = "Hola " + fullName + ",\n\n"
                + "Confirma tu correo haciendo clic en el siguiente enlace (válido por 24 horas):\n"
                + link + "\n\n"
                + "Si no creaste esta cuenta, ignora este mensaje.";
        dispatch(toEmail, subject, body, "EMAIL_VERIFICATION");
    }

    @Override
    public void sendPasswordReset(String toEmail, String fullName, String rawToken) {
        String link = authProperties.frontendUrl() + "/reset-password?token=" + rawToken;
        String subject = "Recupera tu contraseña en CalisHome";
        String body = "Hola " + fullName + ",\n\n"
                + "Usa este enlace de un solo uso para restablecer tu contraseña (válido por 1 hora):\n"
                + link + "\n\n"
                + "Si no solicitaste este cambio, ignora este mensaje.";
        dispatch(toEmail, subject, body, "PASSWORD_RESET");
    }

    @Override
    public void sendPaymentReceipt(
            String toEmail,
            String fullName,
            String planName,
            String formattedAmount,
            String reference) {
        String subject = "Recibo de suscripción CalisHome (" + planName + ")";
        String body = "Hola " + fullName + ",\n\n"
                + "Tu pago ha sido confirmado exitosamente:\n"
                + "- Plan: " + planName + "\n"
                + "- Monto: " + formattedAmount + "\n"
                + "- Referencia: " + reference + "\n\n"
                + "Ya tienes acceso completo a CalisHome Pro.\n"
                + "Puedes gestionar tu suscripción en: " + authProperties.frontendUrl() + "/plans";
        dispatch(toEmail, subject, body, "PAYMENT_RECEIPT");
    }

    private void dispatch(String toEmail, String subject, String body, String type) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender != null && mailHost != null && !mailHost.isBlank()) {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Transactional email sent type={}", type);
        } else {
            // En dev/test sin SMTP real nunca exponemos el token en logs de INFO/WARN de prod
            log.debug("Simulated transactional email type={} subject={}", type, subject);
        }
    }
}
