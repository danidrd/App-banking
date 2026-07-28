package com.budget.budget_app_backend.account.dto;

import jakarta.validation.constraints.Size;

public record UpdateAccountRequest(
    String nome,
    String tipo,
    @Size(min=3, max=3, message="La valuta deve essere di 3 caratteri")
    String valuta
) {
    public UpdateAccountRequest(String nome, String tipo, String valuta) {
        this.nome = nome;
        this.tipo = tipo;
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

    
}
