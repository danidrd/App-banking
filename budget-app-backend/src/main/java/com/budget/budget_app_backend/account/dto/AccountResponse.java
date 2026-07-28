package com.budget.budget_app_backend.account.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.Size;

public record AccountResponse(
    UUID id,
    String nome,
    String tipo,
    BigDecimal saldo,
    String valuta,
    UUID bankConnectionId,
    Instant createdAt
) {

    public AccountResponse(UUID id, String nome, String tipo, BigDecimal saldo, String valuta, UUID bankConnectionId, Instant createdAt) {
        this.id = id;
        this.nome = nome;
        this.tipo = tipo;
        this.saldo = saldo;
        this.valuta = valuta;
        this.bankConnectionId = bankConnectionId;
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

    public Instant getCreatedAt() {
        return createdAt;
    }
}
