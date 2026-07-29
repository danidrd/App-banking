import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { CategoriesService } from '../../core/api/categories.service';
import { Category, CategoryType } from '../../core/models';
import { CategoryFormComponent } from './category-form.component';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CategoryFormComponent],
  template: `
    <header class="head">
      <div>
        <h1>Categorie</h1>
        <p class="head__sub">Le etichette con cui classifichi entrate e uscite.</p>
      </div>
      <button class="btn btn--primary" type="button" (click)="openNew('USCITA')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        Nuova categoria
      </button>
    </header>

    @switch (state()) {
      @case ('loading') {
        <div class="cols" aria-hidden="true">
          <div class="card skeleton"></div>
          <div class="card skeleton"></div>
        </div>
      }
      @case ('error') {
        <div class="alert" role="alert">
          Impossibile caricare le categorie.
          <button class="btn btn--ghost" type="button" (click)="load()">Riprova</button>
        </div>
      }
      @case ('ready') {
        @if (categories().length === 0) {
          <div class="card empty">
            <h2>Nessuna categoria, per ora</h2>
            <p>Crea le prime categorie per dare un nome alle tue spese.</p>
            <button class="btn btn--primary" type="button" (click)="openNew('USCITA')">
              Crea categoria
            </button>
          </div>
        } @else {
          <div class="cols">
            <section class="card group">
              <header class="group__head">
                <span class="dot dot--out" aria-hidden="true"></span>
                <h2>Uscite</h2>
                <span class="group__count">{{ uscite().length }}</span>
              </header>
              @if (uscite().length === 0) {
                <p class="group__empty">
                  Nessuna categoria di uscita.
                  <button class="linklike" type="button" (click)="openNew('USCITA')">Creane una</button>
                </p>
              } @else {
                <ul class="group__list">
                  @for (category of uscite(); track category.id) {
                    <li class="row">
                      <span class="row__name">{{ category.nome }}</span>
                      <div class="row__actions">
                        <button
                          class="icon-btn"
                          type="button"
                          (click)="openEdit(category)"
                          [attr.aria-label]="'Modifica ' + category.nome"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                               stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                          </svg>
                        </button>
                        <button
                          class="icon-btn icon-btn--danger"
                          type="button"
                          (click)="askDelete(category)"
                          [attr.aria-label]="'Elimina ' + category.nome"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                               stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>
                          </svg>
                        </button>
                      </div>
                    </li>
                  }
                </ul>
              }
            </section>

            <section class="card group">
              <header class="group__head">
                <span class="dot dot--in" aria-hidden="true"></span>
                <h2>Entrate</h2>
                <span class="group__count">{{ entrate().length }}</span>
              </header>
              @if (entrate().length === 0) {
                <p class="group__empty">
                  Nessuna categoria di entrata.
                  <button class="linklike" type="button" (click)="openNew('ENTRATA')">Creane una</button>
                </p>
              } @else {
                <ul class="group__list">
                  @for (category of entrate(); track category.id) {
                    <li class="row">
                      <span class="row__name">{{ category.nome }}</span>
                      <div class="row__actions">
                        <button
                          class="icon-btn"
                          type="button"
                          (click)="openEdit(category)"
                          [attr.aria-label]="'Modifica ' + category.nome"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                               stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                          </svg>
                        </button>
                        <button
                          class="icon-btn icon-btn--danger"
                          type="button"
                          (click)="askDelete(category)"
                          [attr.aria-label]="'Elimina ' + category.nome"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                               stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>
                          </svg>
                        </button>
                      </div>
                    </li>
                  }
                </ul>
              }
            </section>
          </div>
        }
      }
    }

    <app-category-form (saved)="load()" />

    <dialog #deleteDlg class="sheet">
      <div class="sheet__card">
        <h2>Eliminare la categoria?</h2>
        <p class="confirm__text">
          Stai per eliminare <strong>{{ deleteTarget()?.nome }}</strong>.
          Le transazioni già registrate resteranno, ma senza categoria.
        </p>
        @if (deleteError()) {
          <div class="alert" role="alert">{{ deleteError() }}</div>
        }
        <footer class="sheet__actions">
          <button type="button" class="btn btn--ghost" (click)="cancelDelete()">Annulla</button>
          <button
            type="button"
            class="btn btn--danger"
            (click)="confirmDelete()"
            [disabled]="deleting()"
          >
            {{ deleting() ? 'Eliminazione…' : 'Elimina' }}
          </button>
        </footer>
      </div>
    </dialog>
  `,
  styles: `
    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
    }
    .head h1 { font-size: 26px; }
    .head__sub { margin: 4px 0 0; color: var(--text-muted); }
    .head .btn svg { width: 18px; height: 18px; }

    .cols { display: grid; gap: 16px; align-items: start; }
    @media (min-width: 720px) {
      .cols { grid-template-columns: 1fr 1fr; }
    }

    .group { padding: 20px; }
    .group__head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .group__head h2 { font-size: 18px; }
    .group__count {
      margin-left: auto;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--surface-2);
      border-radius: 999px;
      padding: 2px 10px;
    }
    .dot { width: 9px; height: 9px; border-radius: 50%; }
    .dot--in { background: var(--accent); }
    .dot--out { background: var(--text-muted); }

    .group__list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 9px 0;
      border-top: 1px solid var(--border);
    }
    .row__name {
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .row__actions { display: flex; gap: 2px; flex-shrink: 0; }

    .group__empty {
      margin: 8px 0 4px;
      font-size: 14px;
      color: var(--text-muted);
    }
    .linklike {
      background: none;
      border: none;
      padding: 0;
      font: inherit;
      color: var(--accent);
      cursor: pointer;
    }
    .linklike:hover { text-decoration: underline; }

    .empty {
      padding: 36px 28px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .empty h2 { font-size: 20px; }
    .empty p { margin: 0 0 8px; color: var(--text-muted); }

    .confirm__text { margin: 0; color: var(--text-muted); }

    .skeleton {
      height: 180px;
      background: linear-gradient(100deg, var(--surface) 40%, var(--surface-2) 50%, var(--surface) 60%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer { to { background-position: -200% 0; } }
  `,
})
export class CategoriesComponent {
  private api = inject(CategoriesService);

  readonly state = signal<LoadState>('loading');
  readonly categories = signal<Category[]>([]);

  readonly uscite = computed(() =>
    this.categories()
      .filter(c => c.tipo === 'USCITA')
      .sort((a, b) => a.nome.localeCompare(b.nome))
  );
  readonly entrate = computed(() =>
    this.categories()
      .filter(c => c.tipo === 'ENTRATA')
      .sort((a, b) => a.nome.localeCompare(b.nome))
  );

  readonly deleteTarget = signal<Category | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  private formCmp = viewChild.required(CategoryFormComponent);
  private deleteDlg = viewChild.required<ElementRef<HTMLDialogElement>>('deleteDlg');

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.api.list().subscribe({
      next: categories => {
        this.categories.set(categories);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  openNew(tipo: CategoryType): void {
    this.formCmp().open(null, tipo);
  }

  openEdit(category: Category): void {
    this.formCmp().open(category);
  }

  askDelete(category: Category): void {
    this.deleteTarget.set(category);
    this.deleteError.set(null);
    this.deleting.set(false);
    this.deleteDlg().nativeElement.showModal();
  }

  cancelDelete(): void {
    this.deleteDlg().nativeElement.close();
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.deleting.set(true);
    this.deleteError.set(null);
    this.api.delete(target.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.cancelDelete();
        this.load();
      },
      error: () => {
        this.deleting.set(false);
        this.deleteError.set('Eliminazione non riuscita. Riprova.');
      },
    });
  }
}
