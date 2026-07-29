import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Endpoint di autenticazione PUBBLICI: niente Bearer, e un loro 401 non
 * deve far scattare il logout (un login sbagliato non è una sessione
 * scaduta). Nota che NON tutto /api/auth è pubblico: PUT /api/auth/password
 * (cambio password da loggato) richiede il token come ogni altra chiamata.
 */
const PUBLIC_AUTH_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const isApiCall = req.url.startsWith('/api');
  const isPublicAuthCall = PUBLIC_AUTH_PATHS.some(path => req.url.startsWith(path));

  let request = req;
  const token = auth.token;
  if (isApiCall && !isPublicAuthCall && token) {
    request = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      if (isApiCall && !isPublicAuthCall && (err.status === 401 || err.status === 403)) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
