package com.budget.budget_app_backend.integration.dto;

import java.util.List;
import java.util.UUID;

public record CompleteConnectionResponse(
        UUID bankConnectionId,
        List<EnableSessionAccount> accounts
) {
}