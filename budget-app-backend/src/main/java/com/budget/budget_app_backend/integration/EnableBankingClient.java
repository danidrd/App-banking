package com.budget.budget_app_backend.integration;

import com.budget.budget_app_backend.integration.dto.AspspsResponse;
import com.budget.budget_app_backend.integration.dto.BalancesResponse;
import com.budget.budget_app_backend.integration.dto.CreateSessionResponse;
import com.budget.budget_app_backend.integration.dto.SessionDetailsResponse;
import com.budget.budget_app_backend.integration.dto.StartAuthorizationResponse;
import com.budget.budget_app_backend.integration.dto.TransactionsPageResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/**
 * Wrapper sottile sulle chiamate a api.enablebanking.com che ci servono.
 * Ogni chiamata genera un JWT fresco (valido pochi minuti, non ha senso
 * riusarlo) tramite EnableBankingJwtService.
 */
@Component
public class EnableBankingClient {

    private final EnableBankingJwtService jwtService;
    private final RestClient restClient;

    public EnableBankingClient(
            EnableBankingJwtService jwtService,
            @Value("${app.enablebanking.base-url}") String baseUrl) {
        this.jwtService = jwtService;
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    /** Elenco delle banche disponibili per un paese (codice ISO a 2 lettere, es. "IT"). */
    public List<com.budget.budget_app_backend.integration.dto.AspspDto> listAspsps(String country) {
        AspspsResponse response = restClient.get()
                .uri("/aspsps?country={country}", country)
                .headers(this::authHeaders)
                .retrieve()
                .body(AspspsResponse.class);
        return response != null ? response.aspsps() : List.of();
    }

    /**
     * Avvia l'autorizzazione verso una banca. Restituisce l'URL a cui
     * mandare l'utente per autenticarsi (pagina della banca stessa).
     *
     * @param redirectUrl deve essere HTTPS: qui passiamo il nostro
     *                     endpoint "ponte" (vedi IntegrationController),
     *                     non lo schema personalizzato dell'app.
     */
    public StartAuthorizationResponse startAuthorization(
            String aspspName, String aspspCountry, String redirectUrl, String state) {

        Instant validUntil = Instant.now().plus(90, ChronoUnit.DAYS);

        Map<String, Object> body = Map.of(
                "access", Map.of("valid_until", validUntil.toString()),
                "aspsp", Map.of("name", aspspName, "country", aspspCountry),
                "state", state,
                "redirect_url", redirectUrl,
                "psu_type", "personal"
        );

        return restClient.post()
                .uri("/auth")
                .headers(this::authHeaders)
                .body(body)
                .retrieve()
                .body(StartAuthorizationResponse.class);
    }

    /** Scambia il codice ricevuto dalla banca con una sessione vera e propria. */
    public CreateSessionResponse createSession(String code) {
        return restClient.post()
                .uri("/sessions")
                .headers(this::authHeaders)
                .body(Map.of("code", code))
                .retrieve()
                .body(CreateSessionResponse.class);
    }

    /**
     * Dettagli "leggeri" di una sessione già creata: a differenza di
     * createSession, qui "accounts" è solo un elenco di uid, non oggetti
     * completi — verificato empiricamente, non è un'assunzione.
     */
    public SessionDetailsResponse getSession(String sessionId) {
        return restClient.get()
                .uri("/sessions/{id}", sessionId)
                .headers(this::authHeaders)
                .retrieve()
                .body(SessionDetailsResponse.class);
    }

    /** Saldi di un conto specifico (identificato dal suo uid stabile). */
    public BalancesResponse getAccountBalances(String accountUid) {
        return restClient.get()
                .uri("/accounts/{uid}/balances", accountUid)
                .headers(this::authHeaders)
                .retrieve()
                .body(BalancesResponse.class);
    }

    /**
     * Una pagina di transazioni per il conto. Se continuationKey è null,
     * richiede la prima pagina; altrimenti prosegue da dove indicato dalla
     * pagina precedente (vedi TransactionsPageResponse.continuationKey).
     */
    public TransactionsPageResponse getAccountTransactions(String accountUid, String continuationKey) {
        if (continuationKey == null) {
            return restClient.get()
                    .uri("/accounts/{uid}/transactions", accountUid)
                    .headers(this::authHeaders)
                    .retrieve()
                    .body(TransactionsPageResponse.class);
        }
        return restClient.get()
                .uri("/accounts/{uid}/transactions?continuation_key={key}", accountUid, continuationKey)
                .headers(this::authHeaders)
                .retrieve()
                .body(TransactionsPageResponse.class);
    }

    /**
     * Revoca davvero il consenso presso Enable Banking/la banca — non solo
     * lato nostro. "Il consenso della banca verrà chiuso automaticamente,
     * se possibile" (documentazione ufficiale dell'endpoint).
     */
    public void deleteSession(String sessionId) {
        restClient.delete()
                .uri("/sessions/{id}", sessionId)
                .headers(this::authHeaders)
                .retrieve()
                .toBodilessEntity();
    }

    private void authHeaders(org.springframework.http.HttpHeaders headers) {
        headers.setBearerAuth(jwtService.generateJwt(3600));
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
    }
}