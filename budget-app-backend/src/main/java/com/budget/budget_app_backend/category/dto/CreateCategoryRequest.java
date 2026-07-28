package com.budget.budget_app_backend.category.dto;

import com.budget.budget_app_backend.category.CategoryType;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;

public record CreateCategoryRequest(
    @NotBlank(message = "Il nome della categoria non può essere vuoto")
    String nome,
    @NotNull
    CategoryType tipo
) {
    public CreateCategoryRequest(String nome, CategoryType tipo) {
        this.nome = nome;
        this.tipo = tipo;
    }

    public String nome() {
        return nome;
    }

    public CategoryType tipo() {
        return tipo;
    }
}
