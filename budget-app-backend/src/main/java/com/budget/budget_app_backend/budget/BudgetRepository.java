package com.budget.budget_app_backend.budget;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import java.util.List;
import java.util.Optional;


public interface BudgetRepository extends JpaRepository<Budget, UUID> {
    
    List<Budget> findByUserId(UUID userId);

    Optional<Budget> findByUserIdAndId(UUID userId, UUID budgetId);

}
