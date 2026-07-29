import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Account, CreateAccountPayload, UpdateAccountPayload } from '../models';

@Injectable({ providedIn: 'root' })
export class AccountsService {
  private http = inject(HttpClient);

  list(): Observable<Account[]> {
    return this.http.get<Account[]>('/api/accounts');
  }

  get(id: string): Observable<Account> {
    return this.http.get<Account>(`/api/accounts/${id}`);
  }

  create(payload: CreateAccountPayload): Observable<Account> {
    return this.http.post<Account>('/api/accounts', payload);
  }

  update(id: string, payload: UpdateAccountPayload): Observable<Account> {
    return this.http.put<Account>(`/api/accounts/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/accounts/${id}`);
  }
}
