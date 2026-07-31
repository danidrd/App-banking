package com.budget.budget_app_backend.integration;

import com.budget.budget_app_backend.account.Account;
import com.budget.budget_app_backend.account.AccountRepository;
import com.budget.budget_app_backend.common.ResourceNotFoundException;
import com.budget.budget_app_backend.integration.dto.BalancesResponse;
import com.budget.budget_app_backend.transaction.dto.EnableTransactionDto;
import com.budget.budget_app_backend.integration.dto.TransactionsPageResponse;
import com.budget.budget_app_backend.transaction.Transaction;
import com.budget.budget_app_backend.transaction.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Sincronizzazione manuale (per ora) delle transazioni di un conto
 * collegato via Open Banking. Trigger esplicito, non ancora un job
 * schedulato — prima verifichiamo che i dati arrivino corretti, poi
 * eventualmente automatizziamo.
 */
@Service
public class BankSyncService {

    /** Difesa contro loop anomali se continuation_key non terminasse mai. */
    private static final int MAX_PAGES = 20;

    /**
     * Non richiediamo alla banca più spesso di così: il limite giornaliero
     * reale non è noto (le banche non lo dichiarano), quindi restiamo
     * prudenti — abbastanza per coprire il job automatico (2 volte al
     * giorno) più qualche sincronizzazione manuale senza avvicinarci al muro.
     */
    private static final int MIN_HOURS_BETWEEN_SYNCS = 4;

    private final EnableBankingClient enableBankingClient;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final BankConnectionRepository bankConnectionRepository;

    public BankSyncService(
            EnableBankingClient enableBankingClient,
            AccountRepository accountRepository,
            TransactionRepository transactionRepository,
            BankConnectionRepository bankConnectionRepository) {
        this.enableBankingClient = enableBankingClient;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.bankConnectionRepository = bankConnectionRepository;
    }

    /**
     * Scarica le transazioni nuove del conto (deduplicando su external_id,
     * seguendo tutte le pagine tramite continuation_key) e aggiorna il
     * saldo con quello reale della banca — non lo ricalcoliamo sommando
     * le transazioni scaricate: più affidabile in caso di scostamenti
     * (commissioni, transazioni non ancora esposte dall'API, ecc.).
     *
     * @return quante transazioni nuove sono state importate
     */
    @Transactional
    public int syncAccount(UUID userId, UUID accountId) {
        Account account = accountRepository.findByUserIdAndId(userId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Conto non trovato"));

        if (account.getExternalUid() == null) {
            throw new IllegalArgumentException("Questo conto non è collegato a nessuna banca");
        }

        if (account.getBankConnectionId() != null) {
            BankConnection connection = bankConnectionRepository.findById(account.getBankConnectionId())
                    .orElse(null);
            if (connection != null && connection.getStatus() != BankConnectionStatus.ACTIVE) {
                throw new IllegalArgumentException(
                        "Il collegamento con questa banca è stato scollegato. Ricollegala per riprendere la sincronizzazione.");
            }
        }

        if (account.getLastSyncedAt() != null) {
            Duration sinceLastSync = Duration.between(account.getLastSyncedAt(), Instant.now());
            if (sinceLastSync.toHours() < MIN_HOURS_BETWEEN_SYNCS) {
                long minutesLeft = MIN_HOURS_BETWEEN_SYNCS * 60L - sinceLastSync.toMinutes();
                throw new IllegalArgumentException(
                        "Questo conto è già stato sincronizzato di recente. Riprova tra circa "
                                + Math.max(1, minutesLeft / 60) + " ore.");
            }
        }

        int imported = 0;
        String continuationKey = null;
        int pageCount = 0;

        do {
            TransactionsPageResponse page;
            try {
                page = enableBankingClient.getAccountTransactions(account.getExternalUid(), continuationKey);
            } catch (HttpClientErrorException.TooManyRequests e) {
                // Le banche limitano quante volte al giorno si può interrogare
                // lo stesso consenso senza che l'utente sia "presente" ad
                // autorizzare ogni chiamata — è un vincolo della banca, non
                // un errore nostro. Meglio un messaggio chiaro che un 500/403 opaco.
                throw new IllegalArgumentException(
                        "Hai raggiunto il limite giornaliero di richieste consentite da questa banca per questo conto. Riprova più tardi.");
            }

            for (EnableTransactionDto tx : page.transactions()) {
                if (tx.entryReference() == null) {
                    // Senza un riferimento stabile non possiamo deduplicare
                    // in modo affidabile: meglio saltarla che rischiare doppioni.
                    continue;
                }
                boolean alreadyImported = transactionRepository
                        .findByAccountIdAndExternalId(account.getId(), tx.entryReference())
                        .isPresent();
                if (alreadyImported) {
                    continue;
                }

                BigDecimal amount = new BigDecimal(tx.transactionAmount().amount());
                if ("DBIT".equals(tx.creditDebitIndicator())) {
                    amount = amount.negate();
                }
                String descrizione = (tx.remittanceInformation() != null && !tx.remittanceInformation().isEmpty())
                        ? tx.remittanceInformation().get(0)
                        : null;

                Transaction transaction = Transaction.builder()
                        .account(account)
                        .category(null)
                        .importo(amount)
                        .descrizione(descrizione)
                        .data(LocalDate.parse(tx.bookingDate()))
                        .ricorrente(false)
                        .externalId(tx.entryReference())
                        .build();
                transactionRepository.save(transaction);
                imported++;
            }

            continuationKey = page.continuationKey();
            pageCount++;
        } while (continuationKey != null && pageCount < MAX_PAGES);

        BigDecimal freshBalance = fetchBalance(account.getExternalUid());
        if (freshBalance != null) {
            account.setSaldo(freshBalance);
        }
        account.setLastSyncedAt(Instant.now());
        accountRepository.save(account);

        matchInternalTransfers(userId);

        return imported;
    }

    /**
     * Cerca coppie di transazioni non ancora marcate, su conti diversi dello
     * stesso utente (entrambi collegati via Open Banking), con lo stesso
     * importo assoluto e segno opposto, entro pochi giorni l'una dall'altra
     * — la finestra di qualche giorno serve perché, come osservato con un
     * bonifico reale tra isybank e Revolut, l'uscita da un conto e l'entrata
     * sull'altro possono comparire con un ritardo di ore o giorni tra loro.
     * Se trovata una coppia compatibile, marca entrambe come trasferimento
     * interno: non vengono cancellate, solo escluse dai calcoli di spesa.
     */
    @Transactional
    public int matchInternalTransfers(UUID userId) {
        // Prima i movimenti che non richiedono abbinamento: alcune banche
        // (es. isybank, col suo "Salvadanaio") hanno sotto-conti interni
        // che NON espongono come conti separati tramite le API — a
        // differenza di N26, che invece li espone come conti veri. In
        // questi casi il riconoscimento per coppie non può funzionare,
        // perché manca fisicamente il "secondo conto" con cui abbinare
        // il movimento. Li riconosciamo dalla descrizione, che isybank
        // marca sempre in modo distintivo.
        int pocketMovements = markInternalPocketMovements(userId);

        List<Transaction> candidates = transactionRepository
                .findByAccount_User_IdAndTrasferimentoInternoFalse(userId)
                .stream()
                .filter(t -> t.getAccount().getExternalUid() != null)
                .toList();

        int matched = 0;
        boolean[] alreadyMatched = new boolean[candidates.size()];

        for (int i = 0; i < candidates.size(); i++) {
            if (alreadyMatched[i]) {
                continue;
            }
            Transaction a = candidates.get(i);

            // Cerchiamo TUTTE le corrispondenze compatibili, non la prima:
            // con importi che si ripetono spesso (es. 10€, 40€...), fermarsi
            // alla prima trovata rischia di abbinare la transazione sbagliata,
            // lasciando la vera coppia orfana per sempre. Teniamo quella con
            // la data più vicina, la scelta più plausibile per un vero
            // trasferimento (le due gambe di solito sono vicinissime nel tempo).
            int bestMatch = -1;
            long bestDistance = Long.MAX_VALUE;

            for (int j = i + 1; j < candidates.size(); j++) {
                if (alreadyMatched[j]) {
                    continue;
                }
                Transaction b = candidates.get(j);

                if (a.getAccount().getId().equals(b.getAccount().getId())) {
                    continue; // stesso conto: non è un trasferimento tra conti
                }

                boolean sameAbsoluteAmount = a.getImporto().abs().compareTo(b.getImporto().abs()) == 0;
                boolean oppositeSign = a.getImporto().signum() != 0
                        && a.getImporto().signum() == -b.getImporto().signum();
                if (!sameAbsoluteAmount || !oppositeSign) {
                    continue;
                }

                long distance = Math.abs(ChronoUnit.DAYS.between(a.getData(), b.getData()));
                if (distance <= 3 && distance < bestDistance) {
                    bestDistance = distance;
                    bestMatch = j;
                }
            }

            if (bestMatch != -1) {
                Transaction b = candidates.get(bestMatch);
                a.setTrasferimentoInterno(true);
                b.setTrasferimentoInterno(true);
                transactionRepository.save(a);
                transactionRepository.save(b);
                alreadyMatched[i] = true;
                alreadyMatched[bestMatch] = true;
                matched += 2;
            }
        }

        return pocketMovements + matched;
    }

    /**
     * Movimenti verso/da un sotto-conto interno della stessa banca (es. il
     * Salvadanaio di isybank) che la banca non espone come conto separato:
     * niente da abbinare, basta riconoscerli dalla descrizione — sono
     * sempre marcati in modo distintivo e coerente da isybank stessa.
     */
    private int markInternalPocketMovements(UUID userId) {
        List<Transaction> candidates = transactionRepository
                .findByAccount_User_IdAndTrasferimentoInternoFalse(userId);

        int marked = 0;
        for (Transaction t : candidates) {
            if (t.getDescrizione() != null && t.getDescrizione().contains("MOVIMENTO SALVADANAIO")) {
                t.setTrasferimentoInterno(true);
                transactionRepository.save(t);
                marked++;
            }
        }
        return marked;
    }

    private BigDecimal fetchBalance(String accountUid) {
        try {
            BalancesResponse balances = enableBankingClient.getAccountBalances(accountUid);
            if (balances == null || balances.balances() == null || balances.balances().isEmpty()) {
                return null;
            }
            return new BigDecimal(balances.balances().get(0).balanceAmount().amount());
        } catch (Exception e) {
            return null;
        }
    }
}