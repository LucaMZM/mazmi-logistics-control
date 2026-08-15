import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const snackBar = inject(MatSnackBar);
  return next(request.clone({ withCredentials: true })).pipe(
    catchError((error: HttpErrorResponse) => {
      const message =
        typeof error.error?.message === 'string'
          ? error.error.message
          : 'The operation could not be completed.';
      if (error.status !== 401 || !request.url.includes('/auth/me'))
        snackBar.open(message, 'Dismiss', { duration: 5000 });
      return throwError(() => error);
    }),
  );
};
