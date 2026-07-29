package com.budget.budget_app_backend.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Implementazione di sviluppo: logga il link invece di inviarlo davvero.
 * Attiva di default (matchIfMissing = true) finché app.mail.enabled non
 * viene impostato a true in application.yml — a quel punto prende il
 * posto SmtpPasswordResetLinkSender, senza toccare AuthService.
 */
@Component
@ConditionalOnProperty(prefix = "app.mail", name = "enabled", havingValue = "false", matchIfMissing = true)
public class LogPasswordResetLinkSender implements PasswordResetLinkSender {

    private static final Logger log = LoggerFactory.getLogger(LogPasswordResetLinkSender.class);

    @Override
    public void send(String email, String link) {
        log.info("""

                ==================== RESET PASSWORD ====================
                Destinatario: {}
                Link (valido 30 minuti):
                {}
                ========================================================""",
                email, link);
    }
}