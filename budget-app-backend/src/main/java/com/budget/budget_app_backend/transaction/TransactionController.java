package com.budget.budget_app_backend.transaction;

import org.springframework.web.bind.annotation.RestController;

import com.budget.budget_app_backend.security.CustomUserDetails;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import com.budget.budget_app_backend.transaction.dto.TransactionResponse;
import com.budget.budget_app_backend.transaction.dto.CreateTransactionRequest;
import com.budget.budget_app_backend.transaction.dto.UpdateTransactionRequest;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.http.ResponseEntity;





@RestController
public class TransactionController {
    
    TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping("/api/transactions")
    public List<TransactionResponse> getTransactionsByUserId(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return transactionService.getTransactionsByUserId(userDetails.getUser().getId());
    }

    @GetMapping("/api/transactions/{id}")
    public TransactionResponse getTransactionByUserIdAndId(@AuthenticationPrincipal CustomUserDetails userDetails, @PathVariable("id") UUID id) {
        return transactionService.getTransactionByUserIdAndId(userDetails.getUser().getId(), id);
    }

    @PostMapping("/api/transactions")
    public TransactionResponse createTransaction(@AuthenticationPrincipal CustomUserDetails userDetails, @RequestBody @Valid CreateTransactionRequest request) {
        return transactionService.createTransaction(userDetails.getUser().getId(), request);
    }

    @PutMapping("/api/transactions/{id}")
    public TransactionResponse updateTransaction(@AuthenticationPrincipal CustomUserDetails userDetails, @PathVariable("id") UUID id, @RequestBody @Valid UpdateTransactionRequest request) {
        return transactionService.updateTransaction(userDetails.getUser().getId(), id, request);
    }

    @DeleteMapping("/api/transactions/{id}")
    public ResponseEntity<Void> deleteTransaction(@AuthenticationPrincipal CustomUserDetails userDetails, @PathVariable("id") UUID id) {
        transactionService.deleteTransaction(userDetails.getUser().getId(), id);
        return ResponseEntity.noContent().build();
    }
    
    
    
}
