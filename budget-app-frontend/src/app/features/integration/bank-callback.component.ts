import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IntegrationService } from '../../core/api/integration.service';
import { DiscoveredAccount } from '../../core/models-integration';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-bank-callback',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="wrap">
      @switch (state()) {
        @case ('loading') {
          <p class="hint">Completamento del collegamento in corso…</p>
        }
        @case ('error') {
          <div class="alert" role="alert">{{ error() }}</div>
          <a class="btn btn--primary" routerLink="/conti">Torna ai conti</a>
        }
        @case ('ready') {
          @if (done()) {
            <h1>Fatto!</h1>
            <p class="hint">
              {{ importedCount() }}
              {{ importedCount() === 1 ? 'conto collegato' : 'conti collegati' }}
              con successo.
            </p>
            <a class="btn btn--primary" routerLink="/conti">Vai ai conti</a>
          } @else {
            <h1>Scegli i conti da collegare</h1>
            <p class="hint">
              Trovati {{ accounts().length }} {{ accounts().length === 1 ? 'conto' : 'conti' }}.
            </p>

            <ul class="account-list">
              @for (account of accounts(); track account.uid) {
                <li class="account-item">
                  <label>
                    <input
                      type="checkbox"
                      [checked]="selected().has(account.uid)"
                      (change)="toggle(account.uid)"
                    >
                    <span class="account-item__info">
                      <span class="account-item__name">{{ displayName(account) }}</span>
                      @if (account.account_id?.iban) {
                        <span class="account-item__iban">{{ account.account_id!.iban }}</span>
                      }
                    </span>
                  </label>
                </li>
              }
            </ul>

            @if (importError()) {
              <div class="alert" role="alert">{{ importError() }}</div>
            }

            <button
              class="btn btn--primary"
              type="button"
              (click)="confirmImport()"
              [disabled]="selected().size === 0 || importing()"
            >
              {{ importing() ? 'Importazione…' : 'Collega ' + selected().size + ' ' + (selected().size === 1 ? 'conto' : 'conti') }}
            </button>
          }
        }
      }
    </div>
  `,
  styles: `
    .wrap { max-width: 480px; margin: 0 auto; padding: 24px 16px; }
    h1 { font-size: 22px; margin-bottom: 8px; }
    .hint { color: var(--text-muted); margin-bottom: 20px; }
    .account-list {
      list-style: none;
      margin: 0 0 20px;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .account-item {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 12px 14px;
    }
    .account-item label { display: flex; align-items: center; gap: 12px; cursor: pointer; }
    .account-item input { width: 18px; height: 18px; accent-color: var(--accent); flex-shrink: 0; }
    .account-item__info { display: flex; flex-direction: column; min-width: 0; }
    .account-item__name { font-weight: 600; }
    .account-item__iban {
      font-size: 13px;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }
    a.btn:hover { text-decoration: none; }
  `,
})
export class BankCallbackComponent {
  private route = inject(ActivatedRoute);
  private integration = inject(IntegrationService);

  readonly state = signal<LoadState>('loading');
  readonly error = signal<string | null>(null);
  readonly accounts = signal<DiscoveredAccount[]>([]);
  readonly selected = signal<Set<string>>(new Set());
  readonly bankConnectionId = signal<string | null>(null);

  readonly importing = signal(false);
  readonly importError = signal<string | null>(null);
  readonly done = signal(false);
  readonly importedCount = signal(0);

  constructor() {
    const code = this.route.snapshot.queryParamMap.get('code');
    const bankState = this.route.snapshot.queryParamMap.get('state');

    if (!code || !bankState) {
      this.state.set('error');
      this.error.set('Link di collegamento non valido.');
      return;
    }

    this.integration.completeConnection(code, bankState).subscribe({
      next: response => {
        this.bankConnectionId.set(response.bankConnectionId);
        this.accounts.set(response.accounts);
        // Preseleziona tutti i conti trovati: l'utente può deselezionare quelli che non vuole.
        this.selected.set(new Set(response.accounts.map(a => a.uid)));
        this.state.set('ready');
      },
      error: () => {
        this.state.set('error');
        this.error.set(
          "Impossibile completare il collegamento. Il link potrebbe essere scaduto: riprova dall'inizio."
        );
      },
    });
  }

  displayName(account: DiscoveredAccount): string {
    return account.name || account.details || 'Conto senza nome';
  }

  toggle(uid: string): void {
    const current = new Set(this.selected());
    if (current.has(uid)) {
      current.delete(uid);
    } else {
      current.add(uid);
    }
    this.selected.set(current);
  }

  confirmImport(): void {
    const connectionId = this.bankConnectionId();
    if (!connectionId) return;

    this.importing.set(true);
    this.importError.set(null);

    this.integration.importAccounts(connectionId, [...this.selected()]).subscribe({
      next: imported => {
        this.importing.set(false);
        this.importedCount.set(imported.length);
        this.done.set(true);
      },
      error: () => {
        this.importing.set(false);
        this.importError.set('Importazione non riuscita. Riprova.');
      },
    });
  }
}
