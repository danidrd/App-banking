package com.budget.budget_app_backend.integration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Rappresentazione minimale di una banca: ci basta per l'elenco/ricerca. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AspspDto(
        String name,
        String country
) {
}