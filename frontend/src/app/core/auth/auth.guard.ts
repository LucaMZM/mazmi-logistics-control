import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .ensureLoaded()
    .pipe(
      map((user) =>
        user ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }),
      ),
    );
};

export const operatorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .ensureLoaded()
    .pipe(
      map((user) =>
        user && ['ADMIN', 'OPERATOR'].includes(user.role)
          ? true
          : router.createUrlTree(['/dashboard']),
      ),
    );
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .ensureLoaded()
    .pipe(map((user) => (user?.role === 'ADMIN' ? true : router.createUrlTree(['/dashboard']))));
};
