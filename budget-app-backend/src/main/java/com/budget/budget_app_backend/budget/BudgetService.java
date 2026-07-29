package com.budget.budget_app_backend.budget;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.budget.budget_app_backend.budget.dto.BudgetResponse;
import com.budget.budget_app_backend.budget.dto.CreateBudgetRequest;
import com.budget.budget_app_backend.budget.dto.UpdateBudgetRequest;

import java.util.UUID;
import com.budget.budget_app_backend.user.UserRepository;
import com.budget.budget_app_backend.user.User;
import com.budget.budget_app_backend.common.ResourceNotFoundException;
import com.budget.budget_app_backend.category.CategoryRepository;
import com.budget.budget_app_backend.budgetline.dto.BudgetLineRequest;
import com.budget.budget_app_backend.budgetline.BudgetLine;
import com.budget.budget_app_backend.budgetline.dto.BudgetLineResponse;
import java.util.List;
import java.util.ArrayList;

@Service
public class BudgetService {
    
    BudgetRepository budgetRepository;
    UserRepository userRepository;
    CategoryRepository categoryRepository;

    public BudgetService(BudgetRepository budgetRepository, UserRepository userRepository, CategoryRepository categoryRepository) {
        this.budgetRepository = budgetRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional
    BudgetResponse createBudget(UUID userId,CreateBudgetRequest request){
        
        if(request.dataInizio().isAfter(request.dataFine())){
            throw new IllegalArgumentException("La data di inizio non può essere successiva alla data di fine");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("Utente non trovato"));
        
        Budget budget = Budget.builder()
            .user(user)
            .periodo(request.periodo())
            .dataInizio(request.dataInizio())
            .dataFine(request.dataFine())
            .build();

        long categorieDistinte = request.righe().stream()
            .map(BudgetLineRequest::categoryId)
            .distinct()
            .count();

        if(categorieDistinte != request.righe().size()){
            throw new IllegalArgumentException("Le categorie devono essere distinte");
        }

        for(BudgetLineRequest line : request.righe()){
            var category = categoryRepository.findByUserIdAndId(userId, line.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Categoria non trovata"));
           
            budget.getRighe().add(BudgetLine.builder().budget(budget).category(category).limite(line.limite()).build());
        }
        budgetRepository.save(budget);
        return toResponse(budget);
    }

    @Transactional
    BudgetResponse updateBudget(UUID userId, UUID budgetId, UpdateBudgetRequest request) {
        Budget budget = budgetRepository.findByUserIdAndId(userId, budgetId)
            .orElseThrow(() -> new ResourceNotFoundException("Budget non trovato"));

        if(request.dataInizio().isAfter(request.dataFine())){
            throw new IllegalArgumentException("La data di inizio non può essere successiva alla data di fine");
        }

        
        
        long categorieDistinte = request.righe().stream()
                .map(BudgetLineRequest::categoryId)
                .distinct()
                .count();

        if(categorieDistinte != request.righe().size()){
            throw new IllegalArgumentException("Le categorie devono essere distinte");
        }

        List<BudgetLine> newLines = new ArrayList<>();
        for(BudgetLineRequest line : request.righe()){
            var category = categoryRepository.findByUserIdAndId(userId, line.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Categoria non trovata"));
           
            newLines.add(BudgetLine.builder().budget(budget).category(category).limite(line.limite()).build());
        }

        budget.getRighe().clear();
        budgetRepository.saveAndFlush(budget);
        budget.getRighe().addAll(newLines);

        budget.setPeriodo(request.periodo());
        budget.setDataInizio(request.dataInizio());
        budget.setDataFine(request.dataFine());

        budgetRepository.save(budget);
        return toResponse(budget);
    }

    @Transactional(readOnly = true)
    List<BudgetResponse> getBudgets(UUID userId) {
        List<Budget> budgets = budgetRepository.findByUserId(userId);
        return budgets.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    BudgetResponse getBudget(UUID userId, UUID budgetId) {
        Budget budget = budgetRepository.findByUserIdAndId(userId, budgetId)
            .orElseThrow(() -> new ResourceNotFoundException("Budget non trovato"));
        return toResponse(budget);
    }

    void deleteBudget(UUID userId, UUID budgetId) {
        Budget budget = budgetRepository.findByUserIdAndId(userId, budgetId)
            .orElseThrow(() -> new ResourceNotFoundException("Budget non trovato"));
        budgetRepository.delete(budget);
    }


    private BudgetResponse toResponse(Budget budget) {
        return new BudgetResponse(
            budget.getId(),
            budget.getPeriodo(),
            budget.getDataInizio(),
            budget.getDataFine(),
            budget.getCreatedAt(),
            budget.getRighe().stream().map(this::toLineResponse).toList()
        );
    }

    private BudgetLineResponse toLineResponse(BudgetLine line) {
        return new BudgetLineResponse(
            line.getId(),
            line.getCategory().getId(),
            line.getLimite()
        );
    }
}
