package com.budget.budget_app_backend.integration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record StartAuthorizationResponse(
        String url,
        @JsonProperty("authorization_id") String authorizationId
) {
}