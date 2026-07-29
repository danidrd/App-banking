import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { AccountsService } from '../../core/api/accounts.service';
import { Account } from '../../core/models';
import { AccountFormComponent } from './account-form.component';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CurrencyPipe, AccountFormComponent],
  template: `
    <header class="head">
      <div>
        <h1>Conti</h1>
        <p class="head__sub">I luoghi dove vivono i tuoi soldi.</p>
      </div>
      <button class="btn btn--primary" type="button" (click)="openNew()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        Nuovo conto
      </button>
    </header>

    @switch (state()) {
      @case ('loading') {
        <div class="grid" aria-hidden="true">
          <div class="card skeleton"></div>
          <div class="card skeleton"></div>
        </div>
      }
      @case ('error') {
        <div class="alert" role="alert">
          Impossibile caricare i conti.
          <button class="btn btn--ghost" type="button" (click)="load()">Riprova</button>
        </div>
      }
      @case ('ready') {
        @if (accounts().length === 0) {
          <div class="card empty">
            <h2>Nessun conto, per ora</h2>
            <p>Crea il primo conto per iniziare a tracciare saldi e spese.</p>
            <button class="btn btn--primary" type="button" (click)="openNew()">Crea conto</button>
          </div>
        } @else {
          <div class="grid">
            @for (account of accounts(); track account.id) {
              <article class="card acc">
                <div class="acc__top">
                  <div class="acc__id">
                    <span class="acc__name">{{ account.nome }}</span>
                    <span class="acc__meta">{{ account.tipo }} · {{ account.valuta }}</span>
                  </div>
                  <div class="acc__actions">
                    <button
                      class="icon-btn"
                      type="button"
                      (click)="openEdit(account)"
                      [attr.aria-label]="'Modifica ' + account.nome"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                           stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                      </svg>
                    </button>
                    <button
                      class="icon-btn icon-btn--danger"
                      type="button"
                      (click)="askDelete(account)"
                      [attr.aria-label]="'Elimina ' + account.nome"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                           stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <span class="acc__saldo amount" [class.amount--neg]="account.saldo < 0">
                  {{ account.saldo | currency : account.valuta }}
                </span>
              </article>
            }
          </div>
        }
      }
    }

    <!-- Form creazione/modifica -->
    <app-account-form (saved)="load()" />

    <!-- Conferma eliminazione -->
    <dialog #deleteDlg class="sheet">
      <div class="sheet__card">
        <h2>Eliminare il conto?</h2>
        <p class="confirm__text">
          Stai per eliminare <strong>{{ deleteTarget()?.nome }}</strong>.
          Verranno eliminate anche tutte le transazioni associate.
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
      margin-bottom: 24px;
    }
    .head h1 { font-size: 26px; }
    .head__sub { margin: 4px 0 0; color: var(--text-muted); }
    .head .btn svg { width: 18px; height: 18px; }

    .grid { display: grid; gap: 12px; }
    @media (min-width: 640px) {
      .grid { grid-template-columns: repeat(2, 1fr); }
    }

    .acc {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 18px 20px;
    }
    .acc__top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .acc__id { display: flex; flex-direction: column; min-width: 0; }
    .acc__name {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .acc__meta {
      font-size: 13px;
      color: var(--text-muted);
      text-transform: capitalize;
    }
    .acc__actions { display: flex; gap: 2px; flex-shrink: 0; }
    .acc__saldo { font-size: 24px; font-weight: 700; }

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
      height: 110px;
      background: linear-gradient(100deg, var(--surface) 40%, var(--surface-2) 50%, var(--surface) 60%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer { to { background-position: -200% 0; } }
  `,
})
export class AccountsComponent {
  private api = inject(AccountsService);

  readonly state = signal<LoadState>('loading');
  readonly accounts = signal<Account[]>([]);

  readonly deleteTarget = signal<Account | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  private formCmp = viewChild.required(AccountFormComponent);
  private deleteDlg = viewChild.required<ElementRef<HTMLDialogElement>>('deleteDlg');

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.api.list().subscribe({
      next: accounts => {
        this.accounts.set(accounts);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  openNew(): void {
    this.formCmp().open(null);
  }

  openEdit(account: Account): void {
    this.formCmp().open(account);
  }

  askDelete(account: Account): void {
    this.deleteTarget.set(account);
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
