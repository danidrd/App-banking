import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';

/**
 * Ascolta i deep link (es. budgetapp://app/reset-password?token=...) e
 * naviga il router Angular alla rotta corrispondente. Attivo solo dentro
 * l'app nativa: nel browser i normali link http funzionano già da soli,
 * senza bisogno di questo meccanismo.
 */
@Injectable({ providedIn: 'root' })
export class DeepLinkService {
  private router = inject(Router);

  init(): void {
    if (!Capacitor.isNativePlatform()) return;

    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      // "budgetapp://app/reset-password?token=xxx"
      //   -> host "app", pathname "/reset-password", search "?token=xxx"
      const url = new URL(event.url);
      const path = url.pathname.startsWith('/') ? url.pathname : `/${url.pathname}`;
      this.router.navigateByUrl(`${path}${url.search}`);
    });
  }
}
