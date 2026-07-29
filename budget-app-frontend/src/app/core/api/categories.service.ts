import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Category, CategoryPayload } from '../models';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private http = inject(HttpClient);

  list(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/categories');
  }

  create(payload: CategoryPayload): Observable<Category> {
    return this.http.post<Category>('/api/categories', payload);
  }

  update(id: string, payload: CategoryPayload): Observable<Category> {
    return this.http.put<Category>(`/api/categories/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/categories/${id}`);
  }
}
