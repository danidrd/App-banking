import {
  Component,
  ElementRef,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AccountsService } from '../../core/api/accounts.service';
import { Account, ApiError } from '../../core/models';

@Component({
  selector: 'app-account-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <dialog #dlg class="sheet">
      <form class="sheet__card" [formGroup]="form" (ngSubmit)="submit()">
        <h2>{{ isEdit() ? 'Modifica conto' : 'Nuovo conto' }}</h2>

        @if (serverError()) {
          <div class="alert" role="alert">{{ serverError() }}</div>
        }

        <div class="field">
          <label for="acc-nome">Nome</label>
          <input
            id="acc-nome"
            type="text"
            formControlName="nome"
            placeholder="Es. Conto corrente"
          >
          @if (form.controls.nome.touched && form.controls.nome.invalid) {
            <span class="error">Il nome è obbligatorio</span>
          }
        </div>

        <div class="field">
          <label for="acc-tipo">Tipo</label>
          <select id="acc-tipo" formControlName="tipo">
            @if (customTipo(); as extra) {
              <option [value]="extra">{{ extra }}</option>
            }
            @for (t of tipi; track t) {
              <option [value]="t">{{ t }}</option>
            }
          </select>
        </div>

        <div class="row">
          @if (!isEdit()) {
            <div class="field">
              <label for="acc-saldo">Saldo iniziale</label>
              <input id="acc-saldo" type="number" step="0.01" formControlName="saldo">
            </div>
          }
          <div class="field">
            <label for="acc-valuta">Valuta</label>
            <select id="acc-valuta" formControlName="valuta">
              @for (v of valute; track v) {
                <option [value]="v">{{ v }}</option>
              }
            </select>
          </div>
        </div>

        @if (isEdit()) {
          <p class="hint">
            Il saldo non si modifica da qui: cambia solo tramite le transazioni.
          </p>
        }

        <footer class="sheet__actions">
          <button type="button" class="btn btn--ghost" (click)="close()">Annulla</button>
          <button type="submit" class="btn btn--primary" [disabled]="loading()">
            {{ loading() ? 'Salvataggio…' : (isEdit() ? 'Salva modifiche' : 'Crea conto') }}
          </button>
        </footer>
      </form>
    </dialog>
  `,
  styles: `
    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .hint {
      margin: -6px 0 0;
      font-size: 13px;
      color: var(--text-muted);
    }
  `,
})
export class AccountFormComponent {
  private fb = inject(FormBuilder);
  private api = inject(AccountsService);

  /** Emesso dopo un salvataggio riuscito: il genitore ricarica la lista. */
  readonly saved = output<void>();

  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  readonly tipi = ['corrente', 'risparmio', 'contanti', 'carta', 'investimento', 'altro'];
  readonly valute = ['EUR', 'USD', 'GBP', 'CHF', 'JPY'];

  private readonly editing = signal<Account | null>(null);
  readonly isEdit = computed(() => this.editing() !== null);

  /** Se il conto in modifica ha un tipo fuori dalla lista standard, lo mostriamo comunque. */
  readonly customTipo = computed(() => {
    const tipo = this.editing()?.tipo;
    return tipo && !this.tipi.includes(tipo) ? tipo : null;
  });

  readonly loading = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    tipo: ['corrente'],
    saldo: [0],
    valuta: ['EUR'],
  });

  open(account: Account | null): void {
    this.editing.set(account);
    this.serverError.set(null);
    this.loading.set(false);
    this.form.reset(
      account
        ? { nome: account.nome, tipo: account.tipo, saldo: 0, valuta: account.valuta }
        : { nome: '', tipo: 'corrente', saldo: 0, valuta: 'EUR' }
    );
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
    const editing = this.editing();

    const request = editing
      ? this.api.update(editing.id, {
          nome: raw.nome,
          tipo: raw.tipo,
          valuta: raw.valuta,
        })
      : this.api.create({
          nome: raw.nome,
          tipo: raw.tipo,
          saldo: raw.saldo ?? 0,
          valuta: raw.valuta,
        });

    request.subscribe({
      next: () => {
        this.loading.set(false);
        this.close();
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const body = err.error as ApiError | null;
        this.serverError.set(body?.errore ?? 'Operazione non riuscita. Riprova.');
      },
    });
  }
}
