package com.budget.budget_app_backend.transaction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    List<Transaction> findByAccountId(UUID accountId);

    Optional<Transaction> findByAccountIdAndExternalId(UUID accountId, String externalId);
}