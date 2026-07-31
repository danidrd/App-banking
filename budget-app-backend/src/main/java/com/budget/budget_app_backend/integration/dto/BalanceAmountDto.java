package com.budget.budget_app_backend.integration.dto;

public record BalanceAmountDto(
        String currency,
        String amount
) {
}