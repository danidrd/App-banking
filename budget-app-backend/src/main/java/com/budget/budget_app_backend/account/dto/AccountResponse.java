package com.budget.budget_app_backend.account.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AccountResponse(
    UUID id,
    String nome,
    String tipo,
    BigDecimal saldo,
    String valuta,
    UUID bankConnectionId,
    Instant lastSyncedAt,
    Instant createdAt
) {

    public AccountResponse(UUID id, String nome, String tipo, BigDecimal saldo, String valuta, UUID bankConnectionId, Instant lastSyncedAt, Instant createdAt) {
        this.id = id;
        this.nome = nome;
        this.tipo = tipo;
        this.saldo = saldo;
        this.valuta = valuta;
        this.bankConnectionId = bankConnectionId;
        this.lastSyncedAt = lastSyncedAt;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getTipo() {
        return tipo;
    }

    public BigDecimal getSaldo() {
        return saldo;
    }

    public String getValuta() {
        return valuta;
    }

    public UUID getBankConnectionId() {
        return bankConnectionId;
    }

    public Instant getLastSyncedAt() {
        return lastSyncedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}