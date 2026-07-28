package com.budget.budget_app_backend.transaction.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record UpdateTransactionRequest(
    UUID categoryId,
    String descrizione,
    @NotNull
    BigDecimal importo,
    @NotNull
    LocalDate data,
    Boolean ricorrente
) {
}