package com.budget.budget_app_backend.auth;

/**
 * Astrazione sul "postino" del link di reset. Oggi l'unica implementazione
 * logga il link in console (sviluppo); quando servirà l'email vera basterà
 * aggiungere un'implementazione SMTP senza toccare AuthService.
 */
public interface PasswordResetLinkSender {

    void send(String email, String link);
}