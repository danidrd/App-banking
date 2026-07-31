package com.budget.budget_app_backend.integration;

import com.budget.budget_app_backend.integration.dto.AspspDto;
import com.budget.budget_app_backend.integration.dto.BankConnectionSummary;
import com.budget.budget_app_backend.integration.dto.CompleteConnectionRequest;
import com.budget.budget_app_backend.integration.dto.CompleteConnectionResponse;
import com.budget.budget_app_backend.integration.dto.ImportAccountsRequest;
import com.budget.budget_app_backend.integration.dto.ImportedAccountDto;
import com.budget.budget_app_backend.integration.dto.StartConnectionRequest;
import com.budget.budget_app_backend.security.CustomUserDetails;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/integration")
public class IntegrationController {

    private final IntegrationService integrationService;
    private final BankSyncService bankSyncService;
    private final String frontendBaseUrl;

    public IntegrationController(
            IntegrationService integrationService,
            BankSyncService bankSyncService,
            @org.springframework.beans.factory.annotation.Value("${app.frontend-base-url}") String frontendBaseUrl) {
        this.integrationService = integrationService;
        this.bankSyncService = bankSyncService;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @GetMapping("/aspsps")
    public List<AspspDto> listAspsps(@RequestParam String country) {
        return integrationService.listAspsps(country);
    }

    @GetMapping("/connections")
    public List<BankConnectionSummary> listConnections(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return integrationService.listConnections(userDetails.getUser().getId());
    }

    @PostMapping("/connections")
    public Map<String, String> startConnection(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody StartConnectionRequest request) {
        String authorizationUrl = integrationService.startConnection(
                userDetails.getUser().getId(), request.aspspName(), request.aspspCountry());
        return Map.of("authorizationUrl", authorizationUrl);
    }

    @PostMapping("/connections/complete")
    public CompleteConnectionResponse completeConnection(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CompleteConnectionRequest request) {
        return integrationService.completeConnection(
                userDetails.getUser().getId(), request.code(), request.state());
    }

    @PostMapping("/connections/{id}/import")
    public List<ImportedAccountDto> importAccounts(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody ImportAccountsRequest request) {
        return integrationService.importAccounts(
                userDetails.getUser().getId(), id, request.selectedUids());
    }

    /** Sincronizzazione manuale: scarica le transazioni nuove del conto e ne aggiorna il saldo. */
    @PostMapping("/accounts/{accountId}/sync")
    public Map<String, Integer> syncAccount(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID accountId) {
        int imported = bankSyncService.syncAccount(userDetails.getUser().getId(), accountId);
        return Map.of("imported", imported);
    }

    /** Scollega davvero la banca: revoca il consenso presso Enable Banking, non solo lato nostro. */
    @PostMapping("/connections/{id}/disconnect")
    public Map<String, String> disconnectBank(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID id) {
        integrationService.disconnectBank(userDetails.getUser().getId(), id);
        return Map.of("messaggio", "Collegamento revocato");
    }

    /**
     * Ricalcola solo il riconoscimento dei trasferimenti interni, senza
     * contattare la banca — utile per applicare la logica a transazioni
     * già importate in precedenza (es. prima che questa funzionalità
     * esistesse), senza consumare nessuna chiamata verso Enable Banking.
     */
    @PostMapping("/match-transfers")
    public Map<String, Integer> matchTransfers(@AuthenticationPrincipal CustomUserDetails userDetails) {
        int matched = bankSyncService.matchInternalTransfers(userDetails.getUser().getId());
        return Map.of("matched", matched);
    }

    /**
     * Endpoint PUBBLICO — va aggiunto a permitAll in SecurityConfig.
     * È qui che la banca reindirizza il browser dopo il login: nessun
     * token disponibile a questo punto (non siamo dentro l'app). L'unico
     * compito di questa pagina è "passare la palla" all'app nativa
     * tramite il deep link budgetapp://, dato che Enable Banking richiede
     * un redirect HTTPS e non accetta direttamente uno schema personalizzato.
     */
    @GetMapping(value = "/bridge", produces = MediaType.TEXT_HTML_VALUE)
    public String bridge(@RequestParam String code, @RequestParam String state) {
        String deepLink = "budgetapp://app/bank-callback?code=" + code + "&state=" + state;
        String webLink = frontendBaseUrl + "/bank-callback?code=" + code + "&state=" + state;
        return """
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"><title>Budget</title></head>
                <body>
                <p>Completamento in corso, torna all'app...</p>
                <p>Se non succede nulla automaticamente, <a href="%s">continua da qui</a>.</p>
                <script>window.location.href = "%s";</script>
                </body>
                </html>
                """.formatted(webLink, deepLink);
    }
}