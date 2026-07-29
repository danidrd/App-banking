import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateTransactionPayload,
  Transaction,
  UpdateTransactionPayload,
} from '../models';

@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private http = inject(HttpClient);

  list(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>('/api/transactions');
  }

  get(id: string): Observable<Transaction> {
    return this.http.get<Transaction>(`/api/transactions/${id}`);
  }

  create(payload: CreateTransactionPayload): Observable<Transaction> {
    return this.http.post<Transaction>('/api/transactions', payload);
  }

  update(id: string, payload: UpdateTransactionPayload): Observable<Transaction> {
    return this.http.put<Transaction>(`/api/transactions/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/transactions/${id}`);
  }
}
