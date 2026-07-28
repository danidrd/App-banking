package com.budget.budget_app_backend.category.dto;

import com.budget.budget_app_backend.category.CategoryType;
import java.util.UUID;

public record CategoryResponse(
    UUID id,
    String nome,
    CategoryType tipo
) {
    public CategoryResponse(UUID id, String nome, CategoryType tipo) {
        this.id = id;
        this.nome = nome;
        this.tipo = tipo;
    }

    public UUID getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public CategoryType getTipo() {
        return tipo;
    }

    
}
