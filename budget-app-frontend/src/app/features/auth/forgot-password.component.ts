import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth">
      <main class="auth__panel">
        @if (sent()) {
          <div class="auth__form done">
            <h1>Controlla la posta</h1>
            <p class="auth__sub">
              Se l'email è registrata, riceverai un link per reimpostare la
              password. Il link vale 30 minuti.
            </p>
            <a class="btn btn--primary" routerLink="/login">Torna all'accesso</a>
          </div>
        } @else {
          <form class="auth__form" [formGroup]="form" (ngSubmit)="submit()">
            <h1>Password dimenticata?</h1>
            <p class="auth__sub">
              Inserisci la tua email: ti invieremo un link per reimpostarla.
            </p>

            @if (serverError()) {
              <div class="alert" role="alert">{{ serverError() }}</div>
            }

            <div class="field">
              <label for="fp-email">Email</label>
              <input id="fp-email" type="email" formControlName="email" autocomplete="email">
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <span class="error">Inserisci un'email valida</span>
              }
            </div>

            <button class="btn btn--primary" type="submit" [disabled]="loading()">
              {{ loading() ? 'Invio in corso…' : 'Invia link di reset' }}
            </button>

            <p class="auth__switch">
              Ricordata? <a routerLink="/login">Accedi</a>
            </p>
          </form>
        }
      </main>
    </div>
  `,
  styles: `
    .auth { min-height: 100dvh; display: grid; }
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
    .done a.btn { align-self: flex-start; }
    .done a.btn:hover { text-decoration: none; }
  `,
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  readonly loading = signal(false);
  readonly sent = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.serverError.set(null);

    this.auth.forgotPassword(this.form.getRawValue().email).subscribe({
      next: () => {
        this.loading.set(false);
        this.sent.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.serverError.set('Invio non riuscito. Verifica la connessione e riprova.');
      },
    });
  }
}
