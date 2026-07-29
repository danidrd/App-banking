import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BudgetsService } from '../../core/api/budgets.service';
import { CategoriesService } from '../../core/api/categories.service';
import { TransactionsService } from '../../core/api/transactions.service';
import { Budget, Category, Transaction } from '../../core/models';
import { BudgetFormComponent } from './budget-form.component';

type LoadState = 'loading' | 'ready' | 'error';
type LineLevel = 'ok' | 'warn' | 'over';
type BudgetStatus = 'futuro' | 'attivo' | 'concluso';

interface LineView {
  nome: string;
  limite: number;
  speso: number;
  pct: number;
  level: LineLevel;
}

interface BudgetView {
  budget: Budget;
  lines: LineView[];
  totaleLimite: number;
  totaleSpeso: number;
  pct: number;
  level: LineLevel;
  status: BudgetStatus;
  statusLabel: string;
}

function todayLocalIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function levelFor(speso: number, limite: number): LineLevel {
  if (speso > limite) return 'over';
  if (limite > 0 && speso / limite >= 0.8) return 'warn';
  return 'ok';
}

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, BudgetFormComponent],
  template: `
    <header class="head">
      <div>
        <h1>Budget</h1>
        <p class="head__sub">I limiti che ti sei dato, e come stai andando.</p>
      </div>
      <button
        class="btn btn--primary"
        type="button"
        (click)="openNew()"
        [disabled]="state() === 'ready' && usciteCount() === 0"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        Nuovo budget
      </button>
    </header>

    @switch (state()) {
      @case ('loading') {
        <div class="card skeleton" aria-hidden="true"></div>
      }
      @case ('error') {
        <div class="alert" role="alert">
          Impossibile caricare i budget.
          <button class="btn btn--ghost" type="button" (click)="load()">Riprova</button>
        </div>
      }
      @case ('ready') {
        @if (usciteCount() === 0) {
          <div class="card empty">
            <h2>Prima servono le categorie</h2>
            <p>Un budget è un limite di spesa per categoria: crea qualche categoria di uscita per iniziare.</p>
            <a class="btn btn--primary" routerLink="/categorie">Vai alle categorie</a>
          </div>
        } @else if (views().length === 0) {
          <div class="card empty">
            <h2>Nessun budget, per ora</h2>
            <p>Imposta il primo limite mensile e guarda le barre riempirsi (con calma).</p>
            <button class="btn btn--primary" type="button" (click)="openNew()">Crea budget</button>
          </div>
        } @else {
          <div class="grid">
            @for (view of views(); track view.budget.id) {
              <article class="card bud">
                <header class="bud__head">
                  <div class="bud__title">
                    <h2>{{ view.budget.periodo }}</h2>
                    <span class="bud__dates">
                      {{ view.budget.dataInizio | date : 'd MMM' }} – {{ view.budget.dataFine | date : 'd MMM y' }}
                    </span>
                  </div>
                  <div class="bud__actions">
                    <span class="status" [class]="'status--' + view.status">{{ view.statusLabel }}</span>
                    <button
                      class="icon-btn"
                      type="button"
                      (click)="openEdit(view.budget)"
                      [attr.aria-label]="'Modifica ' + view.budget.periodo"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                           stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                      </svg>
                    </button>
                    <button
                      class="icon-btn icon-btn--danger"
                      type="button"
                      (click)="askDelete(view.budget)"
                      [attr.aria-label]="'Elimina ' + view.budget.periodo"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                           stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>
                      </svg>
                    </button>
                  </div>
                </header>

                <div class="bud__total">
                  <span class="bud__spent amount" [class]="'txt--' + view.level">
                    {{ view.totaleSpeso | currency : 'EUR' }}
                  </span>
                  <span class="bud__of">di {{ view.totaleLimite | currency : 'EUR' }}</span>
                </div>
                <div class="bar bar--big">
                  <div class="bar__fill" [class]="'bar__fill--' + view.level" [style.width.%]="view.pct"></div>
                </div>

                <ul class="bud__lines">
                  @for (line of view.lines; track line.nome) {
                    <li class="line">
                      <div class="line__top">
                        <span class="line__name">{{ line.nome }}</span>
                        <span class="line__nums">
                          <span [class]="'txt--' + line.level">{{ line.speso | currency : 'EUR' }}</span>
                          <span class="line__of"> / {{ line.limite | currency : 'EUR' }}</span>
                        </span>
                      </div>
                      <div class="bar">
                        <div class="bar__fill" [class]="'bar__fill--' + line.level" [style.width.%]="line.pct"></div>
                      </div>
                    </li>
                  }
                </ul>
              </article>
            }
          </div>
        }
      }
    }

    <app-budget-form [categories]="categories()" (saved)="load()" />

    <dialog #deleteDlg class="sheet">
      <div class="sheet__card">
        <h2>Eliminare il budget?</h2>
        <p class="confirm__text">
          Stai per eliminare <strong>{{ deleteTarget()?.periodo }}</strong> con tutti i suoi limiti.
          Le transazioni registrate non vengono toccate.
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

    .grid { display: grid; gap: 16px; align-items: start; }
    @media (min-width: 900px) {
      .grid { grid-template-columns: 1fr 1fr; }
    }

    .bud { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
    .bud__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .bud__title h2 { font-size: 19px; }
    .bud__title h2::first-letter { text-transform: uppercase; }
    .bud__dates { font-size: 13px; color: var(--text-muted); }
    .bud__actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

    .status {
      font-size: 12px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
      white-space: nowrap;
    }
    .status--attivo { background: var(--accent-soft); color: var(--accent); }
    .status--futuro { background: var(--surface-2); color: var(--text-muted); }
    .status--concluso { background: var(--surface-2); color: var(--text-muted); }

    .bud__total { display: flex; align-items: baseline; gap: 8px; }
    .bud__spent { font-size: 30px; font-weight: 700; }
    .bud__of { font-size: 14px; color: var(--text-muted); }

    .txt--ok { color: var(--text); }
    .txt--warn { color: var(--warn); }
    .txt--over { color: var(--negative); }
    .bud__spent.txt--ok { color: var(--text); }

    .bar {
      height: 6px;
      border-radius: 999px;
      background: var(--surface-2);
      overflow: hidden;
    }
    .bar--big { height: 8px; }
    .bar__fill {
      height: 100%;
      border-radius: 999px;
      transition: width 0.3s ease;
    }
    .bar__fill--ok { background: var(--accent); }
    .bar__fill--warn { background: var(--warn); }
    .bar__fill--over { background: var(--negative); }

    .bud__lines {
      list-style: none;
      margin: 4px 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .line__top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 5px;
      font-size: 14px;
    }
    .line__name {
      font-weight: 600;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .line__nums { font-variant-numeric: tabular-nums; flex-shrink: 0; }
    .line__of { color: var(--text-muted); }

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
    .empty a.btn:hover { text-decoration: none; }

    .confirm__text { margin: 0; color: var(--text-muted); }

    .skeleton {
      height: 240px;
      background: linear-gradient(100deg, var(--surface) 40%, var(--surface-2) 50%, var(--surface) 60%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer { to { background-position: -200% 0; } }
  `,
})
export class BudgetsComponent {
  private budgetsApi = inject(BudgetsService);
  private categoriesApi = inject(CategoriesService);
  private transactionsApi = inject(TransactionsService);

  readonly state = signal<LoadState>('loading');
  readonly budgets = signal<Budget[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly transactions = signal<Transaction[]>([]);

  readonly usciteCount = computed(
    () => this.categories().filter(c => c.tipo === 'USCITA').length
  );

  private readonly categoriesById = computed(
    () => new Map(this.categories().map(c => [c.id, c]))
  );

  readonly views = computed<BudgetView[]>(() => {
    const cats = this.categoriesById();
    const txs = this.transactions();
    const today = todayLocalIso();

    return [...this.budgets()]
      .sort((a, b) => b.dataInizio.localeCompare(a.dataInizio))
      .map(budget => {
        const lines: LineView[] = budget.righe.map(riga => {
          const speso = txs
            .filter(
              t =>
                t.categoryId === riga.categoryId &&
                t.importo < 0 &&
                t.data >= budget.dataInizio &&
                t.data <= budget.dataFine
            )
            .reduce((sum, t) => sum + Math.abs(t.importo), 0);
          const pct = riga.limite > 0 ? Math.min(100, (speso / riga.limite) * 100) : 100;
          return {
            nome: cats.get(riga.categoryId)?.nome ?? 'Categoria eliminata',
            limite: riga.limite,
            speso,
            pct,
            level: levelFor(speso, riga.limite),
          };
        });

        const totaleLimite = lines.reduce((s, l) => s + l.limite, 0);
        const totaleSpeso = lines.reduce((s, l) => s + l.speso, 0);
        const pct = totaleLimite > 0 ? Math.min(100, (totaleSpeso / totaleLimite) * 100) : 100;

        let status: BudgetStatus;
        let statusLabel: string;
        if (today < budget.dataInizio) {
          status = 'futuro';
          statusLabel = 'In arrivo';
        } else if (today > budget.dataFine) {
          status = 'concluso';
          statusLabel = 'Concluso';
        } else {
          status = 'attivo';
          const end = new Date(`${budget.dataFine}T00:00:00`);
          const now = new Date(`${today}T00:00:00`);
          const giorni = Math.round((end.getTime() - now.getTime()) / 86_400_000);
          statusLabel =
            giorni === 0
              ? 'Ultimo giorno'
              : `${giorni} ${giorni === 1 ? 'giorno rimasto' : 'giorni rimasti'}`;
        }

        return {
          budget,
          lines,
          totaleLimite,
          totaleSpeso,
          pct,
          level: levelFor(totaleSpeso, totaleLimite),
          status,
          statusLabel,
        };
      });
  });

  readonly deleteTarget = signal<Budget | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  private formCmp = viewChild.required(BudgetFormComponent);
  private deleteDlg = viewChild.required<ElementRef<HTMLDialogElement>>('deleteDlg');

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    forkJoin({
      budgets: this.budgetsApi.list(),
      categories: this.categoriesApi.list(),
      transactions: this.transactionsApi.list(),
    }).subscribe({
      next: ({ budgets, categories, transactions }) => {
        this.budgets.set(budgets);
        this.categories.set(categories);
        this.transactions.set(transactions);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  openNew(): void {
    this.formCmp().open(null);
  }

  openEdit(budget: Budget): void {
    this.formCmp().open(budget);
  }

  askDelete(budget: Budget): void {
    this.deleteTarget.set(budget);
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
    this.budgetsApi.delete(target.id).subscribe({
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
