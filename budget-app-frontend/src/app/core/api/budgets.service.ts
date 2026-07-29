import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Budget, BudgetPayload } from '../models';

@Injectable({ providedIn: 'root' })
export class BudgetsService {
  private http = inject(HttpClient);

  list(): Observable<Budget[]> {
    return this.http.get<Budget[]>('/api/budgets');
  }

  get(id: string): Observable<Budget> {
    return this.http.get<Budget>(`/api/budgets/${id}`);
  }

  create(payload: BudgetPayload): Observable<Budget> {
    return this.http.post<Budget>('/api/budgets', payload);
  }

  update(id: string, payload: BudgetPayload): Observable<Budget> {
    return this.http.put<Budget>(`/api/budgets/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/budgets/${id}`);
  }
}
