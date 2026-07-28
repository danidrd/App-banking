package com.budget.budget_app_backend.category;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

    List<Category> findByUserId(UUID userId);

    Optional<Category> findByUserIdAndId(UUID userId, UUID categoryId);
}