package com.budget.budget_app_backend.account;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, UUID> {

    List<Account> findByUserId(UUID userId);

    Optional<Account> findByUserIdAndId(UUID userId, UUID accountId);

    Optional<Account> findByUserIdAndExternalUid(UUID userId, String externalUid);

    /** Tutti i conti collegati via Open Banking, di qualunque utente — usato dal job di sincronizzazione automatica. */
    List<Account> findByExternalUidIsNotNull();
}