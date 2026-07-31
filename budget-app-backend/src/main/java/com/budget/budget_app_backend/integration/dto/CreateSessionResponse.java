package com.budget.budget_app_backend.integration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CreateSessionResponse(
        @JsonProperty("session_id") String sessionId,
        List<EnableSessionAccount> accounts,
        EnableAspspRef aspsp
) {
}