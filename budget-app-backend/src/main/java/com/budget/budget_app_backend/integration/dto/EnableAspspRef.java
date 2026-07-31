package com.budget.budget_app_backend.integration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EnableAspspRef(
        String name,
        String country
) {
}