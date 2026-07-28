package com.budget.budget_app_backend.account.dto;

import java.math.BigDecimal;

public record CreateAccountRequest(
    String nome,
    String tipo,
    BigDecimal saldo,
    String valuta
) {
    public CreateAccountRequest(String nome, String tipo, BigDecimal saldo, String valuta) {
        this.nome = nome;
        this.tipo = tipo;
        this.saldo = saldo;
        this.valuta = valuta;
    }

    public String nome() {
        return nome;
    }

    public String tipo() {
        return tipo;
    }
    public String valuta() {
        return valuta;
    }
    public BigDecimal saldo() {
        return saldo;
    }
}