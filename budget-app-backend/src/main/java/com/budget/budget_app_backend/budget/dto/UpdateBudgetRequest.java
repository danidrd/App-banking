package com.budget.budget_app_backend.budget.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import com.budget.budget_app_backend.budgetline.dto.BudgetLineRequest;


public record UpdateBudgetRequest(
    @NotBlank
    String periodo,
    @NotNull
    LocalDate dataInizio,
    @NotNull
    LocalDate dataFine,
    @NotEmpty
    @Valid
    List<BudgetLineRequest> righe
) {
    
}
