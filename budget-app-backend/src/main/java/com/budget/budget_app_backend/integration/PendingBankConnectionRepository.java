package com.budget.budget_app_backend.integration;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PendingBankConnectionRepository extends JpaRepository<PendingBankConnection, java.util.UUID> {

    Optional<PendingBankConnection> findByStateToken(String stateToken);
}