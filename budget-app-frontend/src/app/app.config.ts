import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { apiBaseInterceptor } from './core/api-base.interceptor';

registerLocaleData(localeIt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // L'ordine conta: authInterceptor lavora sull'URL relativo /api,
    // apiBaseInterceptor lo rende assoluto solo dentro l'app nativa.
    provideHttpClient(withInterceptors([authInterceptor, apiBaseInterceptor])),
    { provide: LOCALE_ID, useValue: 'it' },
  ],
};
