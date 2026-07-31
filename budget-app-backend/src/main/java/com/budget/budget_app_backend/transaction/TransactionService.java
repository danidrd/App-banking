package com.budget.budget_app_backend.transaction;

import org.springframework.stereotype.Service;
import com.budget.budget_app_backend.account.AccountRepository;
import com.budget.budget_app_backend.category.CategoryRepository;
import com.budget.budget_app_backend.transaction.dto.CreateTransactionRequest;
import com.budget.budget_app_backend.transaction.dto.UpdateTransactionRequest;
import com.budget.budget_app_backend.transaction.dto.TransactionResponse;

import org.springframework.transaction.annotation.Transactional;

import com.budget.budget_app_backend.common.ResourceNotFoundException;
import com.budget.budget_app_backend.account.Account;
import com.budget.budget_app_backend.category.Category;
import java.util.UUID;
import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TransactionService {

    AccountRepository accountRepository;
    CategoryRepository categoryRepository;
    TransactionRepository transactionRepository;

    public TransactionService(AccountRepository accountRepository, CategoryRepository categoryRepository, TransactionRepository transactionRepository) {
        this.accountRepository = accountRepository;
        this.categoryRepository = categoryRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    TransactionResponse createTransaction(UUID userId, CreateTransactionRequest request){
        Account account = accountRepository.findByUserIdAndId(userId, request.accountId() )
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        Category category = (request.categoryId() != null) ? categoryRepository.findByUserIdAndId(userId, request.categoryId()).orElseThrow(() -> new ResourceNotFoundException("Category not found")) : null;

        Transaction transaction = Transaction.builder()
                .account(account)
                .category(category)
                .importo(request.importo())
                .descrizione(request.descrizione())
                .data(request.data())
                .ricorrente((request.ricorrente() != null) ? request.ricorrente() : false)
                .build();
        transactionRepository.save(transaction);
        account.setSaldo(account.getSaldo().add(transaction.getImporto()));
        accountRepository.save(account);
        return toResponse(transaction);
    }

    TransactionResponse getTransactionByUserIdAndId(UUID userId, UUID transactionId){
        Transaction transaction = transactionRepository.findByIdAndAccount_User_Id(transactionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found"));
        return toResponse(transaction);
    }

    @Transactional
    TransactionResponse updateTransaction(UUID userId, UUID transactionId, UpdateTransactionRequest request){
        Transaction transaction = transactionRepository.findByIdAndAccount_User_Id(transactionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found"));
        Account account = transaction.getAccount();
        BigDecimal oldImporto = transaction.getImporto();
        updateTransactionFields(transaction, request);
        
        transactionRepository.save(transaction);
        account.setSaldo(account.getSaldo().subtract(oldImporto).add(transaction.getImporto()));
        accountRepository.save(account);
        return toResponse(transaction);
    }

    List<TransactionResponse> getTransactionsByUserId(UUID userId){
        return transactionRepository.findByAccount_User_Id(userId).stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    void deleteTransaction(UUID userId, UUID transactionId){
        Transaction transaction = transactionRepository.findByIdAndAccount_User_Id(transactionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found"));
        Account account = transaction.getAccount();
        BigDecimal importo = transaction.getImporto();
        transactionRepository.delete(transaction);
        account.setSaldo(account.getSaldo().subtract(importo));
        accountRepository.save(account);
    }


    private TransactionResponse toResponse(Transaction transaction) {
       return new TransactionResponse(
                transaction.getAccount().getId(),
                (transaction.getCategory() != null) ? transaction.getCategory().getId() : null,
                transaction.getId(),
                transaction.getImporto(),
                transaction.getDescrizione(),
                transaction.getData(),
                transaction.isRicorrente(),
                transaction.isTrasferimentoInterno(),
                transaction.getCreatedAt()
        );
    }


    private void updateTransactionFields(Transaction transaction, UpdateTransactionRequest request) {
        if (request.categoryId() != null) {
            Category category = categoryRepository.findByUserIdAndId(transaction.getAccount().getUser().getId(), request.categoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
            transaction.setCategory(category);
        } else {
            transaction.setCategory(null);
        }
        transaction.setImporto(request.importo());
        transaction.setDescrizione(request.descrizione());
        transaction.setData(request.data());
        transaction.setRicorrente((request.ricorrente() != null) ? request.ricorrente() : false);
    }
}