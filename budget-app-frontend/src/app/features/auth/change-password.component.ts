import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/models';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const nuova = group.get('nuovaPassword')?.value as string;
  const conferma = group.get('conferma')?.value as string;
  return nuova && conferma && nuova !== conferma ? { mismatch: true } : null;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <dialog #dlg class="sheet">
      @if (done()) {
        <div class="sheet__card">
          <h2>Password aggiornata</h2>
          <p class="note">
            Dalla prossima volta accedi con la nuova password.
          </p>
          <footer class="sheet__actions">
            <button type="button" class="btn btn--primary" (click)="close()">Chiudi</button>
          </footer>
        </div>
      } @else {
        <form class="sheet__card" [formGroup]="form" (ngSubmit)="submit()">
          <h2>Cambia password</h2>

          @if (serverError()) {
            <div class="alert" role="alert">{{ serverError() }}</div>
          }

          <div class="field">
            <label for="cp-attuale">Password attuale</label>
            <input
              id="cp-attuale"
              type="password"
              formControlName="passwordAttuale"
              autocomplete="current-password"
            >
            @if (form.controls.passwordAttuale.touched && form.controls.passwordAttuale.invalid) {
              <span class="error">La password attuale è obbligatoria</span>
            }
          </div>

          <div class="field">
            <label for="cp-nuova">Nuova password</label>
            <input
              id="cp-nuova"
              type="password"
              formControlName="nuovaPassword"
              autocomplete="new-password"
            >
            @if (form.controls.nuovaPassword.touched && form.controls.nuovaPassword.invalid) {
              <span class="error">Minimo 8 caratteri</span>
            }
          </div>

          <div class="field">
            <label for="cp-conferma">Conferma nuova password</label>
            <input
              id="cp-conferma"
              type="password"
              formControlName="conferma"
              autocomplete="new-password"
            >
            @if (form.controls.conferma.touched && form.errors?.['mismatch']) {
              <span class="error">Le password non coincidono</span>
            }
          </div>

          <footer class="sheet__actions">
            <button type="button" class="btn btn--ghost" (click)="close()">Annulla</button>
            <button type="submit" class="btn btn--primary" [disabled]="loading()">
              {{ loading() ? 'Salvataggio…' : 'Cambia password' }}
            </button>
          </footer>
        </form>
      }
    </dialog>
  `,
  styles: `
    .note { margin: 0; color: var(--text-muted); }
  `,
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  readonly loading = signal(false);
  readonly done = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      passwordAttuale: ['', Validators.required],
      nuovaPassword: ['', [Validators.required, Validators.minLength(8)]],
      conferma: ['', Validators.required],
    },
    { validators: [passwordsMatch] }
  );

  open(): void {
    this.done.set(false);
    this.serverError.set(null);
    this.loading.set(false);
    this.form.reset({ passwordAttuale: '', nuovaPassword: '', conferma: '' });
    this.dlg().nativeElement.showModal();
  }

  close(): void {
    this.dlg().nativeElement.close();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.serverError.set(null);

    const raw = this.form.getRawValue();
    this.auth.changePassword(raw.passwordAttuale, raw.nuovaPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.done.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const body = err.error as ApiError | null;
        this.serverError.set(body?.errore ?? 'Operazione non riuscita. Riprova.');
      },
    });
  }
}
