package com.budget.budget_app_backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank String token,
        @NotBlank @Size(min = 8, message = "La password deve avere almeno 8 caratteri") String nuovaPassword
) {
}