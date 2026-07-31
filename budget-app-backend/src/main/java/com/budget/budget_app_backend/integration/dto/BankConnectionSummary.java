package com.budget.budget_app_backend.integration.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BankConnectionSummary(
        UUID id,
        String aspspName,
        String aspspCountry,
        String status,
        Instant validUntil,
        List<String> linkedAccountNames
) {
}