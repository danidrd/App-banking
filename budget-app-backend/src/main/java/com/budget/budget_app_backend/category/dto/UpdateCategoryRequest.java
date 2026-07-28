package com.budget.budget_app_backend.category.dto;

import com.budget.budget_app_backend.category.CategoryType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateCategoryRequest(
    @NotBlank(message = "Il nome della categoria non può essere vuoto")
    String nome,
    @NotNull
    CategoryType tipo
) {
    public UpdateCategoryRequest(String nome, CategoryType tipo) {
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
