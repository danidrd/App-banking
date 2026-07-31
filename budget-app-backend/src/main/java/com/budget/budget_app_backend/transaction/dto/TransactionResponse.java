package com.budget.budget_app_backend.transaction.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import java.time.Instant;


public record TransactionResponse(
    UUID accountId,
    UUID categoryId,
    UUID id,
    BigDecimal importo,
    String descrizione,
    LocalDate data,
    Boolean ricorrente,
    Boolean trasferimentoInterno,
    Instant createdAt
) {
}