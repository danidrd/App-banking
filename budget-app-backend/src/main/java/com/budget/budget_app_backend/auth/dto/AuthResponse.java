package com.budget.budget_app_backend.auth.dto;

public record AuthResponse(String token, String email, String nome) {
}