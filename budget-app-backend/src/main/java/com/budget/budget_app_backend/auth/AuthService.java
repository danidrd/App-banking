package com.budget.budget_app_backend.auth;

import com.budget.budget_app_backend.auth.dto.AuthResponse;
import com.budget.budget_app_backend.auth.dto.LoginRequest;
import com.budget.budget_app_backend.auth.dto.RegisterRequest;
import com.budget.budget_app_backend.security.CustomUserDetails;
import com.budget.budget_app_backend.security.JwtService;
import com.budget.budget_app_backend.user.User;
import com.budget.budget_app_backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email già registrata");
        }

        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .nome(request.nome())
                .build();

        userRepository.save(user);

        String token = jwtService.generateToken(new CustomUserDetails(user));
        return new AuthResponse(token, user.getEmail(), user.getNome());
    }

    public AuthResponse login(LoginRequest request) {
        // Se le credenziali sono sbagliate, lancia BadCredentialsException:
        // la gestiamo nel GlobalExceptionHandler per restituire un 401 pulito.
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = userRepository.findByEmail(request.email()).orElseThrow();

        String token = jwtService.generateToken(new CustomUserDetails(user));
        return new AuthResponse(token, user.getEmail(), user.getNome());
    }
}