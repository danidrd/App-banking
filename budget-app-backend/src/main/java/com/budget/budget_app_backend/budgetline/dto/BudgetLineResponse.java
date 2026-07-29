package com.budget.budget_app_backend.budgetline.dto;

import java.util.UUID;
import java.math.BigDecimal;

public record BudgetLineResponse(
    UUID id,
    UUID categoryId,
    BigDecimal limite
) {   
}
