package com.budget.budget_app_backend.integration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record BalanceDto(
        String name,
        @JsonProperty("balance_amount") BalanceAmountDto balanceAmount,
        @JsonProperty("balance_type") String balanceType
) {
}