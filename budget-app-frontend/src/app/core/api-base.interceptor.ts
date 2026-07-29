import { HttpInterceptorFn } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { MOBILE_API_HOST } from './api-base';

/**
 * Nel browser le chiamate a /api passano dal proxy di sviluppo e non
 * vanno toccate. Dentro l'app nativa, invece, un URL relativo punterebbe
 * al telefono stesso: qui lo riscriviamo in assoluto verso il backend.
 *
 * Va registrato DOPO authInterceptor in app.config.ts: così l'auth
 * interceptor vede ancora l'URL relativo /api su cui basa i suoi controlli.
 */
export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  if (Capacitor.isNativePlatform() && req.url.startsWith('/api')) {
    req = req.clone({ url: `${MOBILE_API_HOST}${req.url}` });
  }
  return next(req);
};
