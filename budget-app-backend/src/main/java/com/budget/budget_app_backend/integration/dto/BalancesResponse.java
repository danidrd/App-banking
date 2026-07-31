package com.budget.budget_app_backend.integration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record BalancesResponse(
        List<BalanceDto> balances
) {
}