import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Aggiunge Authorization: Bearer <token> a tutte le chiamate /api
 * (tranne quelle di autenticazione) e fa logout automatico quando
 * il backend risponde 401/403, cioè token mancante/scaduto/non valido.
 *
 * Nota: il backend attuale risponde 403 anche per alcune eccezioni
 * interne non gestite — se dovessi notare logout "a sorpresa" durante
 * lo sviluppo di nuove feature, il posto giusto dove guardare è il log
 * di Spring, non questo file.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const isApiCall = req.url.startsWith('/api');
  const isAuthCall = req.url.startsWith('/api/auth');

  let request = req;
  const token = auth.token;
  if (isApiCall && !isAuthCall && token) {
    request = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      if (isApiCall && !isAuthCall && (err.status === 401 || err.status === 403)) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
