import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { CurrencyPipe, DatePipe, formatDate } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AccountsService } from '../../core/api/accounts.service';
import { CategoriesService } from '../../core/api/categories.service';
import { TransactionsService } from '../../core/api/transactions.service';
import { Account, Category, Transaction } from '../../core/models';
import { TransactionFormComponent } from './transaction-form.component';

type LoadState = 'loading' | 'ready' | 'error';
type TipoFilter = 'all' | 'USCITA' | 'ENTRATA';

interface DayGroup {
  data: string;
  items: Transaction[];
  /** Totale del giorno; null se nel giorno convivono valute diverse. */
  totale: number | null;
  valuta: string;
}

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, TransactionFormComponent],
  template: `
    <header class="head">
      <div>
        <h1>Transazioni</h1>
        <p class="head__sub">Ogni movimento, in ordine di tempo.</p>
      </div>
      <button
        class="btn btn--primary"
        type="button"
        (click)="openNew()"
        [disabled]="state() === 'ready' && accounts().length === 0"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        Nuova transazione
      </button>
    </header>

    @switch (state()) {
      @case ('loading') {
        <div class="card skeleton" aria-hidden="true"></div>
      }
      @case ('error') {
        <div class="alert" role="alert">
          Impossibile caricare le transazioni.
          <button class="btn btn--ghost" type="button" (click)="load()">Riprova</button>
        </div>
      }
      @case ('ready') {
        @if (accounts().length === 0) {
          <div class="card empty">
            <h2>Prima serve un conto</h2>
            <p>Le transazioni vivono dentro un conto: creane uno per iniziare.</p>
            <a class="btn btn--primary" routerLink="/conti">Vai ai conti</a>
          </div>
        } @else if (transactions().length === 0) {
          <div class="card empty">
            <h2>Nessuna transazione, per ora</h2>
            <p>Registra il primo movimento per vederlo comparire qui.</p>
            <button class="btn btn--primary" type="button" (click)="openNew()">
              Registra transazione
            </button>
          </div>
        } @else {
          <div class="filters">
            <select
              class="filters__select"
              [value]="accountFilter()"
              (change)="onAccountFilter($event)"
              aria-label="Filtra per conto"
            >
              <option value="all">Tutti i conti</option>
              @for (account of accounts(); track account.id) {
                <option [value]="account.id">{{ account.nome }}</option>
              }
            </select>
            <select
              class="filters__select"
              [value]="yearFilter()"
              (change)="onYearFilter($event)"
              aria-label="Filtra per anno"
            >
              <option value="all">Tutti gli anni</option>
              @for (year of availableYears(); track year) {
                <option [value]="year">{{ year }}</option>
              }
            </select>
            <select
              class="filters__select"
              [value]="monthFilter()"
              (change)="onMonthFilter($event)"
              aria-label="Filtra per mese"
            >
              <option value="all">Tutti i mesi</option>
              @for (month of availableMonths(); track month) {
                <option [value]="month">{{ monthLabel(month) }}</option>
              }
            </select>
            <select
              class="filters__select"
              [value]="categoryFilter()"
              (change)="onCategoryFilter($event)"
              aria-label="Filtra per categoria"
            >
              <option value="all">Tutte le categorie</option>
              <option value="none">Senza categoria</option>
              @for (category of categories(); track category.id) {
                <option [value]="category.id">{{ category.nome }}</option>
              }
            </select>

            <div class="chips" role="group" aria-label="Filtra per tipo">
              <button
                type="button"
                class="chip"
                [class.chip--on]="tipoFilter() === 'all'"
                (click)="tipoFilter.set('all')"
              >Tutte</button>
              <button
                type="button"
                class="chip"
                [class.chip--on]="tipoFilter() === 'USCITA'"
                (click)="tipoFilter.set('USCITA')"
              >Uscite</button>
              <button
                type="button"
                class="chip"
                [class.chip--on]="tipoFilter() === 'ENTRATA'"
                (click)="tipoFilter.set('ENTRATA')"
              >Entrate</button>
            </div>

            @if (hasActiveFilters()) {
              <button type="button" class="filters__reset" (click)="resetFilters()">
                Azzera filtri
              </button>
            }
          </div>

          @if (groups().length === 0) {
            <div class="card empty">
              <h2>Nessun risultato</h2>
              <p>Nessuna transazione corrisponde ai filtri scelti.</p>
              <button class="btn btn--ghost" type="button" (click)="resetFilters()">
                Azzera filtri
              </button>
            </div>
          } @else {
            @for (group of groups(); track group.data) {
              <section class="day">
                <header class="day__head">
                  <span class="day__date">{{ group.data | date : 'EEEE d MMMM' }}</span>
                  @if (group.totale !== null) {
                    <span
                      class="day__total amount"
                      [class.day__total--in]="group.totale > 0"
                    >{{ group.totale > 0 ? '+' : '' }}{{ group.totale | currency : group.valuta }}</span>
                  }
                </header>
                <ul class="card day__list">
                  @for (transaction of group.items; track transaction.id) {
                    <li class="tx">
                      <div class="tx__main">
                        <span class="tx__title">
                          {{ categoryName(transaction.categoryId) }}
                          @if (transaction.ricorrente) {
                            <svg class="tx__loop" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                 aria-label="Ricorrente" role="img">
                              <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/>
                            </svg>
                          }
                          @if (transaction.trasferimentoInterno) {
                            <span class="tx__transfer-tag" title="Trasferimento tra i tuoi conti: escluso dai calcoli di spesa">
                              trasferimento
                            </span>
                          }
                        </span>
                        <span class="tx__meta">
                          @if (transaction.descrizione) {
                            {{ transaction.descrizione }} ·
                          }
                          {{ accountName(transaction.accountId) }}
                        </span>
                      </div>
                      <span
                        class="tx__amount amount"
                        [class.tx__amount--in]="transaction.importo > 0"
                      >{{ transaction.importo > 0 ? '+' : '' }}{{ transaction.importo | currency : accountCurrency(transaction.accountId) }}</span>
                      <div class="tx__actions">
                        <button
                          class="icon-btn"
                          type="button"
                          (click)="openEdit(transaction)"
                          aria-label="Modifica transazione"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                               stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                          </svg>
                        </button>
                        <button
                          class="icon-btn icon-btn--danger"
                          type="button"
                          (click)="askDelete(transaction)"
                          aria-label="Elimina transazione"
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
              </section>
            }
          }
        }
      }
    }

    <app-transaction-form
      [accounts]="accounts()"
      [categories]="categories()"
      (saved)="load()"
    />

    <dialog #deleteDlg class="sheet">
      <div class="sheet__card">
        <h2>Eliminare la transazione?</h2>
        <p class="confirm__text">
          Il saldo del conto verrà aggiornato di conseguenza.
          L'operazione non può essere annullata.
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
      margin-bottom: 20px;
    }
    .head h1 { font-size: 26px; }
    .head__sub { margin: 4px 0 0; color: var(--text-muted); }
    .head .btn svg { width: 18px; height: 18px; }

    .filters {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }
    .filters__select {
      padding: 9px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--text);
      font-family: var(--font-body);
      font-size: 14px;
    }
    .chips { display: flex; gap: 6px; }
    .filters__reset {
      background: none;
      border: none;
      color: var(--text-muted);
      font-family: var(--font-body);
      font-size: 13px;
      text-decoration: underline;
      cursor: pointer;
      padding: 8px 4px;
    }
    .filters__reset:hover { color: var(--text); }
    .chip {
      padding: 8px 14px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--surface);
      color: var(--text-muted);
      font-family: var(--font-body);
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
    }
    .chip--on {
      background: var(--accent-soft);
      border-color: transparent;
      color: var(--accent);
    }

    .day { margin-bottom: 18px; }
    .day__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      padding: 0 4px 8px;
    }
    .day__date {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .day__date::first-letter { text-transform: uppercase; }
    .day__total { font-size: 13px; font-weight: 600; color: var(--text-muted); }
    .day__total--in { color: var(--accent); }

    .day__list { list-style: none; margin: 0; padding: 0 4px; }
    .tx {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
    }
    .tx + .tx { border-top: 1px solid var(--border); }
    .tx__main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .tx__title {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tx__loop { width: 14px; height: 14px; color: var(--text-muted); flex-shrink: 0; }
    .tx__transfer-tag {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      color: var(--text-muted);
      background: var(--surface-2);
      border-radius: 999px;
      padding: 2px 8px;
      flex-shrink: 0;
    }
    .tx__meta {
      font-size: 13px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tx__amount { font-size: 16px; font-weight: 600; flex-shrink: 0; }
    .tx__amount--in { color: var(--accent); }
    .tx__actions { display: flex; gap: 2px; flex-shrink: 0; }

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
      height: 220px;
      background: linear-gradient(100deg, var(--surface) 40%, var(--surface-2) 50%, var(--surface) 60%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer { to { background-position: -200% 0; } }

    @media (max-width: 560px) {
      .tx__actions { display: none; }
      .tx:hover .tx__actions, .tx:focus-within .tx__actions { display: flex; }
    }
  `,
})
export class TransactionsComponent {
  private transactionsApi = inject(TransactionsService);
  private accountsApi = inject(AccountsService);
  private categoriesApi = inject(CategoriesService);

  readonly state = signal<LoadState>('loading');
  readonly transactions = signal<Transaction[]>([]);
  readonly accounts = signal<Account[]>([]);
  readonly categories = signal<Category[]>([]);

  readonly accountFilter = signal<string>('all');
  readonly tipoFilter = signal<TipoFilter>('all');
  readonly yearFilter = signal<string>('all');
  readonly monthFilter = signal<string>('all');
  readonly categoryFilter = signal<string>('all');

  private readonly accountsById = computed(
    () => new Map(this.accounts().map(a => [a.id, a]))
  );
  private readonly categoriesById = computed(
    () => new Map(this.categories().map(c => [c.id, c]))
  );

  /** Anni (formato 'YYYY') che compaiono davvero nei dati, più recente per primo. */
  readonly availableYears = computed(() => {
    const years = new Set<string>();
    for (const t of this.transactions()) {
      years.add(t.data.slice(0, 4));
    }
    return [...years].sort((a, b) => b.localeCompare(a));
  });

  /**
   * Mesi (formato 'YYYY-MM') disponibili — se è scelto un anno specifico,
   * la lista si restringe ai soli mesi di quell'anno (evita l'elenco lungo
   * e ripetitivo tipo "Agosto 2026, Agosto 2025, Luglio 2026...").
   */
  readonly availableMonths = computed(() => {
    const year = this.yearFilter();
    const months = new Set<string>();
    for (const t of this.transactions()) {
      const ym = t.data.slice(0, 7);
      if (year !== 'all' && !ym.startsWith(year)) continue;
      months.add(ym);
    }
    return [...months].sort((a, b) => b.localeCompare(a));
  });

  readonly hasActiveFilters = computed(
    () =>
      this.accountFilter() !== 'all' ||
      this.tipoFilter() !== 'all' ||
      this.yearFilter() !== 'all' ||
      this.monthFilter() !== 'all' ||
      this.categoryFilter() !== 'all'
  );

  private readonly filtered = computed(() => {
    const account = this.accountFilter();
    const tipo = this.tipoFilter();
    const year = this.yearFilter();
    const month = this.monthFilter();
    const category = this.categoryFilter();
    return this.transactions().filter(t => {
      if (account !== 'all' && t.accountId !== account) return false;
      if (tipo === 'USCITA' && t.importo >= 0) return false;
      if (tipo === 'ENTRATA' && t.importo < 0) return false;
      if (year !== 'all' && t.data.slice(0, 4) !== year) return false;
      if (month !== 'all' && t.data.slice(0, 7) !== month) return false;
      if (category === 'none' && t.categoryId !== null) return false;
      if (category !== 'all' && category !== 'none' && t.categoryId !== category) return false;
      return true;
    });
  });

  readonly groups = computed<DayGroup[]>(() => {
    const byId = this.accountsById();
    const map = new Map<string, Transaction[]>();
    for (const t of this.filtered()) {
      const list = map.get(t.data);
      if (list) list.push(t);
      else map.set(t.data, [t]);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([data, items]) => {
        const currencies = new Set(
          items.map(i => byId.get(i.accountId)?.valuta ?? 'EUR')
        );
        const single = currencies.size === 1;
        return {
          data,
          items: [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          totale: single ? items.reduce((sum, i) => sum + i.importo, 0) : null,
          valuta: [...currencies][0] ?? 'EUR',
        };
      });
  });

  readonly deleteTarget = signal<Transaction | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  private formCmp = viewChild.required(TransactionFormComponent);
  private deleteDlg = viewChild.required<ElementRef<HTMLDialogElement>>('deleteDlg');

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    forkJoin({
      transactions: this.transactionsApi.list(),
      accounts: this.accountsApi.list(),
      categories: this.categoriesApi.list(),
    }).subscribe({
      next: ({ transactions, accounts, categories }) => {
        this.transactions.set(transactions);
        this.accounts.set(accounts);
        this.categories.set(categories);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  accountName(id: string): string {
    return this.accountsById().get(id)?.nome ?? 'Conto eliminato';
  }

  accountCurrency(id: string): string {
    return this.accountsById().get(id)?.valuta ?? 'EUR';
  }

  categoryName(id: string | null): string {
    if (!id) return 'Senza categoria';
    return this.categoriesById().get(id)?.nome ?? 'Senza categoria';
  }

  onAccountFilter(event: Event): void {
    this.accountFilter.set((event.target as HTMLSelectElement).value);
  }

  onYearFilter(event: Event): void {
    const year = (event.target as HTMLSelectElement).value;
    this.yearFilter.set(year);
    // Se il mese già scelto non appartiene più all'anno selezionato,
    // azzeralo per evitare una combinazione senza risultati e confusa.
    const currentMonth = this.monthFilter();
    if (currentMonth !== 'all' && year !== 'all' && !currentMonth.startsWith(year)) {
      this.monthFilter.set('all');
    }
  }

  onMonthFilter(event: Event): void {
    this.monthFilter.set((event.target as HTMLSelectElement).value);
  }

  onCategoryFilter(event: Event): void {
    this.categoryFilter.set((event.target as HTMLSelectElement).value);
  }

  /** 'YYYY-MM' → "Luglio 2026", oppure solo "Luglio" se un anno è già selezionato altrove. */
  monthLabel(yearMonth: string): string {
    const [year, month] = yearMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const pattern = this.yearFilter() === 'all' ? 'MMMM y' : 'MMMM';
    const label = formatDate(date, pattern, 'it');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  resetFilters(): void {
    this.accountFilter.set('all');
    this.tipoFilter.set('all');
    this.yearFilter.set('all');
    this.monthFilter.set('all');
    this.categoryFilter.set('all');
  }

  openNew(): void {
    this.formCmp().open(null);
  }

  openEdit(transaction: Transaction): void {
    this.formCmp().open(transaction);
  }

  askDelete(transaction: Transaction): void {
    this.deleteTarget.set(transaction);
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
    this.transactionsApi.delete(target.id).subscribe({
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