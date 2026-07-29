package com.budget.budget_app_backend.auth;

import com.budget.budget_app_backend.auth.dto.AuthResponse;
import com.budget.budget_app_backend.auth.dto.LoginRequest;
import com.budget.budget_app_backend.auth.dto.RegisterRequest;
import com.budget.budget_app_backend.common.ResourceNotFoundException;
import com.budget.budget_app_backend.security.CustomUserDetails;
import com.budget.budget_app_backend.security.JwtService;
import com.budget.budget_app_backend.user.User;
import com.budget.budget_app_backend.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class AuthService {

    private static final int RESET_TOKEN_VALIDITY_MINUTES = 30;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordResetLinkSender resetLinkSender;
    private final String frontendBaseUrl;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            PasswordResetTokenRepository resetTokenRepository,
            PasswordResetLinkSender resetLinkSender,
            @Value("${app.frontend-base-url}") String frontendBaseUrl) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.resetTokenRepository = resetTokenRepository;
        this.resetLinkSender = resetLinkSender;
        this.frontendBaseUrl = frontendBaseUrl;
    }

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

    /**
     * Richiesta di reset: risponde SEMPRE allo stesso modo, che l'email
     * esista o no — altrimenti l'endpoint diventerebbe un oracolo per
     * scoprire quali email sono registrate (user enumeration).
     */
    @Transactional
    public void forgotPassword(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            resetTokenRepository.deleteByUserId(user.getId());

            String rawToken = generateRawToken();
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .user(user)
                    .tokenHash(sha256Hex(rawToken))
                    .expiresAt(Instant.now().plus(RESET_TOKEN_VALIDITY_MINUTES, ChronoUnit.MINUTES))
                    .build();
            resetTokenRepository.save(resetToken);

            String link = frontendBaseUrl + "/reset-password?token=" + rawToken;
            resetLinkSender.send(user.getEmail(), link);
        });
    }

    /**
     * Un solo messaggio d'errore per tutti i casi (inesistente, scaduto,
     * già usato): distinguere aiuterebbe solo chi prova token a caso.
     */
    @Transactional
    public void resetPassword(String rawToken, String nuovaPassword) {
        PasswordResetToken resetToken = resetTokenRepository.findByTokenHash(sha256Hex(rawToken))
                .filter(t -> t.getUsedAt() == null)
                .filter(t -> t.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new IllegalArgumentException("Link non valido o scaduto"));

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(nuovaPassword));
        resetToken.setUsedAt(Instant.now());

        userRepository.save(user);
        resetTokenRepository.save(resetToken);
    }

    public void changePassword(UUID userId, String passwordAttuale, String nuovaPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utente non trovato"));

        // Mai confrontare le password come stringhe: matches() confronta
        // l'hash BCrypt nel modo corretto.
        if (!passwordEncoder.matches(passwordAttuale, user.getPasswordHash())) {
            throw new IllegalArgumentException("La password attuale non è corretta");
        }

        user.setPasswordHash(passwordEncoder.encode(nuovaPassword));
        userRepository.save(user);
    }

    /** 32 byte crittograficamente casuali, in Base64-URL: è il token che va nel link. */
    private String generateRawToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 non disponibile", e);
        }
    }
}