package com.budget.budget_app_backend.integration.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ImportedAccountDto(
        UUID id,
        String nome,
        String tipo,
        BigDecimal saldo,
        String valuta
) {
}