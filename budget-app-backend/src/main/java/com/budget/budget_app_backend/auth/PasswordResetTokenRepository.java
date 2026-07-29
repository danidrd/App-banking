package com.budget.budget_app_backend.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /** Invalida i reset precedenti quando l'utente ne richiede uno nuovo. */
    void deleteByUserId(UUID userId);
}