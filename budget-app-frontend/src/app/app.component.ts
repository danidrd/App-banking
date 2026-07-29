import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DeepLinkService } from './core/deep-link.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {
  constructor() {
    // Attiva l'ascolto dei deep link (no-op nel browser, vedi il servizio).
    inject(DeepLinkService).init();
  }
}
