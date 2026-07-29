import { Component, ElementRef, inject, output, viewChild } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-account-menu',
  standalone: true,
  template: `
    <dialog #dlg class="sheet">
      <div class="sheet__card menu">
        <h2>Account</h2>
        <p class="menu__user">{{ auth.currentUser()?.nome }}</p>

        <div class="menu__list">
          <button class="menu__item" type="button" (click)="onChangePassword()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="8" cy="15" r="4"/>
              <path d="M10.5 12.5 20 3M17 6l2 2M14 9l2 2"/>
            </svg>
            <span>Cambia password</span>
          </button>

          <div class="menu__divider"></div>

          <button class="menu__item" type="button" (click)="onLogout()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <path d="M10 17l5-5-5-5"/>
              <path d="M15 12H3"/>
            </svg>
            <span>Esci</span>
          </button>
        </div>

        <button type="button" class="btn btn--ghost menu__close" (click)="close()">Chiudi</button>
      </div>
    </dialog>
  `,
  styles: `
    .menu { padding-bottom: 12px; }
    .menu__user {
      margin: -8px 0 4px;
      font-size: 14px;
      color: var(--text-muted);
    }
    .menu__list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .menu__item {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      padding: 13px 6px;
      border: none;
      background: transparent;
      color: var(--text);
      font-family: var(--font-body);
      font-size: 15px;
      font-weight: 500;
      text-align: left;
      border-radius: var(--radius);
      cursor: pointer;
    }
    .menu__item:hover { background: var(--surface-2); }
    .menu__item svg { width: 20px; height: 20px; color: var(--text-muted); flex-shrink: 0; }
    .menu__divider {
      height: 1px;
      background: var(--border);
      margin: 6px 0;
    }
    .menu__close { align-self: stretch; margin-top: 6px; }
  `,
})
export class AccountMenuComponent {
  readonly auth = inject(AuthService);

  /** Emesso quando l'utente sceglie "Cambia password": il genitore apre quella dialog. */
  readonly changePassword = output<void>();

  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  open(): void {
    this.dlg().nativeElement.showModal();
  }

  close(): void {
    this.dlg().nativeElement.close();
  }

  onChangePassword(): void {
    this.close();
    this.changePassword.emit();
  }

  onLogout(): void {
    this.close();
    this.auth.logout();
  }
}
