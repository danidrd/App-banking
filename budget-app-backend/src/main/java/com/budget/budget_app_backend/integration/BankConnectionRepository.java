package com.budget.budget_app_backend.integration;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BankConnectionRepository extends JpaRepository<BankConnection, UUID> {

    List<BankConnection> findByUserId(UUID userId);
}