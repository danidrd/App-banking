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
import { formatDate } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BudgetsService } from '../../core/api/budgets.service';
import { ApiError, Budget, Category } from '../../core/models';

/** La data di fine non può precedere quella di inizio (stessa regola del backend). */
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const inizio = group.get('dataInizio')?.value as string;
  const fine = group.get('dataFine')?.value as string;
  return inizio && fine && inizio > fine ? { dateRange: true } : null;
}

function toLocalIso(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

@Component({
  selector: 'app-budget-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <dialog #dlg class="sheet">
      <form class="sheet__card wide" [formGroup]="form" (ngSubmit)="submit()">
        <h2>{{ isEdit() ? 'Modifica budget' : 'Nuovo budget' }}</h2>

        @if (serverError()) {
          <div class="alert" role="alert">{{ serverError() }}</div>
        }

        <div class="field">
          <label for="bud-periodo">Nome del periodo</label>
          <input
            id="bud-periodo"
            type="text"
            formControlName="periodo"
            placeholder="Es. agosto 2026"
          >
          @if (form.controls.periodo.touched && form.controls.periodo.invalid) {
            <span class="error">Il nome del periodo è obbligatorio</span>
          }
        </div>

        <div class="row">
          <div class="field">
            <label for="bud-inizio">Dal</label>
            <input id="bud-inizio" type="date" formControlName="dataInizio">
          </div>
          <div class="field">
            <label for="bud-fine">Al</label>
            <input id="bud-fine" type="date" formControlName="dataFine">
          </div>
        </div>
        @if (form.errors?.['dateRange'] && (form.controls.dataFine.touched || form.controls.dataInizio.touched)) {
          <span class="error range-error">La data di fine deve essere successiva a quella di inizio</span>
        }

        <div class="lines" formArrayName="righe">
          <span class="lines__label">Limiti per categoria</span>
          @for (row of righe.controls; track row; let i = $index) {
            <div class="line" [formGroupName]="i">
              <select formControlName="categoryId" [attr.aria-label]="'Categoria riga ' + (i + 1)">
                <option value="" disabled>Scegli categoria</option>
                @for (category of optionsFor(i); track category.id) {
                  <option [value]="category.id">{{ category.nome }}</option>
                }
              </select>
              <input
                type="number"
                step="0.01"
                min="0.01"
                inputmode="decimal"
                placeholder="Limite €"
                formControlName="limite"
                [attr.aria-label]="'Limite riga ' + (i + 1)"
              >
              <button
                class="icon-btn icon-btn--danger"
                type="button"
                (click)="removeRow(i)"
                [disabled]="righe.length === 1"
                aria-label="Rimuovi riga"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round"><path d="M5 12h14"/></svg>
              </button>
            </div>
            @if (rowInvalid(i)) {
              <span class="error">Scegli una categoria e un limite maggiore di zero</span>
            }
          }

          <button
            class="btn btn--ghost add"
            type="button"
            (click)="addRow()"
            [disabled]="!canAddRow()"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Aggiungi categoria
          </button>
        </div>

        <footer class="sheet__actions">
          <button type="button" class="btn btn--ghost" (click)="close()">Annulla</button>
          <button type="submit" class="btn btn--primary" [disabled]="loading()">
            {{ loading() ? 'Salvataggio…' : (isEdit() ? 'Salva modifiche' : 'Crea budget') }}
          </button>
        </footer>
      </form>
    </dialog>
  `,
  styles: `
    .wide { width: min(520px, calc(100vw - 32px)); }
    @media (max-width: 819px) {
      .wide { width: 100%; }
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .range-error { margin-top: -8px; }

    .lines { display: flex; flex-direction: column; gap: 10px; }
    .lines__label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .line {
      display: grid;
      grid-template-columns: 1fr 120px 34px;
      gap: 8px;
      align-items: center;
    }
    .line select, .line input {
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--text);
      font-family: var(--font-body);
      font-size: 14.5px;
      min-width: 0;
    }
    .line select:focus, .line input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--focus-ring);
    }
    .add { align-self: flex-start; padding: 8px 12px; }
    .add svg { width: 16px; height: 16px; }
    .error { font-size: 13px; color: var(--negative); }
  `,
})
export class BudgetFormComponent {
  private fb = inject(FormBuilder);
  private api = inject(BudgetsService);

  /** Categorie dell'utente, caricate dal genitore. */
  readonly categories = input<Category[]>([]);

  /** Emesso dopo un salvataggio riuscito: il genitore ricarica la lista. */
  readonly saved = output<void>();

  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  private readonly editing = signal<Budget | null>(null);
  readonly isEdit = computed(() => this.editing() !== null);

  /**
   * I budget nel frontend sono limiti di spesa: proponiamo solo categorie
   * di uscita. Se un budget esistente (creato via API) referenzia una
   * categoria di entrata, la includiamo comunque per non nasconderla.
   */
  private readonly extra = signal<Category[]>([]);
  private readonly selectable = computed(() => {
    const uscite = this.categories()
      .filter(c => c.tipo === 'USCITA')
      .sort((a, b) => a.nome.localeCompare(b.nome));
    return [...uscite, ...this.extra()];
  });

  readonly loading = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.group(
    {
      periodo: this.fb.nonNullable.control('', Validators.required),
      dataInizio: this.fb.nonNullable.control('', Validators.required),
      dataFine: this.fb.nonNullable.control('', Validators.required),
      righe: this.fb.array<ReturnType<BudgetFormComponent['newRow']>>([]),
    },
    { validators: [dateRangeValidator] }
  );

  get righe() {
    return this.form.controls.righe;
  }

  private newRow(categoryId = '', limite: number | null = null) {
    return this.fb.group({
      categoryId: this.fb.nonNullable.control(categoryId, Validators.required),
      limite: this.fb.control<number | null>(limite, [
        Validators.required,
        Validators.min(0.01),
      ]),
    });
  }

  /** Opzioni della riga i: le categorie non già usate nelle altre righe. */
  optionsFor(index: number): Category[] {
    const current = this.righe.at(index).controls.categoryId.value;
    const usedElsewhere = new Set(
      this.righe.controls
        .filter((_, j) => j !== index)
        .map(r => r.controls.categoryId.value)
        .filter(Boolean)
    );
    return this.selectable().filter(
      c => c.id === current || !usedElsewhere.has(c.id)
    );
  }

  canAddRow(): boolean {
    return this.righe.length < this.selectable().length;
  }

  addRow(): void {
    this.righe.push(this.newRow());
  }

  removeRow(index: number): void {
    if (this.righe.length > 1) {
      this.righe.removeAt(index);
    }
  }

  rowInvalid(index: number): boolean {
    const row = this.righe.at(index);
    return row.touched && row.invalid;
  }

  open(budget: Budget | null): void {
    this.editing.set(budget);
    this.serverError.set(null);
    this.loading.set(false);
    this.righe.clear();

    if (budget) {
      const uscite = new Set(
        this.categories().filter(c => c.tipo === 'USCITA').map(c => c.id)
      );
      this.extra.set(
        this.categories().filter(
          c => !uscite.has(c.id) && budget.righe.some(r => r.categoryId === c.id)
        )
      );
      this.form.patchValue({
        periodo: budget.periodo,
        dataInizio: budget.dataInizio,
        dataFine: budget.dataFine,
      });
      for (const riga of budget.righe) {
        this.righe.push(this.newRow(riga.categoryId, riga.limite));
      }
    } else {
      this.extra.set([]);
      const now = new Date();
      const primo = new Date(now.getFullYear(), now.getMonth(), 1);
      const ultimo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      this.form.patchValue({
        periodo: formatDate(now, 'MMMM y', 'it'),
        dataInizio: toLocalIso(primo),
        dataFine: toLocalIso(ultimo),
      });
      this.righe.push(this.newRow());
    }
    this.form.markAsUntouched();
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
    const payload = {
      periodo: raw.periodo,
      dataInizio: raw.dataInizio,
      dataFine: raw.dataFine,
      righe: raw.righe.map(r => ({
        categoryId: r.categoryId,
        limite: r.limite ?? 0,
      })),
    };

    const editing = this.editing();
    const request = editing
      ? this.api.update(editing.id, payload)
      : this.api.create(payload);

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
