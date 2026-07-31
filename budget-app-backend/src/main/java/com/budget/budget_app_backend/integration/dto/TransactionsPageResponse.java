package com.budget.budget_app_backend.integration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.budget.budget_app_backend.transaction.dto.EnableTransactionDto;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TransactionsPageResponse(
        List<EnableTransactionDto> transactions,
        @JsonProperty("continuation_key") String continuationKey
) {
}