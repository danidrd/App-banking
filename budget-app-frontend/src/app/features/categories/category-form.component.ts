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
import { CategoriesService } from '../../core/api/categories.service';
import { ApiError, Category, CategoryType } from '../../core/models';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <dialog #dlg class="sheet">
      <form class="sheet__card" [formGroup]="form" (ngSubmit)="submit()">
        <h2>{{ isEdit() ? 'Modifica categoria' : 'Nuova categoria' }}</h2>

        @if (serverError()) {
          <div class="alert" role="alert">{{ serverError() }}</div>
        }

        <div class="field">
          <label for="cat-nome">Nome</label>
          <input
            id="cat-nome"
            type="text"
            formControlName="nome"
            placeholder="Es. Alimentari"
          >
          @if (form.controls.nome.touched && form.controls.nome.invalid) {
            <span class="error">Il nome è obbligatorio</span>
          }
        </div>

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

        <footer class="sheet__actions">
          <button type="button" class="btn btn--ghost" (click)="close()">Annulla</button>
          <button type="submit" class="btn btn--primary" [disabled]="loading()">
            {{ loading() ? 'Salvataggio…' : (isEdit() ? 'Salva modifiche' : 'Crea categoria') }}
          </button>
        </footer>
      </form>
    </dialog>
  `,
  styles: `
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
  `,
})
export class CategoryFormComponent {
  private fb = inject(FormBuilder);
  private api = inject(CategoriesService);

  /** Emesso dopo un salvataggio riuscito: il genitore ricarica la lista. */
  readonly saved = output<void>();

  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  private readonly editing = signal<Category | null>(null);
  readonly isEdit = computed(() => this.editing() !== null);

  readonly loading = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    tipo: ['USCITA' as CategoryType],
  });

  /**
   * Apre la dialog. Con defaultTipo pre-seleziona il tipo giusto
   * quando la creazione parte dal gruppo Uscite o Entrate.
   */
  open(category: Category | null, defaultTipo: CategoryType = 'USCITA'): void {
    this.editing.set(category);
    this.serverError.set(null);
    this.loading.set(false);
    this.form.reset(
      category
        ? { nome: category.nome, tipo: category.tipo }
        : { nome: '', tipo: defaultTipo }
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

    const payload = this.form.getRawValue();
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
