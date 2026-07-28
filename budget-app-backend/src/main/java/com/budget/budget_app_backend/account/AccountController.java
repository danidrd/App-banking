package com.budget.budget_app_backend.account;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.budget.budget_app_backend.account.dto.CreateAccountRequest;
import com.budget.budget_app_backend.account.dto.UpdateAccountRequest;
import com.budget.budget_app_backend.account.dto.AccountResponse;
import org.springframework.web.bind.annotation.PutMapping;
import com.budget.budget_app_backend.security.CustomUserDetails;



@RestController
public class AccountController {
    
    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping("/api/accounts")
    public List<AccountResponse> getAccounts(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return accountService.getAccountsByUserId(userDetails.getUser().getId());
    }

    @GetMapping("/api/accounts/{id}")
    public AccountResponse getAccount(@AuthenticationPrincipal CustomUserDetails userDetails, @PathVariable UUID id) {
        return accountService.getAccountByUserIdAndId(userDetails.getUser().getId(), id);
    }

    @PostMapping("/api/accounts")
    public AccountResponse createAccount(@RequestBody @Valid CreateAccountRequest request, @AuthenticationPrincipal CustomUserDetails userDetails) {
        return accountService.createAccount(userDetails.getUser().getId(), request);
    }

    @PutMapping("/api/accounts/{id}")
    public AccountResponse updateAccount(@AuthenticationPrincipal CustomUserDetails userDetails, @RequestBody @Valid UpdateAccountRequest request, @PathVariable UUID id) {
        return accountService.updateAccount(userDetails.getUser().getId(), id, request);
    }

    @DeleteMapping("/api/accounts/{id}")
    public ResponseEntity<Void> deleteAccount(@AuthenticationPrincipal CustomUserDetails userDetails, @PathVariable UUID id) {
        accountService.deleteAccount(userDetails.getUser().getId(), id);
        return ResponseEntity.noContent().build();
    }

}
