package com.budget.budget_app_backend.category;

import org.springframework.stereotype.Service;
import com.budget.budget_app_backend.user.UserRepository;
import java.util.List;
import java.util.UUID;
import com.budget.budget_app_backend.category.dto.CategoryResponse;
import com.budget.budget_app_backend.common.ResourceNotFoundException;
import com.budget.budget_app_backend.user.User;
import com.budget.budget_app_backend.category.dto.CreateCategoryRequest;
import com.budget.budget_app_backend.category.dto.UpdateCategoryRequest;
import java.util.stream.Collectors;

@Service
public class CategoryService {
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public CategoryService(CategoryRepository categoryRepository, UserRepository userRepository) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
    }

    List<CategoryResponse> getCategoriesByUserId(UUID userId) {
        return categoryRepository.findByUserId(userId).stream().map(this::toResponse).collect(Collectors.toList());
    }

    CategoryResponse getCategoryByUserIdAndId(UUID userId, UUID categoryId) {
        Category category = categoryRepository.findByUserIdAndId(userId, categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found for userId: " + userId + " and categoryId: " + categoryId));
        return toResponse(category);
    }

    CategoryResponse createCategory(UUID userId, CreateCategoryRequest categoryRequest) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        
            
        Category category = Category.builder()
                .nome(categoryRequest.nome())
                .tipo(categoryRequest.tipo())
                .user(user)
                .build();

        categoryRepository.save(category);
        return toResponse(category);
    }

    CategoryResponse updateCategory(UUID userId, UUID categoryID, UpdateCategoryRequest categoryRequest) {
        Category category = categoryRepository.findByUserIdAndId(userId, categoryID)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found for userId: " + userId + " and categoryId: " + categoryID));
        category.setNome(categoryRequest.nome());
        category.setTipo(categoryRequest.tipo());
        categoryRepository.save(category);
        return toResponse(category);
    }

    void deleteCategory(UUID userId, UUID categoryId) {
        Category category = categoryRepository.findByUserIdAndId(userId, categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found for userId: " + userId + " and categoryId: " + categoryId));
        categoryRepository.delete(category);
    }

    CategoryResponse toResponse(Category category) {
        return new CategoryResponse(category.getId(), category.getNome(), category.getTipo());
    }
    
}
