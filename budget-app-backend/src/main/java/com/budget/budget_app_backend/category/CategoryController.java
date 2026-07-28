package com.budget.budget_app_backend.category;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.budget.budget_app_backend.security.CustomUserDetails;
import java.util.List;
import com.budget.budget_app_backend.category.dto.CategoryResponse;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.UUID;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import jakarta.validation.Valid;
import com.budget.budget_app_backend.category.dto.CreateCategoryRequest;
import org.springframework.web.bind.annotation.PutMapping;
import com.budget.budget_app_backend.category.dto.UpdateCategoryRequest;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.http.ResponseEntity;
    
@RestController
public class CategoryController {
    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping("/api/categories")
    public List<CategoryResponse> getCategories(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return categoryService.getCategoriesByUserId(userDetails.getUser().getId());
    }

    @GetMapping("/api/categories/{id}")
    public CategoryResponse getCategory(@AuthenticationPrincipal CustomUserDetails userDetails, @PathVariable("id") UUID categoryId) {
        return categoryService.getCategoryByUserIdAndId(userDetails.getUser().getId(), categoryId);
    }

    @PostMapping("/api/categories")
    public CategoryResponse createCategory(@AuthenticationPrincipal CustomUserDetails userDetails, @RequestBody @Valid CreateCategoryRequest categoryRequest) {
        return categoryService.createCategory(userDetails.getUser().getId(), categoryRequest);
    }

    @PutMapping("/api/categories/{id}")
    public CategoryResponse updateCategory(@AuthenticationPrincipal CustomUserDetails userDetails, @PathVariable("id") UUID id, @RequestBody @Valid UpdateCategoryRequest categoryRequest) {
        return categoryService.updateCategory(userDetails.getUser().getId(), id, categoryRequest);
    }

    @DeleteMapping("/api/categories/{id}")
    public ResponseEntity<Void> deleteCategory(@AuthenticationPrincipal CustomUserDetails userDetails, @PathVariable("id") UUID categoryId) {
        categoryService.deleteCategory(userDetails.getUser().getId(), categoryId);
        return ResponseEntity.noContent().build();
    }
}
