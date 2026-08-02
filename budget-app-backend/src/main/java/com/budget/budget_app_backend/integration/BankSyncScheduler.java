package com.budget.budget_app_backend.integration;

import com.budget.budget_app_backend.account.Account;
import com.budget.budget_app_backend.account.AccountRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Sincronizza automaticamente tutti i conti collegati via Open Banking,
 * alle 6:00 e alle 18:00 — cadenza pensata per restare ben dentro
 * qualunque limite giornaliero imposto dalle banche (non dichiarato,
 * quindi trattato con prudenza — vedi MIN_HOURS_BETWEEN_SYNCS in
 * BankSyncService, che questo job rispetta automaticamente).
 */
@Component
public class BankSyncScheduler {

    private static final Logger log = LoggerFactory.getLogger(BankSyncScheduler.class);

    private final AccountRepository accountRepository;
    private final BankSyncService bankSyncService;

    public BankSyncScheduler(AccountRepository accountRepository, BankSyncService bankSyncService) {
        this.accountRepository = accountRepository;
        this.bankSyncService = bankSyncService;
    }

    @Scheduled(cron = "0 0 6,18 * * *", zone = "Europe/Rome")
    public void syncAllConnectedAccounts() {
        List<Account> connected = accountRepository.findByExternalUidIsNotNull();
        log.info("Sincronizzazione automatica avviata per {} conti collegati", connected.size());

        for (Account account : connected) {
            try {
                int imported = bankSyncService.syncAccount(account.getUser().getId(), account.getId());
                log.info("Conto {} ({}): {} transazioni importate", account.getId(), account.getNome(), imported);
            } catch (Exception e) {
                // Un conto che fallisce (limite raggiunto, banca momentaneamente
                // giù, consenso scaduto...) non deve bloccare gli altri: si logga
                // e si passa al prossimo.
                log.warn("Sincronizzazione automatica fallita per il conto {} ({}): {}",
                        account.getId(), account.getNome(), e.getMessage());
            }
        }
    }
}