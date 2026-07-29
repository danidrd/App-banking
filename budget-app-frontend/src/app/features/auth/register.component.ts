import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth">
      <main class="auth__panel">
        <form class="auth__form" [formGroup]="form" (ngSubmit)="submit()">
          <h1>Crea il tuo account</h1>
          <p class="auth__sub">Bastano nome, email e una password.</p>

          @if (serverError()) {
            <div class="alert" role="alert">{{ serverError() }}</div>
          }

          <div class="field">
            <label for="nome">Nome</label>
            <input id="nome" type="text" formControlName="nome" autocomplete="name">
            @if (form.controls.nome.touched && form.controls.nome.invalid) {
              <span class="error">Il nome è obbligatorio</span>
            }
          </div>

          <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" formControlName="email" autocomplete="email">
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <span class="error">Inserisci un'email valida</span>
            }
          </div>

          <div class="field">
            <label for="password">Password</label>
            <input id="password" type="password" formControlName="password" autocomplete="new-password">
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <span class="error">Minimo 8 caratteri</span>
            }
          </div>

          <button class="btn btn--primary" type="submit" [disabled]="loading()">
            {{ loading() ? 'Creazione in corso…' : 'Crea account' }}
          </button>

          <p class="auth__switch">
            Hai già un account? <a routerLink="/login">Accedi</a>
          </p>
        </form>
      </main>
    </div>
  `,
  styles: `
    .auth { min-height: 100dvh; display: grid; }
    .auth__panel { display: grid; place-items: center; padding: 32px 20px; }
    .auth__form {
      width: min(380px, 100%);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    h1 { font-size: 30px; }
    .auth__sub { margin: -8px 0 0; color: var(--text-muted); }
    .auth__switch { font-size: 14px; color: var(--text-muted); }
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.serverError.set(null);

    const { nome, email, password } = this.form.getRawValue();
    this.auth.register(nome, email, password).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const body = err.error as ApiError | null;
        this.serverError.set(body?.errore ?? 'Registrazione non riuscita. Riprova.');
      },
    });
  }
}
