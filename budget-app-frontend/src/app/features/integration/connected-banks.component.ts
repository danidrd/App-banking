import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IntegrationService } from '../../core/api/integration.service';
import { BankConnectionSummary } from '../../core/models-integration';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-connected-banks',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <header class="head">
      <div>
        <h1>Banche collegate</h1>
        <p class="head__sub">Gestisci i collegamenti Open Banking attivi.</p>
      </div>
      <a class="btn btn--primary" routerLink="/collega-banca">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        Collega un'altra banca
      </a>
    </header>

    @switch (state()) {
      @case ('loading') {
        <div class="card skeleton" aria-hidden="true"></div>
      }
      @case ('error') {
        <div class="alert" role="alert">
          Impossibile caricare i collegamenti.
          <button class="btn btn--ghost" type="button" (click)="load()">Riprova</button>
        </div>
      }
      @case ('ready') {
        @if (connections().length === 0) {
          <div class="card empty">
            <h2>Nessuna banca collegata</h2>
            <p>Collega isybank, N26, Revolut o un'altra banca per sincronizzare le transazioni automaticamente.</p>
            <a class="btn btn--primary" routerLink="/collega-banca">Collega una banca</a>
          </div>
        } @else {
          <ul class="conn-list">
            @for (conn of connections(); track conn.id) {
              <li class="card conn">
                <div class="conn__top">
                  <div class="conn__id">
                    <span class="conn__name">{{ conn.aspspName }}</span>
                    <span class="conn__country">{{ conn.aspspCountry }}</span>
                  </div>
                  <span class="status" [class]="'status--' + conn.status.toLowerCase()">
                    {{ statusLabel(conn.status) }}
                  </span>
                </div>

                @if (conn.linkedAccountNames.length > 0) {
                  <p class="conn__accounts">
                    Conti collegati: {{ conn.linkedAccountNames.join(', ') }}
                  </p>
                } @else {
                  <p class="conn__accounts conn__accounts--none">Nessun conto importato da questo collegamento.</p>
                }

                @if (conn.validUntil) {
                  <p class="conn__expiry">
                    Consenso valido fino al {{ conn.validUntil | date : 'd MMMM y' }}
                  </p>
                }

                @if (conn.status === 'ACTIVE') {
                  <button
                    class="btn btn--danger conn__disconnect"
                    type="button"
                    (click)="askDisconnect(conn)"
                  >
                    Scollega
                  </button>
                }
              </li>
            }
          </ul>
        }
      }
    }

    <dialog #disconnectDlg class="sheet">
      <div class="sheet__card">
        <h2>Scollegare {{ disconnectTarget()?.aspspName }}?</h2>
        <p class="confirm__text">
          Verrà revocato l'accesso presso la banca: la sincronizzazione automatica
          si fermerà. I conti e le transazioni già importati restano visibili,
          non vengono cancellati — puoi eliminarli separatamente se vuoi
          rimuovere anche lo storico.
        </p>
        @if (disconnectError()) {
          <div class="alert" role="alert">{{ disconnectError() }}</div>
        }
        <footer class="sheet__actions">
          <button type="button" class="btn btn--ghost" (click)="cancelDisconnect()">Annulla</button>
          <button
            type="button"
            class="btn btn--danger"
            (click)="confirmDisconnect()"
            [disabled]="disconnecting()"
          >
            {{ disconnecting() ? 'Scollegamento…' : 'Scollega' }}
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
    a.btn:hover { text-decoration: none; }

    .conn-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
    .conn { padding: 18px 20px; display: flex; flex-direction: column; gap: 8px; }
    .conn__top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .conn__id { display: flex; flex-direction: column; }
    .conn__name { font-weight: 600; font-size: 16px; }
    .conn__country { font-size: 13px; color: var(--text-muted); }

    .status {
      font-size: 12px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .status--active { background: var(--accent-soft); color: var(--accent); }
    .status--revoked { background: var(--surface-2); color: var(--text-muted); }
    .status--expired { background: var(--negative-soft); color: var(--negative); }

    .conn__accounts { margin: 0; font-size: 14px; color: var(--text); }
    .conn__accounts--none { color: var(--text-muted); font-style: italic; }
    .conn__expiry { margin: 0; font-size: 12.5px; color: var(--text-muted); }
    .conn__disconnect { align-self: flex-start; margin-top: 4px; padding: 8px 14px; font-size: 13.5px; }

    .empty {
      padding: 36px 28px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .empty h2 { font-size: 20px; }
    .empty p { margin: 0 0 8px; color: var(--text-muted); max-width: 360px; }

    .confirm__text { margin: 0; color: var(--text-muted); }

    .skeleton {
      height: 140px;
      background: linear-gradient(100deg, var(--surface) 40%, var(--surface-2) 50%, var(--surface) 60%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer { to { background-position: -200% 0; } }
  `,
})
export class ConnectedBanksComponent {
  private integration = inject(IntegrationService);

  readonly state = signal<LoadState>('loading');
  readonly connections = signal<BankConnectionSummary[]>([]);

  readonly disconnectTarget = signal<BankConnectionSummary | null>(null);
  readonly disconnecting = signal(false);
  readonly disconnectError = signal<string | null>(null);

  private disconnectDlg = viewChild.required<ElementRef<HTMLDialogElement>>('disconnectDlg');

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.integration.listConnections().subscribe({
      next: connections => {
        this.connections.set(connections);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'Attivo';
      case 'REVOKED': return 'Scollegato';
      case 'EXPIRED': return 'Scaduto';
      default: return status;
    }
  }

  askDisconnect(conn: BankConnectionSummary): void {
    this.disconnectTarget.set(conn);
    this.disconnectError.set(null);
    this.disconnecting.set(false);
    this.disconnectDlg().nativeElement.showModal();
  }

  cancelDisconnect(): void {
    this.disconnectDlg().nativeElement.close();
  }

  confirmDisconnect(): void {
    const target = this.disconnectTarget();
    if (!target) return;

    this.disconnecting.set(true);
    this.disconnectError.set(null);
    this.integration.disconnectBank(target.id).subscribe({
      next: () => {
        this.disconnecting.set(false);
        this.cancelDisconnect();
        this.load();
      },
      error: () => {
        this.disconnecting.set(false);
        this.disconnectError.set('Scollegamento non riuscito. Riprova.');
      },
    });
  }
}
