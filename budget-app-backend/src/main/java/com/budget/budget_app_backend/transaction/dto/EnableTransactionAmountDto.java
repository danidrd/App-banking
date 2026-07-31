package com.budget.budget_app_backend.transaction.dto;

public record EnableTransactionAmountDto(
        String currency,
        String amount
) {
}