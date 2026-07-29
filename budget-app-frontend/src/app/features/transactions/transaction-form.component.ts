import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TransactionsService } from '../../core/api/transactions.service';
import {
  Account,
  ApiError,
  Category,
  CategoryType,
  Transaction,
} from '../../core/models';

/** Data odierna in formato YYYY-MM-DD nel fuso locale (niente sorprese UTC di sera). */
function todayLocalIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <dialog #dlg class="sheet">
      <form class="sheet__card" [formGroup]="form" (ngSubmit)="submit()">
        <h2>{{ isEdit() ? 'Modifica transazione' : 'Nuova transazione' }}</h2>

        @if (serverError()) {
          <div class="alert" role="alert">{{ serverError() }}</div>
        }

        <div class="field">
          <label>Tipo</label>
          <div class="seg">
            <label class="seg__opt">
              <input type="radio" formControlName="tipo" value="USCITA">
              <span>Uscita</span>
            </label>
            <label class="seg__opt">
              <input type="radio" formControlName="tipo" value="ENTRATA">
              <span>Entrata</span>
            </label>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label for="tx-importo">Importo</label>
            <input
              id="tx-importo"
              type="number"
              step="0.01"
              min="0.01"
              inputmode="decimal"
              placeholder="0,00"
              formControlName="importo"
            >
            @if (form.controls.importo.touched && form.controls.importo.invalid) {
              <span class="error">Inserisci un importo maggiore di zero</span>
            }
          </div>
          <div class="field">
            <label for="tx-data">Data</label>
            <input id="tx-data" type="date" formControlName="data">
            @if (form.controls.data.touched && form.controls.data.invalid) {
              <span class="error">La data è obbligatoria</span>
            }
          </div>
        </div>

        <div class="field">
          <label for="tx-conto">Conto</label>
          <select id="tx-conto" formControlName="accountId">
            @for (account of accounts(); track account.id) {
              <option [value]="account.id">{{ account.nome }}</option>
            }
          </select>
          @if (isEdit()) {
            <span class="hint">Il conto non è modificabile: elimina e ricrea la transazione se serve spostarla.</span>
          }
          @if (form.controls.accountId.touched && form.controls.accountId.invalid) {
            <span class="error">Scegli un conto</span>
          }
        </div>

        <div class="field">
          <label for="tx-categoria">Categoria</label>
          <select id="tx-categoria" formControlName="categoryId">
            <option value="">Nessuna categoria</option>
            @for (category of filteredCategories(); track category.id) {
              <option [value]="category.id">{{ category.nome }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label for="tx-descrizione">Descrizione <span class="optional">(facoltativa)</span></label>
          <input
            id="tx-descrizione"
            type="text"
            formControlName="descrizione"
            placeholder="Es. Spesa al supermercato"
          >
        </div>

        <label class="check">
          <input type="checkbox" formControlName="ricorrente">
          <span>Transazione ricorrente</span>
        </label>

        <footer class="sheet__actions">
          <button type="button" class="btn btn--ghost" (click)="close()">Annulla</button>
          <button type="submit" class="btn btn--primary" [disabled]="loading()">
            {{ loading() ? 'Salvataggio…' : (isEdit() ? 'Salva modifiche' : 'Registra') }}
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
    .seg {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      padding: 4px;
      background: var(--surface-2);
      border-radius: var(--radius);
    }
    .seg__opt { position: relative; }
    .seg__opt input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }
    .seg__opt span {
      display: block;
      text-align: center;
      padding: 9px 8px;
      border-radius: calc(var(--radius) - 4px);
      font-size: 14px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .seg__opt:has(input:checked) span {
      background: var(--surface);
      color: var(--text);
      box-shadow: var(--shadow);
    }
    .seg__opt:has(input:focus-visible) span {
      outline: 3px solid var(--focus-ring);
      outline-offset: -1px;
    }
    .hint { font-size: 12.5px; color: var(--text-muted); }
    .optional { font-weight: 400; color: var(--text-muted); }
    .check {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14.5px;
      cursor: pointer;
      user-select: none;
    }
    .check input {
      width: 18px;
      height: 18px;
      accent-color: var(--accent);
    }
  `,
})
export class TransactionFormComponent {
  private fb = inject(FormBuilder);
  private api = inject(TransactionsService);

  /** Liste caricate dal genitore: servono per le tendine. */
  readonly accounts = input<Account[]>([]);
  readonly categories = input<Category[]>([]);

  /** Emesso dopo un salvataggio riuscito: il genitore ricarica la lista. */
  readonly saved = output<void>();

  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  private readonly editing = signal<Transaction | null>(null);
  readonly isEdit = computed(() => this.editing() !== null);

  /** Tipo selezionato, tenuto in sync col form per filtrare le categorie. */
  private readonly tipoSel = signal<CategoryType>('USCITA');

  readonly filteredCategories = computed(() =>
    this.categories()
      .filter(c => c.tipo === this.tipoSel())
      .sort((a, b) => a.nome.localeCompare(b.nome))
  );

  readonly loading = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.group({
    tipo: this.fb.nonNullable.control<CategoryType>('USCITA'),
    importo: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    accountId: this.fb.nonNullable.control('', Validators.required),
    categoryId: this.fb.nonNullable.control(''),
    data: this.fb.nonNullable.control('', Validators.required),
    descrizione: this.fb.nonNullable.control(''),
    ricorrente: this.fb.nonNullable.control(false),
  });

  constructor() {
    // Cambio di tipo: aggiorna il filtro categorie e azzera la selezione
    // se la categoria scelta non è più compatibile.
    this.form.controls.tipo.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(tipo => {
        this.tipoSel.set(tipo);
        const selectedId = this.form.controls.categoryId.value;
        if (selectedId) {
          const selected = this.categories().find(c => c.id === selectedId);
          if (selected && selected.tipo !== tipo) {
            this.form.controls.categoryId.setValue('');
          }
        }
      });
  }

  open(transaction: Transaction | null): void {
    this.editing.set(transaction);
    this.serverError.set(null);
    this.loading.set(false);

    if (transaction) {
      const tipo: CategoryType = transaction.importo < 0 ? 'USCITA' : 'ENTRATA';
      this.form.reset({
        tipo,
        importo: Math.abs(transaction.importo),
        accountId: transaction.accountId,
        categoryId: transaction.categoryId ?? '',
        data: transaction.data,
        descrizione: transaction.descrizione ?? '',
        ricorrente: transaction.ricorrente,
      });
      // Il backend non permette di spostare una transazione su un altro conto
      // (UpdateTransactionRequest non ha accountId): il campo resta visibile ma bloccato.
      this.form.controls.accountId.disable();
    } else {
      this.form.reset({
        tipo: 'USCITA',
        importo: null,
        accountId: this.accounts()[0]?.id ?? '',
        categoryId: '',
        data: todayLocalIso(),
        descrizione: '',
        ricorrente: false,
      });
      this.form.controls.accountId.enable();
    }
    this.tipoSel.set(this.form.controls.tipo.value);
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
    const absolute = Math.abs(raw.importo ?? 0);
    const importo = raw.tipo === 'USCITA' ? -absolute : absolute;
    const categoryId = raw.categoryId || null;
    const descrizione = raw.descrizione.trim() || null;

    const editing = this.editing();
    const request = editing
      ? this.api.update(editing.id, {
          categoryId,
          importo,
          descrizione,
          data: raw.data,
          ricorrente: raw.ricorrente,
        })
      : this.api.create({
          accountId: raw.accountId,
          categoryId,
          importo,
          descrizione,
          data: raw.data,
          ricorrente: raw.ricorrente,
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
