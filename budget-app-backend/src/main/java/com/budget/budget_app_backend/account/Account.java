package com.budget.budget_app_backend.account;

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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "accounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Nessuna relazione JPA per ora: l'entità BankConnection arriva
    // quando implementiamo la sincronizzazione bancaria (fase Open Banking)
    @Column(name = "bank_connection_id")
    private UUID bankConnectionId;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private String tipo;

    @Column(nullable = false)
    private BigDecimal saldo;

    @Column(nullable = false)
    private String valuta;

    /** Identificativo stabile del conto lato Enable Banking (uid): presente solo se collegato via Open Banking. */
    @Column(name = "external_uid")
    private String externalUid;

    /** IBAN reale del conto, quando disponibile (assente per sotto-conti/Spaces senza IBAN proprio, es. i vault N26). */
    @Column(name = "external_iban")
    private String externalIban;

    /** Quando questo conto è stato sincronizzato l'ultima volta (manualmente o dal job automatico). */
    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}