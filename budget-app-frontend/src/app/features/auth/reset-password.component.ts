import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/models';

/** Le due password devono coincidere. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const nuova = group.get('nuovaPassword')?.value as string;
  const conferma = group.get('conferma')?.value as string;
  return nuova && conferma && nuova !== conferma ? { mismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth">
      <main class="auth__panel">
        @if (!token) {
          <div class="auth__form">
            <h1>Link non valido</h1>
            <p class="auth__sub">
              Questo indirizzo non contiene un token di reset. Richiedine uno nuovo.
            </p>
            <a class="btn btn--primary" routerLink="/forgot-password">Richiedi nuovo link</a>
          </div>
        } @else if (done()) {
          <div class="auth__form">
            <h1>Password aggiornata</h1>
            <p class="auth__sub">Ora puoi accedere con la nuova password.</p>
            <a class="btn btn--primary" routerLink="/login">Vai all'accesso</a>
          </div>
        } @else {
          <form class="auth__form" [formGroup]="form" (ngSubmit)="submit()">
            <h1>Nuova password</h1>
            <p class="auth__sub">Scegli la nuova password per il tuo account.</p>

            @if (serverError()) {
              <div class="alert" role="alert">
                {{ serverError() }}
                @if (invalidToken()) {
                  — <a routerLink="/forgot-password">richiedi un nuovo link</a>
                }
              </div>
            }

            <div class="field">
              <label for="rp-password">Nuova password</label>
              <input
                id="rp-password"
                type="password"
                formControlName="nuovaPassword"
                autocomplete="new-password"
              >
              @if (form.controls.nuovaPassword.touched && form.controls.nuovaPassword.invalid) {
                <span class="error">Minimo 8 caratteri</span>
              }
            </div>

            <div class="field">
              <label for="rp-conferma">Conferma password</label>
              <input
                id="rp-conferma"
                type="password"
                formControlName="conferma"
                autocomplete="new-password"
              >
              @if (form.controls.conferma.touched && form.errors?.['mismatch']) {
                <span class="error">Le password non coincidono</span>
              }
            </div>

            <button class="btn btn--primary" type="submit" [disabled]="loading()">
              {{ loading() ? 'Salvataggio…' : 'Imposta nuova password' }}
            </button>
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
    a.btn { align-self: flex-start; }
    a.btn:hover { text-decoration: none; }
    .alert a { color: inherit; font-weight: 600; }
  `,
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  /** Il token arriva dal link: /reset-password?token=... */
  readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');

  readonly loading = signal(false);
  readonly done = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly invalidToken = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      nuovaPassword: ['', [Validators.required, Validators.minLength(8)]],
      conferma: ['', Validators.required],
    },
    { validators: [passwordsMatch] }
  );

  submit(): void {
    if (this.form.invalid || !this.token) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.serverError.set(null);
    this.invalidToken.set(false);

    this.auth.resetPassword(this.token, this.form.getRawValue().nuovaPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.done.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const body = err.error as ApiError | null;
        if (body?.errore) {
          this.serverError.set(body.errore);
          this.invalidToken.set(true);
        } else {
          this.serverError.set('Operazione non riuscita. Riprova.');
        }
      },
    });
  }
}
