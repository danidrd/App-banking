package com.budget.budget_app_backend.integration.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/** Solo gli uid scelti: i dettagli dei conti li rileggiamo noi da Enable Banking, non ci fidiamo del client. */
public record ImportAccountsRequest(
        @NotEmpty List<String> selectedUids
) {
}