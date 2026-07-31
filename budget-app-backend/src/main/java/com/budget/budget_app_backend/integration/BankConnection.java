package com.budget.budget_app_backend.integration;

import com.budget.budget_app_backend.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
 * Mappa bank_connections così com'è da V1 (pensata in origine per un
 * flusso OAuth classico), riusando le colonne esistenti con nomi Java
 * più aderenti a Enable Banking:
 *
 *   provider      -> aspspName    (es. "Isybank")
 *   access_token  -> sessionId    (qui ci mettiamo il session_id di Enable Banking)
 *   refresh_token -> refreshToken (non usato con Enable Banking: resta sempre null)
 *   expires_at    -> validUntil
 *
 * aspsp_country e status sono le uniche colonne genuinamente nuove,
 * aggiunte da V3.
 */
@Entity
@Table(name = "bank_connections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BankConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "provider", nullable = false)
    private String aspspName;

    @Column(name = "aspsp_country")
    private String aspspCountry;

    /** Qui ci mettiamo il session_id di Enable Banking (colonna pensata in origine per un access_token OAuth). */
    @Column(name = "access_token", nullable = false)
    private String sessionId;

    /** Non usato con Enable Banking: resta sempre null. Esiste solo perché la colonna è già in V1. */
    @Column(name = "refresh_token")
    private String refreshToken;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private BankConnectionStatus status;

    /** Scadenza del consenso (tipicamente 90 giorni): oltre questa data va rinnovato. */
    @Column(name = "expires_at")
    private Instant validUntil;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}