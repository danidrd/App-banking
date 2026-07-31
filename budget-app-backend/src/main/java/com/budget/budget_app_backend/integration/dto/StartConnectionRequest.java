package com.budget.budget_app_backend.integration.dto;

import jakarta.validation.constraints.NotBlank;

public record StartConnectionRequest(
        @NotBlank String aspspName,
        @NotBlank String aspspCountry
) {
}