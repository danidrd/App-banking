package com.budget.budget_app_backend.transaction.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;


public record CreateTransactionRequest(
    @NotNull
    UUID accountId,
    UUID categoryId,
    @NotNull
    BigDecimal importo,
    String descrizione,
    @NotNull
    LocalDate data,
    Boolean ricorrente
) {     
}
