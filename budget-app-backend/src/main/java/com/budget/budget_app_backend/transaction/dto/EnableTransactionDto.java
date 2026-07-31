package com.budget.budget_app_backend.transaction.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EnableTransactionDto(
        @JsonProperty("entry_reference") String entryReference,
        @JsonProperty("transaction_amount") EnableTransactionAmountDto transactionAmount,
        @JsonProperty("credit_debit_indicator") String creditDebitIndicator,
        @JsonProperty("booking_date") String bookingDate,
        @JsonProperty("remittance_information") List<String> remittanceInformation
) {
}