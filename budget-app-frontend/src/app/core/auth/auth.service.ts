import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, AuthUser } from '../models';

const TOKEN_KEY = 'budget.token';
const USER_KEY = 'budget.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  /** Utente corrente, null se non autenticato. Ripristinato da localStorage all'avvio. */
  readonly currentUser = signal<AuthUser | null>(this.restoreUser());

  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/login', { email, password })
      .pipe(tap(res => this.storeSession(res)));
  }

  register(nome: string, email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/register', { nome, email, password })
      .pipe(tap(res => this.storeSession(res)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private storeSession(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    const user: AuthUser = { email: res.email, nome: res.nome };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private restoreUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw || !localStorage.getItem(TOKEN_KEY)) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
