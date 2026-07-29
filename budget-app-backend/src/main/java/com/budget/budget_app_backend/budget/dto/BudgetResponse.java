package com.budget.budget_app_backend.budget.dto;

import java.util.UUID;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import com.budget.budget_app_backend.budgetline.dto.BudgetLineResponse;

public record BudgetResponse(
    UUID id,
    String periodo,
    LocalDate dataInizio,
    LocalDate dataFine,
    Instant createdAt,
    List<BudgetLineResponse> righe
) {
    
}
