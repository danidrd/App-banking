package com.budget.budget_app_backend.integration.dto;

import jakarta.validation.constraints.NotBlank;

public record CompleteConnectionRequest(
        @NotBlank String code,
        @NotBlank String state
) {
}