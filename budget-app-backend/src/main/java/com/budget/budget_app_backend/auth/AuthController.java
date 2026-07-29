package com.budget.budget_app_backend.auth;

import com.budget.budget_app_backend.auth.dto.AuthResponse;
import com.budget.budget_app_backend.auth.dto.ChangePasswordRequest;
import com.budget.budget_app_backend.auth.dto.ForgotPasswordRequest;
import com.budget.budget_app_backend.auth.dto.LoginRequest;
import com.budget.budget_app_backend.auth.dto.RegisterRequest;
import com.budget.budget_app_backend.auth.dto.ResetPasswordRequest;
import com.budget.budget_app_backend.security.CustomUserDetails;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.email());
        // Stessa risposta in ogni caso: vedi commento in AuthService.
        return Map.of("messaggio", "Se l'email è registrata, riceverai un link per reimpostare la password");
    }

    @PostMapping("/reset-password")
    public Map<String, String> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.token(), request.nuovaPassword());
        return Map.of("messaggio", "Password aggiornata. Ora puoi accedere con la nuova password.");
    }

    @PutMapping("/password")
    public Map<String, String> changePassword(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(
                userDetails.getUser().getId(),
                request.passwordAttuale(),
                request.nuovaPassword()
        );
        return Map.of("messaggio", "Password aggiornata");
    }
}