package com.budget.budget_app_backend.auth;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

/**
 * Invio reale via SMTP. Attiva solo quando app.mail.enabled=true in
 * application.yml — altrimenti resta attivo LogPasswordResetLinkSender.
 */
@Component
@ConditionalOnProperty(prefix = "app.mail", name = "enabled", havingValue = "true")
public class SmtpPasswordResetLinkSender implements PasswordResetLinkSender {

    private static final Logger log = LoggerFactory.getLogger(SmtpPasswordResetLinkSender.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;

    public SmtpPasswordResetLinkSender(
            JavaMailSender mailSender,
            @Value("${spring.mail.username}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    @Override
    public void send(String email, String link) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(email);
            helper.setSubject("Reimposta la password di Budget");
            helper.setText(buildHtmlBody(link), true);

            mailSender.send(message);
            log.info("Email di reset inviata a {}", email);
        } catch (MessagingException | RuntimeException e) {
            // NON rilanciamo l'eccezione: forgotPassword() deve rispondere
            // sempre allo stesso identico modo (200, messaggio generico),
            // anche se l'invio reale fallisce. Se propagassimo l'errore,
            // un problema SMTP diventerebbe un segnale osservabile dall'
            // esterno ("questa email esiste ma l'invio è fallito" contro
            // "200 per qualunque cosa"), rompendo la protezione anti
            // user-enumeration che avevamo costruito. Logghiamo e basta:
            // è il posto giusto dove accorgersi di credenziali sbagliate
            // o del provider SMTP momentaneamente giù.
            log.error("Invio email di reset a {} non riuscito: {}", email, e.getMessage(), e);
        }
    }

    private String buildHtmlBody(String link) {
        return """
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
                  <h2 style="color: #0e6e52; margin: 0 0 8px;">Budget</h2>
                  <p style="color: #191d23; font-size: 15px; line-height: 1.5;">
                    Hai chiesto di reimpostare la password del tuo account.
                    Il link qui sotto è valido per 30 minuti.
                  </p>
                  <p style="margin: 24px 0;">
                    <a href="%s"
                       style="background: #0e6e52; color: #ffffff; text-decoration: none;
                              padding: 12px 22px; border-radius: 8px; font-weight: 600;
                              display: inline-block;">
                      Reimposta password
                    </a>
                  </p>
                  <p style="color: #6a7280; font-size: 13px; line-height: 1.5;">
                    Se non hai richiesto tu questa operazione, ignora pure questa
                    email: la tua password resterà invariata.
                  </p>
                </div>
                """.formatted(link);
    }
}