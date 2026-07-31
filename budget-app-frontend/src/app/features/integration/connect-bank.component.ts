import { Component, computed, inject, signal } from '@angular/core';
import { Browser } from '@capacitor/browser';
import { IntegrationService } from '../../core/api/integration.service';
import { Aspsp } from '../../core/models-integration';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-connect-bank',
  standalone: true,
  template: `
    <header class="head">
      <h1>Collega una banca</h1>
      <p class="head__sub">Scegli il paese e cerca la tua banca.</p>
    </header>

    <div class="field">
      <label for="country">Paese</label>
      <select id="country" [value]="country()" (change)="onCountryChange($event)">
        <option value="IT">Italia</option>
        <option value="DE">Germania</option>
        <option value="LT">Lituania</option>
        <option value="GB">Regno Unito</option>
      </select>
    </div>

    <div class="field">
      <label for="search">Cerca banca</label>
      <input
        id="search"
        type="text"
        [value]="query()"
        (input)="onQueryChange($event)"
        placeholder="Es. Isybank, N26, Revolut..."
      >
    </div>

    @switch (state()) {
      @case ('loading') {
        <p class="hint">Caricamento elenco banche…</p>
      }
      @case ('error') {
        <div class="alert" role="alert">
          Impossibile caricare l'elenco banche.
          <button class="btn btn--ghost" type="button" (click)="loadAspsps()">Riprova</button>
        </div>
      }
      @case ('ready') {
        @if (filteredAspsps().length === 0) {
          <p class="hint">Nessuna banca trovata.</p>
        } @else {
          <ul class="bank-list">
            @for (aspsp of filteredAspsps(); track aspsp.name) {
              <li>
                <button
                  class="bank-item"
                  type="button"
                  (click)="connectTo(aspsp)"
                  [disabled]="connecting()"
                >
                  <span>{{ aspsp.name }}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6"/>
                  </svg>
                </button>
              </li>
            }
          </ul>
        }
      }
    }

    @if (connectError()) {
      <div class="alert" role="alert">{{ connectError() }}</div>
    }
  `,
  styles: `
    .head { margin-bottom: 20px; }
    .head h1 { font-size: 24px; }
    .head__sub { margin: 4px 0 0; color: var(--text-muted); }
    .field { margin-bottom: 16px; }
    .hint { color: var(--text-muted); font-size: 14px; }
    .bank-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .bank-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 14px 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--text);
      font-family: var(--font-body);
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
    }
    .bank-item:hover { background: var(--surface-2); }
    .bank-item:disabled { opacity: 0.6; cursor: not-allowed; }
    .bank-item svg { width: 18px; height: 18px; color: var(--text-muted); flex-shrink: 0; }
  `,
})
export class ConnectBankComponent {
  private integration = inject(IntegrationService);

  readonly state = signal<LoadState>('loading');
  readonly connecting = signal(false);
  readonly connectError = signal<string | null>(null);

  readonly country = signal('IT');
  readonly query = signal('');
  private readonly allAspsps = signal<Aspsp[]>([]);

  readonly filteredAspsps = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.allAspsps();
    return q ? list.filter(a => a.name.toLowerCase().includes(q)) : list;
  });

  constructor() {
    this.loadAspsps();
  }

  onCountryChange(event: Event): void {
    this.country.set((event.target as HTMLSelectElement).value);
    this.loadAspsps();
  }

  onQueryChange(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  loadAspsps(): void {
    this.state.set('loading');
    this.integration.listAspsps(this.country()).subscribe({
      next: aspsps => {
        this.allAspsps.set(aspsps);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  connectTo(aspsp: Aspsp): void {
    this.connecting.set(true);
    this.connectError.set(null);
    this.integration.startConnection(aspsp.name, aspsp.country).subscribe({
      next: async ({ authorizationUrl }) => {
        this.connecting.set(false);
        // Browser di sistema, non la WebView dell'app: molte banche
        // rifiutano di autenticarsi dentro una WebView incorporata.
        await Browser.open({ url: authorizationUrl });
      },
      error: () => {
        this.connecting.set(false);
        this.connectError.set('Impossibile avviare il collegamento. Riprova.');
      },
    });
  }
}
