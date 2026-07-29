package com.budget.budget_app_backend.budget;

import org.springframework.web.bind.annotation.RestController;

import com.budget.budget_app_backend.budget.dto.BudgetResponse;
import com.budget.budget_app_backend.security.CustomUserDetails;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.UUID;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import com.budget.budget_app_backend.budget.dto.CreateBudgetRequest;
import jakarta.validation.Valid;
import com.budget.budget_app_backend.budget.dto.UpdateBudgetRequest;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.http.ResponseEntity;




@RestController
public class BudgetController {
    
    BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @GetMapping("/api/budgets")
    public List<BudgetResponse> getBudgets(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return budgetService.getBudgets(userDetails.getUser().getId());
    }

    @GetMapping("/api/budgets/{id}")
    public BudgetResponse getBudget(@AuthenticationPrincipal CustomUserDetails userDetails, @PathVariable UUID id) {
        return budgetService.getBudget(userDetails.getUser().getId(), id);
    }

    @PostMapping("/api/budgets")
    public BudgetResponse createBudget(@AuthenticationPrincipal CustomUserDetails userDetails, @RequestBody @Valid CreateBudgetRequest request) {
        return budgetService.createBudget(userDetails.getUser().getId(), request);
    }

    @PutMapping("/api/budgets/{id}")
    public BudgetResponse updateBudget(@AuthenticationPrincipal CustomUserDetails userDetails, @PathVariable UUID id, @RequestBody @Valid UpdateBudgetRequest request) {
        return budgetService.updateBudget(userDetails.getUser().getId(), id, request);
    }

    @DeleteMapping("/api/budgets/{id}")
    public ResponseEntity<Void> deleteBudget(@AuthenticationPrincipal CustomUserDetails userDetails, @PathVariable UUID id) {
        budgetService.deleteBudget(userDetails.getUser().getId(), id);
        return ResponseEntity.noContent().build();
    }
    
    
    
}
