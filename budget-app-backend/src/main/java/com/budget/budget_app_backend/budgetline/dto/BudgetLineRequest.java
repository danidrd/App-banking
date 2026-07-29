package com.budget.budget_app_backend.budgetline.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;

public record BudgetLineRequest(
    @NotNull
    UUID categoryId,
    @NotNull
    @Positive
    BigDecimal limite
) {
}