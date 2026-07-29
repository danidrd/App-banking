import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, formatDate } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AccountsService } from '../../core/api/accounts.service';
import { CategoriesService } from '../../core/api/categories.service';
import { TransactionsService } from '../../core/api/transactions.service';
import { AuthService } from '../../core/auth/auth.service';
import { Account, Category, Transaction } from '../../core/models';
import { DonutChartComponent, DonutSlice } from '../../shared/charts/donut-chart.component';
import { BarsChartComponent, MonthBar } from '../../shared/charts/bars-chart.component';

type LoadState = 'loading' | 'ready' | 'error';

interface LegendItem {
  label: string;
  value: number;
  color: string;
  pct: number;
}

/** Palette categorica a toni medi: leggibile sia su fondo chiaro che scuro. */
const PALETTE = [
  '#12a271',
  '#4d82e8',
  '#b077dd',
  '#e0a13a',
  '#e06a8f',
  '#3fb5cf',
];
const ALTRE_COLOR = '#8b8f98';

function toLocalIso(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, DonutChartComponent, BarsChartComponent],
  template: `
    <header class="page-head">
      <h1>Ciao, {{ firstName }}</h1>
      <p class="page-head__sub">Ecco come stanno i tuoi soldi oggi.</p>
    </header>

    @switch (state()) {
      @case ('loading') {
        <div class="card skeleton" aria-hidden="true"></div>
        <div class="charts" aria-hidden="true">
          <div class="card skeleton skeleton--panel"></div>
          <div class="card skeleton skeleton--panel"></div>
        </div>
      }
      @case ('error') {
        <div class="alert" role="alert">
          Impossibile caricare i dati.
          <button class="btn btn--ghost" type="button" (click)="load()">Riprova</button>
        </div>
      }
      @case ('ready') {
        <section class="card hero">
          <span class="hero__label">Patrimonio totale</span>
          <span class="hero__amount amount" [class.amount--neg]="total() < 0">
            {{ total() | currency : 'EUR' }}
          </span>
          <span class="hero__meta">
            {{ accounts().length }} {{ accounts().length === 1 ? 'conto' : 'conti' }}
          </span>
        </section>

        <div class="charts">
          <section class="card panel">
            <header class="panel__head">
              <h2>Spese per categoria</h2>
              <div class="monthnav">
                <button
                  class="icon-btn"
                  type="button"
                  (click)="prevMonth()"
                  aria-label="Mese precedente"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                       stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
                </button>
                <span class="monthnav__label">{{ monthInfo().label }}</span>
                <button
                  class="icon-btn"
                  type="button"
                  (click)="nextMonth()"
                  [disabled]="monthOffset() === 0"
                  aria-label="Mese successivo"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                       stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
                </button>
              </div>
            </header>

            @if (donut().total > 0) {
              <div class="donutwrap">
                <app-donut-chart [slices]="donut().slices">
                  <span class="donut__val amount">{{ donut().total | currency : 'EUR' }}</span>
                  <span class="donut__lbl">spese</span>
                </app-donut-chart>
                <ul class="dlegend">
                  @for (item of donut().legend; track item.label) {
                    <li class="dlegend__item">
                      <i class="dlegend__dot" [style.background]="item.color"></i>
                      <span class="dlegend__name">{{ item.label }}</span>
                      <span class="dlegend__val amount">{{ item.value | currency : 'EUR' }}</span>
                      <span class="dlegend__pct">{{ item.pct }}%</span>
                    </li>
                  }
                </ul>
              </div>
            } @else {
              <p class="panel__empty">Nessuna spesa registrata in questo mese.</p>
            }
          </section>

          <section class="card panel">
            <header class="panel__head">
              <h2>Ultimi 6 mesi</h2>
            </header>
            @if (hasMonthlyData()) {
              <app-bars-chart [months]="monthlySeries()" />
            } @else {
              <p class="panel__empty">
                Ancora niente da mostrare: registra qualche transazione e il grafico prenderà vita.
              </p>
            }
          </section>
        </div>

        <section class="accounts-block">
          <h2 class="accounts-block__title">I tuoi conti</h2>
          @if (accounts().length === 0) {
            <div class="card empty">
              <p>Nessun conto, per ora.</p>
              <a class="btn btn--primary" routerLink="/conti">Crea il primo conto</a>
            </div>
          } @else {
            <div class="accounts">
              @for (account of accounts(); track account.id) {
                <article class="card account">
                  <div class="account__info">
                    <span class="account__name">{{ account.nome }}</span>
                    <span class="account__type">{{ account.tipo }}</span>
                  </div>
                  <span
                    class="account__balance amount"
                    [class.amount--neg]="account.saldo < 0"
                  >
                    {{ account.saldo | currency : account.valuta }}
                  </span>
                </article>
              }
            </div>
          }
        </section>
      }
    }
  `,
  styles: `
    .page-head { margin-bottom: 24px; }
    .page-head h1 { font-size: 26px; }
    .page-head__sub { margin: 4px 0 0; color: var(--text-muted); }

    .hero {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 24px 28px;
      margin-bottom: 16px;
    }
    .hero__label {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }
    .hero__amount {
      font-size: clamp(32px, 5vw, 44px);
      font-weight: 700;
    }
    .hero__meta { font-size: 14px; color: var(--text-muted); }

    .charts {
      display: grid;
      gap: 16px;
      margin-bottom: 24px;
      align-items: start;
    }
    @media (min-width: 900px) {
      .charts { grid-template-columns: 2fr 3fr; }
    }

    .panel { padding: 20px; }
    .panel__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }
    .panel__head h2 { font-size: 17px; }
    .panel__empty {
      margin: 8px 0;
      font-size: 14px;
      color: var(--text-muted);
    }

    .monthnav { display: flex; align-items: center; gap: 4px; }
    .monthnav__label {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-muted);
      min-width: 96px;
      text-align: center;
    }
    .monthnav__label::first-letter { text-transform: uppercase; }

    .donutwrap {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 20px;
    }
    .donutwrap app-donut-chart { flex: 0 1 180px; }
    .donut__val { font-size: 21px; font-weight: 700; }
    .donut__lbl { font-size: 12px; color: var(--text-muted); }

    .dlegend {
      flex: 1 1 200px;
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
    }
    .dlegend__item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    .dlegend__dot {
      width: 10px;
      height: 10px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .dlegend__name {
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .dlegend__val { margin-left: auto; font-weight: 600; flex-shrink: 0; }
    .dlegend__pct {
      width: 38px;
      text-align: right;
      font-size: 12.5px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .accounts-block__title { font-size: 17px; margin-bottom: 12px; }
    .accounts { display: grid; gap: 12px; }
    @media (min-width: 640px) {
      .accounts { grid-template-columns: repeat(2, 1fr); }
    }
    .account {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 20px;
    }
    .account__info { display: flex; flex-direction: column; min-width: 0; }
    .account__name {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .account__type {
      font-size: 13px;
      color: var(--text-muted);
      text-transform: capitalize;
    }
    .account__balance { font-size: 19px; font-weight: 600; }

    .empty {
      padding: 28px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .empty p { margin: 0; color: var(--text-muted); }
    .empty a.btn:hover { text-decoration: none; }

    .skeleton {
      height: 120px;
      margin-bottom: 16px;
      background: linear-gradient(100deg, var(--surface) 40%, var(--surface-2) 50%, var(--surface) 60%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    .skeleton--panel { height: 260px; margin-bottom: 0; }
    @keyframes shimmer { to { background-position: -200% 0; } }
  `,
})
export class DashboardComponent {
  private accountsApi = inject(AccountsService);
  private categoriesApi = inject(CategoriesService);
  private transactionsApi = inject(TransactionsService);
  private auth = inject(AuthService);

  readonly state = signal<LoadState>('loading');
  readonly accounts = signal<Account[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly transactions = signal<Transaction[]>([]);

  readonly total = computed(() =>
    this.accounts().reduce((sum, a) => sum + a.saldo, 0)
  );

  private readonly categoriesById = computed(
    () => new Map(this.categories().map(c => [c.id, c]))
  );

  /** 0 = mese corrente, -1 = precedente, ecc. */
  readonly monthOffset = signal(0);

  readonly monthInfo = computed(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() + this.monthOffset(), 1);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    return {
      start: toLocalIso(first),
      end: toLocalIso(last),
      label: formatDate(first, 'MMMM y', 'it'),
    };
  });

  readonly donut = computed(() => {
    const { start, end } = this.monthInfo();
    const cats = this.categoriesById();

    const sums = new Map<string | null, number>();
    for (const t of this.transactions()) {
      if (t.importo >= 0 || t.data < start || t.data > end) continue;
      sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + Math.abs(t.importo));
    }

    const entries = [...sums.entries()]
      .map(([categoryId, value]) => ({
        label: categoryId ? cats.get(categoryId)?.nome ?? 'Senza categoria' : 'Senza categoria',
        value,
      }))
      .sort((a, b) => b.value - a.value);

    const top = entries.slice(0, PALETTE.length);
    const restValue = entries
      .slice(PALETTE.length)
      .reduce((sum, e) => sum + e.value, 0);

    const legend: LegendItem[] = top.map((e, i) => ({
      label: e.label,
      value: e.value,
      color: PALETTE[i],
      pct: 0,
    }));
    if (restValue > 0) {
      legend.push({ label: 'Altre', value: restValue, color: ALTRE_COLOR, pct: 0 });
    }

    const total = legend.reduce((sum, item) => sum + item.value, 0);
    for (const item of legend) {
      item.pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
    }

    const slices: DonutSlice[] = legend.map(item => ({
      value: item.value,
      color: item.color,
    }));

    return { slices, legend, total };
  });

  /** Serie fissa degli ultimi 6 mesi (indipendente dalla navigazione della ciambella). */
  readonly monthlySeries = computed<MonthBar[]>(() => {
    const now = new Date();
    const series: MonthBar[] = [];
    for (let back = 5; back >= 0; back--) {
      const first = new Date(now.getFullYear(), now.getMonth() - back, 1);
      const start = toLocalIso(first);
      const end = toLocalIso(new Date(first.getFullYear(), first.getMonth() + 1, 0));
      let entrate = 0;
      let uscite = 0;
      for (const t of this.transactions()) {
        if (t.data < start || t.data > end) continue;
        if (t.importo > 0) entrate += t.importo;
        else uscite += Math.abs(t.importo);
      }
      series.push({ label: formatDate(first, 'MMM', 'it'), entrate, uscite });
    }
    return series;
  });

  readonly hasMonthlyData = computed(() =>
    this.monthlySeries().some(m => m.entrate > 0 || m.uscite > 0)
  );

  get firstName(): string {
    return this.auth.currentUser()?.nome.split(' ')[0] ?? '';
  }

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    forkJoin({
      accounts: this.accountsApi.list(),
      categories: this.categoriesApi.list(),
      transactions: this.transactionsApi.list(),
    }).subscribe({
      next: ({ accounts, categories, transactions }) => {
        this.accounts.set(accounts);
        this.categories.set(categories);
        this.transactions.set(transactions);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  prevMonth(): void {
    this.monthOffset.update(offset => offset - 1);
  }

  nextMonth(): void {
    if (this.monthOffset() < 0) {
      this.monthOffset.update(offset => offset + 1);
    }
  }
}
