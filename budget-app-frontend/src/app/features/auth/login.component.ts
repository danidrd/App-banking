import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth">
      <!-- Pannello brand: visibile solo da tablet in su -->
      <aside class="auth__brand" aria-hidden="true">
        <div class="brand__mark">B.</div>
        <p class="brand__claim">
          Ogni euro,<br>al suo posto.
        </p>
        <div class="brand__ledger">
          @for (row of ledgerRows; track $index) {
            <div class="ledger__row" [style.--w]="row"></div>
          }
        </div>
      </aside>

      <main class="auth__panel">
        <form class="auth__form" [formGroup]="form" (ngSubmit)="submit()">
          <h1>Accedi</h1>
          <p class="auth__sub">Bentornato. Inserisci le tue credenziali.</p>

          @if (serverError()) {
            <div class="alert" role="alert">{{ serverError() }}</div>
          }

          <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" formControlName="email" autocomplete="email">
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <span class="error">Inserisci un'email valida</span>
            }
          </div>

          <div class="field">
            <label for="password">Password</label>
            <input id="password" type="password" formControlName="password" autocomplete="current-password">
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <span class="error">La password è obbligatoria</span>
            }
            <a class="forgot-link" routerLink="/forgot-password">Password dimenticata?</a>
          </div>

          <button class="btn btn--primary" type="submit" [disabled]="loading()">
            {{ loading() ? 'Accesso in corso…' : 'Accedi' }}
          </button>

          <p class="auth__switch">
            Non hai un account? <a routerLink="/register">Registrati</a>
          </p>
        </form>
      </main>
    </div>
  `,
  styles: `
    .auth {
      min-height: 100dvh;
      display: grid;
      grid-template-columns: 1fr;
    }
    @media (min-width: 820px) {
      .auth { grid-template-columns: 5fr 7fr; }
    }

    /* ---- Pannello brand ---- */
    .auth__brand {
      display: none;
      background: var(--accent-strong);
      color: #fff;
      padding: calc(48px + var(--inset-top)) 48px 48px;
      position: relative;
      overflow: hidden;
    }
    @media (min-width: 820px) {
      .auth__brand { display: flex; flex-direction: column; }
    }
    .brand__mark {
      font-family: var(--font-display);
      font-size: 28px;
      font-weight: 800;
    }
    .brand__claim {
      font-family: var(--font-display);
      font-size: clamp(32px, 4vw, 46px);
      font-weight: 700;
      line-height: 1.15;
      margin: auto 0 0;
    }
    /* Righe da registro contabile: il motivo firma della pagina */
    .brand__ledger {
      margin-top: 40px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .ledger__row {
      height: 6px;
      width: var(--w);
      border-radius: 3px;
      background: rgb(255 255 255 / 0.22);
    }

    /* ---- Pannello form ---- */
    .auth__panel {
      display: grid;
      place-items: center;
      padding: calc(32px + var(--inset-top)) 20px calc(32px + var(--inset-bottom));
    }
    .auth__form {
      width: min(380px, 100%);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    h1 { font-size: 30px; }
    .auth__sub { margin: -8px 0 0; color: var(--text-muted); }
    .auth__switch { font-size: 14px; color: var(--text-muted); }
    .forgot-link {
      align-self: flex-end;
      font-size: 13px;
      color: var(--text-muted);
      margin-top: -2px;
    }
    .forgot-link:hover { color: var(--accent); }
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  /** Larghezze pseudo-casuali ma fisse per il motivo "registro" */
  readonly ledgerRows = ['72%', '58%', '81%', '44%', '66%', '52%'];

  readonly loading = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.serverError.set(null);

    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const body = err.error as ApiError | null;
        this.serverError.set(body?.errore ?? 'Accesso non riuscito. Riprova.');
      },
    });
  }
}
