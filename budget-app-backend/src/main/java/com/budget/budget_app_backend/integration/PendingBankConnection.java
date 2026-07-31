package com.budget.budget_app_backend.integration;

import com.budget.budget_app_backend.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Traccia un collegamento bancario avviato ma non ancora completato: fa
 * da ponte tra "l'utente ha cliccato collega banca" e "la banca ci ha
 * rimandato indietro code+state", che altrimenti non avremmo modo di
 * ricollegare all'utente giusto. Vita breve, va ripulita periodicamente.
 */
@Entity
@Table(name = "pending_bank_connections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PendingBankConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "state_token", nullable = false, unique = true)
    private String stateToken;

    @Column(name = "aspsp_name", nullable = false)
    private String aspspName;

    @Column(name = "aspsp_country", nullable = false)
    private String aspspCountry;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
}