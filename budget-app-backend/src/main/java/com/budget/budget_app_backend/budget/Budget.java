package com.budget.budget_app_backend.budget;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import jakarta.persistence.GenerationType;

import java.util.ArrayList;
import java.util.UUID;

import com.budget.budget_app_backend.budgetline.BudgetLine;
import com.budget.budget_app_backend.user.User;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import java.time.Instant;
import java.time.LocalDate;
import jakarta.persistence.CascadeType;
import java.util.List;


@Entity
@Table(name = "budgets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Budget {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String periodo;

    @Column(name = "data_inizio", nullable = false)
    private LocalDate dataInizio;

    @Column(name = "data_fine", nullable = false)
    private LocalDate dataFine;

    @Column(nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "budget", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BudgetLine> righe = new ArrayList<>();
    
}
