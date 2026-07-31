package com.budget.budget_app_backend.integration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EnableSessionAccount(
        @JsonProperty("account_id") EnableAccountId accountId,
        String uid,
        String name,
        String details,
        String product,
        String currency
) {
}