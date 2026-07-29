import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

interface NavItem {
  label: string;
  path: string;
  /** Path SVG (24x24, stroke) */
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <!-- Sidebar (desktop) / bottom bar (mobile) -->
      <nav class="nav" aria-label="Navigazione principale">
        <div class="nav__brand">B.</div>

        <ul class="nav__list">
          @for (item of navItems; track item.path) {
            <li>
              <a
                class="nav__link"
                [routerLink]="item.path"
                routerLinkActive="nav__link--active"
                [routerLinkActiveOptions]="{ exact: item.path === '/' }"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                     aria-hidden="true">
                  <path [attr.d]="item.icon" />
                </svg>
                <span>{{ item.label }}</span>
              </a>
            </li>
          }
        </ul>

        <div class="nav__user">
          <div class="nav__avatar" aria-hidden="true">{{ initials }}</div>
          <div class="nav__userinfo">
            <span class="nav__username">{{ auth.currentUser()?.nome }}</span>
            <button class="nav__logout" type="button" (click)="auth.logout()">Esci</button>
          </div>
        </div>
      </nav>

      <main class="shell__content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .shell { min-height: 100dvh; }

    /* ============ Mobile-first: bottom navigation ============ */
    .nav {
      position: fixed;
      inset: auto 0 0 0;
      height: calc(var(--bottomnav-h) + var(--inset-bottom));
      background: var(--surface);
      border-top: 1px solid var(--border);
      display: flex;
      align-items: stretch;
      z-index: 10;
      padding-bottom: var(--inset-bottom);
    }
    .nav__brand, .nav__user { display: none; }
    .nav__list {
      list-style: none;
      display: flex;
      flex: 1;
      margin: 0;
      padding: 0;
    }
    .nav__list li { flex: 1; display: flex; }
    .nav__link {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      font-size: 10.5px;
      font-weight: 500;
      color: var(--text-muted);
      text-decoration: none;
    }
    .nav__link:hover { text-decoration: none; }
    .nav__link svg { width: 22px; height: 22px; }
    .nav__link--active { color: var(--accent); }

    .shell__content {
      padding: calc(20px + var(--inset-top)) 16px calc(var(--bottomnav-h) + 24px + var(--inset-bottom));
      max-width: 1080px;
      margin: 0 auto;
    }

    /* ============ Desktop: sidebar ============ */
    @media (min-width: 820px) {
      .nav {
        inset: 0 auto 0 0;
        width: var(--sidebar-w);
        height: auto;
        flex-direction: column;
        border-top: none;
        border-right: 1px solid var(--border);
        padding: calc(24px + var(--inset-top)) 14px 24px;
      }
      .nav__brand {
        display: block;
        font-family: var(--font-display);
        font-size: 24px;
        font-weight: 800;
        color: var(--accent);
        padding: 0 12px 24px;
      }
      .nav__list { flex-direction: column; gap: 4px; flex: 0; }
      .nav__link {
        flex-direction: row;
        justify-content: flex-start;
        gap: 12px;
        padding: 10px 12px;
        border-radius: var(--radius);
        font-size: 14.5px;
        font-weight: 500;
      }
      .nav__link:hover { background: var(--surface-2); color: var(--text); }
      .nav__link--active {
        background: var(--accent-soft);
        color: var(--accent);
        font-weight: 600;
      }
      .nav__link svg { width: 20px; height: 20px; }

      .nav__user {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: auto;
        padding: 12px;
        border-top: 1px solid var(--border);
      }
      .nav__avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--accent-soft);
        color: var(--accent);
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 14px;
        flex-shrink: 0;
      }
      .nav__userinfo { display: flex; flex-direction: column; min-width: 0; }
      .nav__username {
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .nav__logout {
        background: none;
        border: none;
        padding: 0;
        text-align: left;
        font-size: 12.5px;
        color: var(--text-muted);
        cursor: pointer;
        font-family: var(--font-body);
      }
      .nav__logout:hover { color: var(--negative); }

      .shell__content {
        margin-left: var(--sidebar-w);
        padding: calc(36px + var(--inset-top)) 40px 48px;
      }
    }
  `,
})
export class ShellComponent {
  readonly auth = inject(AuthService);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', path: '/', icon: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
    { label: 'Conti', path: '/conti', icon: 'M3 7h18v12H3zM3 11h18M7 15h4' },
    { label: 'Transazioni', path: '/transazioni', icon: 'M7 4v12m0 0l-3-3m3 3l3-3M17 20V8m0 0l-3 3m3-3l3 3' },
    { label: 'Categorie', path: '/categorie', icon: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z' },
    { label: 'Budget', path: '/budget', icon: 'M12 3v18M5 8c0-2 3-3 7-3s7 1 7 3-3 3-7 3-7 1-7 3 3 3 7 3 7-1 7-3' },
  ];

  get initials(): string {
    const nome = this.auth.currentUser()?.nome ?? '';
    return nome
      .split(' ')
      .map(p => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
