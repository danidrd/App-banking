package com.budget.budget_app_backend.account;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.budget.budget_app_backend.account.dto.CreateAccountRequest;
import com.budget.budget_app_backend.account.dto.AccountResponse;
import com.budget.budget_app_backend.account.dto.UpdateAccountRequest;
import com.budget.budget_app_backend.common.ResourceNotFoundException;
import com.budget.budget_app_backend.user.User;
import com.budget.budget_app_backend.user.UserRepository;

@Service
public class AccountService {
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    public AccountService(AccountRepository accountRepository, UserRepository userRepository) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
    }

    List<AccountResponse> getAccountsByUserId(UUID userId) {
        return accountRepository.findByUserId(userId).stream().map(this::toResponse).collect(Collectors.toList());
    }

    AccountResponse getAccountByUserIdAndId(UUID userId, UUID accountId) throws ResourceNotFoundException {
        Account account = accountRepository.findByUserIdAndId(userId, accountId)
                        .orElseThrow(() -> new ResourceNotFoundException("Account not found for userId: " + userId + " and accountId: " + accountId));
        return toResponse(account);
    }

    AccountResponse createAccount(UUID userId, CreateAccountRequest request) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        Account account = Account.builder()
                .nome(request.nome())
                .tipo(request.tipo())
                .saldo(request.saldo() != null ? request.saldo() : BigDecimal.ZERO)
                .valuta(request.valuta())
                .user(user)
                .build();
        accountRepository.save(account);
        AccountResponse accountResponse = toResponse(account);
        return accountResponse;
    }

    AccountResponse updateAccount(UUID userId, UUID accountId, UpdateAccountRequest request) {
        Account account = accountRepository.findByUserIdAndId(userId, accountId)
                        .orElseThrow(() -> new ResourceNotFoundException("Account not found for userId: " + userId + " and accountId: " + accountId));
        account.setNome(request.nome());
        account.setTipo(request.tipo());
        account.setValuta(request.valuta());
        accountRepository.save(account);
        AccountResponse accountResponse = toResponse(account);
        return accountResponse;
    }

    void deleteAccount(UUID userId, UUID accountId) {
        Account account = accountRepository.findByUserIdAndId(userId, accountId)
                        .orElseThrow(() -> new ResourceNotFoundException("Account not found for userId: " + userId + " and accountId: " + accountId));
        accountRepository.delete(account);
    }

    private AccountResponse toResponse(Account account) {
        return new AccountResponse(account.getId(), account.getNome(), account.getTipo(), account.getSaldo(), account.getValuta(), account.getBankConnectionId(), account.getCreatedAt());
    }


}
