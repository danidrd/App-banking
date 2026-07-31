package com.budget.budget_app_backend.integration;

import com.budget.budget_app_backend.account.Account;
import com.budget.budget_app_backend.account.AccountRepository;
import com.budget.budget_app_backend.common.ResourceNotFoundException;
import com.budget.budget_app_backend.integration.dto.AspspDto;
import com.budget.budget_app_backend.integration.dto.BalancesResponse;
import com.budget.budget_app_backend.integration.dto.BankConnectionSummary;
import com.budget.budget_app_backend.integration.dto.CompleteConnectionResponse;
import com.budget.budget_app_backend.integration.dto.CreateSessionResponse;
import com.budget.budget_app_backend.integration.dto.EnableSessionAccount;
import com.budget.budget_app_backend.integration.dto.ImportedAccountDto;
import com.budget.budget_app_backend.integration.dto.StartAuthorizationResponse;
import com.budget.budget_app_backend.user.User;
import com.budget.budget_app_backend.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
public class IntegrationService {

    private static final int STATE_VALIDITY_MINUTES = 15;
    private static final int CONSENT_VALIDITY_DAYS = 90;

    private final EnableBankingClient enableBankingClient;
    private final PendingBankConnectionRepository pendingRepository;
    private final BankConnectionRepository bankConnectionRepository;
    private final DiscoveredBankAccountRepository discoveredAccountRepository;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final String bridgeUrl;

    public IntegrationService(
            EnableBankingClient enableBankingClient,
            PendingBankConnectionRepository pendingRepository,
            BankConnectionRepository bankConnectionRepository,
            DiscoveredBankAccountRepository discoveredAccountRepository,
            UserRepository userRepository,
            AccountRepository accountRepository,
            @Value("${app.enablebanking.bridge-url}") String bridgeUrl) {
        this.enableBankingClient = enableBankingClient;
        this.pendingRepository = pendingRepository;
        this.bankConnectionRepository = bankConnectionRepository;
        this.discoveredAccountRepository = discoveredAccountRepository;
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.bridgeUrl = bridgeUrl;
    }

    public List<AspspDto> listAspsps(String country) {
        return enableBankingClient.listAspsps(country);
    }

    /**
     * Avvia il collegamento: crea un token di stato temporaneo (stesso
     * meccanismo del reset password: SecureRandom + Base64url) e chiede
     * a Enable Banking l'URL di autenticazione della banca scelta.
     */
    @Transactional
    public String startConnection(UUID userId, String aspspName, String aspspCountry) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utente non trovato"));

        String state = generateStateToken();
        PendingBankConnection pending = PendingBankConnection.builder()
                .user(user)
                .stateToken(state)
                .aspspName(aspspName)
                .aspspCountry(aspspCountry)
                .expiresAt(Instant.now().plus(STATE_VALIDITY_MINUTES, ChronoUnit.MINUTES))
                .build();
        pendingRepository.save(pending);

        StartAuthorizationResponse response = enableBankingClient.startAuthorization(
                aspspName, aspspCountry, bridgeUrl, state);
        return response.url();
    }

    /**
     * Completa il collegamento: valida lo state, crea la sessione vera
     * presso Enable Banking, salva il BankConnection e SALVA ANCHE i conti
     * trovati (tabella discovered_bank_accounts) — ci serviranno di nuovo
     * in importAccounts, e GET /sessions/{id} non li ridà più in questa
     * forma completa (solo gli uid, vedi SessionDetailsResponse).
     */
    @Transactional
    public CompleteConnectionResponse completeConnection(UUID userId, String code, String state) {
        PendingBankConnection pending = pendingRepository.findByStateToken(state)
                .filter(p -> p.getUser().getId().equals(userId))
                .filter(p -> p.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new IllegalArgumentException("Collegamento non valido o scaduto"));

        CreateSessionResponse session = enableBankingClient.createSession(code);

        BankConnection connection = BankConnection.builder()
                .user(pending.getUser())
                .aspspName(pending.getAspspName())
                .aspspCountry(pending.getAspspCountry())
                .sessionId(session.sessionId())
                .status(BankConnectionStatus.ACTIVE)
                .validUntil(Instant.now().plus(CONSENT_VALIDITY_DAYS, ChronoUnit.DAYS))
                .build();
        bankConnectionRepository.save(connection);

        for (EnableSessionAccount sessionAccount : session.accounts()) {
            DiscoveredBankAccount discovered = DiscoveredBankAccount.builder()
                    .bankConnection(connection)
                    .externalUid(sessionAccount.uid())
                    .iban(sessionAccount.accountId() != null ? sessionAccount.accountId().iban() : null)
                    .name(sessionAccount.name())
                    .details(sessionAccount.details())
                    .currency(sessionAccount.currency())
                    .build();
            discoveredAccountRepository.save(discovered);
        }

        pendingRepository.delete(pending);

        return new CompleteConnectionResponse(connection.getId(), session.accounts());
    }

    /**
     * Importa i conti scelti, leggendo i dettagli da discovered_bank_accounts
     * (salvati in completeConnection) invece di richiamare Enable Banking
     * di nuovo — evitiamo così l'endpoint GET /sessions/{id} che restituisce
     * solo gli uid, non i dettagli completi.
     */
    @Transactional
    public List<ImportedAccountDto> importAccounts(UUID userId, UUID bankConnectionId, List<String> selectedUids) {
        BankConnection connection = bankConnectionRepository.findById(bankConnectionId)
                .filter(c -> c.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Collegamento bancario non trovato"));

        List<DiscoveredBankAccount> discovered = discoveredAccountRepository.findByBankConnectionId(bankConnectionId);

        List<ImportedAccountDto> imported = new ArrayList<>();
        for (DiscoveredBankAccount discoveredAccount : discovered) {
            if (!selectedUids.contains(discoveredAccount.getExternalUid())) {
                continue;
            }
            boolean alreadyImported = accountRepository
                    .findByUserIdAndExternalUid(userId, discoveredAccount.getExternalUid())
                    .isPresent();
            if (alreadyImported) {
                continue;
            }

            String nome = pickAccountName(
                    discoveredAccount.getName(),
                    discoveredAccount.getDetails(),
                    connection.getUser().getNome(),
                    connection.getAspspName());
            String valuta = discoveredAccount.getCurrency() != null ? discoveredAccount.getCurrency() : "EUR";

            Account account = Account.builder()
                    .user(connection.getUser())
                    .bankConnectionId(connection.getId())
                    .nome(nome)
                    .tipo("corrente")
                    .saldo(fetchInitialBalance(discoveredAccount.getExternalUid()))
                    .valuta(valuta)
                    .externalUid(discoveredAccount.getExternalUid())
                    .externalIban(discoveredAccount.getIban())
                    .build();
            accountRepository.save(account);

            imported.add(new ImportedAccountDto(
                    account.getId(), account.getNome(), account.getTipo(),
                    account.getSaldo(), account.getValuta()));
        }

        return imported;
    }

    /**
     * Saldo iniziale del conto al momento dell'importazione. Semplificazione
     * consapevole: alcune banche espongono più tipi di saldo — qui prendiamo
     * il primo restituito, va bene come valore di partenza; il job di
     * sincronizzazione (fase 3) lo terrà aggiornato. Se la chiamata fallisce
     * per qualunque motivo, non blocchiamo l'importazione: partiamo da zero.
     */
    private BigDecimal fetchInitialBalance(String accountUid) {
        try {
            BalancesResponse balances = enableBankingClient.getAccountBalances(accountUid);
            if (balances == null || balances.balances() == null || balances.balances().isEmpty()) {
                return BigDecimal.ZERO;
            }
            String amount = balances.balances().get(0).balanceAmount().amount();
            return new BigDecimal(amount);
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    /**
     * Alcune banche (visto con N26 e Revolut) usano il campo "name" per il
     * nome dell'INTESTATARIO del conto (es. "Daniele Caliandro"), non come
     * etichetta del conto stesso — mentre "details" porta l'informazione
     * utile (es. "Risparmio", "Conto corrente principale"). Se "name"
     * coincide con il nome dell'utente, lo scartiamo come etichetta e
     * preferiamo "details"; altrimenti (banche che invece usano "name"
     * come vera etichetta) lo teniamo.
     */
    private String pickAccountName(String rawName, String details, String holderName, String bankName) {
        boolean nameIsJustHolder = rawName != null && holderName != null
                && rawName.trim().equalsIgnoreCase(holderName.trim());
        String usableName = (rawName != null && !rawName.isBlank() && !nameIsJustHolder) ? rawName : null;
        return firstNonBlank(details, usableName, "Conto " + bankName);
    }

    /** Elenco dei collegamenti bancari dell'utente, con i conti collegati a ciascuno. */
    public List<BankConnectionSummary> listConnections(UUID userId) {
        List<BankConnection> connections = bankConnectionRepository.findByUserId(userId);
        List<Account> allAccounts = accountRepository.findByUserId(userId);

        return connections.stream()
                .map(c -> {
                    List<String> linkedNames = allAccounts.stream()
                            .filter(a -> c.getId().equals(a.getBankConnectionId()))
                            .map(Account::getNome)
                            .toList();
                    return new BankConnectionSummary(
                            c.getId(), c.getAspspName(), c.getAspspCountry(),
                            c.getStatus().name(), c.getValidUntil(), linkedNames);
                })
                // Un collegamento senza nessun conto importato è un residuo di
                // test (creato ogni volta che si completa l'autorizzazione,
                // anche senza mai arrivare all'importazione) — non ha senso
                // mostrarlo tra le banche da gestire.
                .filter(summary -> !summary.linkedAccountNames().isEmpty())
                .toList();
    }

    /**
     * Scollega davvero la banca: revoca il consenso presso Enable Banking
     * (non solo lato nostro) e marca il collegamento come REVOKED — i conti
     * e le transazioni già importati restano intatti, ma non verranno più
     * sincronizzati finché non ricolleghi di nuovo la banca.
     */
    @Transactional
    public void disconnectBank(UUID userId, UUID connectionId) {
        BankConnection connection = bankConnectionRepository.findById(connectionId)
                .filter(c -> c.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Collegamento non trovato"));

        if (connection.getStatus() == BankConnectionStatus.ACTIVE) {
            try {
                enableBankingClient.deleteSession(connection.getSessionId());
            } catch (Exception e) {
                // Se la revoca lato banca fallisce (sessione già scaduta,
                // banca momentaneamente irraggiungibile...) marchiamo
                // comunque come revocato lato nostro: l'obiettivo principale
                // — non fidarsi più di questo collegamento — è comunque
                // raggiunto, e non vogliamo bloccare l'utente per questo.
            }
        }

        connection.setStatus(BankConnectionStatus.REVOKED);
        bankConnectionRepository.save(connection);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private String generateStateToken() {
        byte[] bytes = new byte[24];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}