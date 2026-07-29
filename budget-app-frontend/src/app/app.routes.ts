import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register.component').then(m => m.RegisterComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'conti',
        loadComponent: () =>
          import('./features/accounts/accounts.component').then(m => m.AccountsComponent),
      },
      {
        path: 'categorie',
        loadComponent: () =>
          import('./features/categories/categories.component').then(m => m.CategoriesComponent),
      },
      {
        path: 'transazioni',
        loadComponent: () =>
          import('./features/transactions/transactions.component').then(m => m.TransactionsComponent),
      },
      {
        path: 'budget',
        loadComponent: () =>
          import('./features/budgets/budgets.component').then(m => m.BudgetsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
