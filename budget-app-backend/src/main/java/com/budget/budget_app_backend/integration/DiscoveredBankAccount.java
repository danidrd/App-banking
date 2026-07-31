package com.budget.budget_app_backend.integration;

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

import java.util.UUID;

/**
 * Uno dei conti trovati durante il completamento di un collegamento
 * bancario, salvato così com'era in quel momento (nome, IBAN, valuta).
 * Serve per l'importazione successiva: GET /sessions/{id} di Enable
 * Banking restituisce solo gli uid, non i dettagli completi, quindi li
 * conserviamo qui invece di doverli richiedere di nuovo in un formato
 * diverso.
 */
@Entity
@Table(name = "discovered_bank_accounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiscoveredBankAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bank_connection_id", nullable = false)
    private BankConnection bankConnection;

    @Column(name = "external_uid", nullable = false)
    private String externalUid;

    @Column(name = "iban")
    private String iban;

    @Column(name = "name")
    private String name;

    @Column(name = "details")
    private String details;

    @Column(name = "currency")
    private String currency;
}