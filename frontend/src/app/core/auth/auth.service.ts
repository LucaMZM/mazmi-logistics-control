import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, shareReplay, switchMap, tap } from 'rxjs';
import { AuthUser, Role } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly userState = signal<AuthUser | null>(null);
  private loading?: Observable<AuthUser | null>;
  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => this.userState() !== null);
  readonly canOperate = computed(() =>
    ['ADMIN', 'OPERATOR'].includes(this.userState()?.role ?? ''),
  );

  ensureLoaded(): Observable<AuthUser | null> {
    if (this.userState()) return of(this.userState());
    if (!this.loading) {
      this.loading = this.csrf().pipe(
        switchMap(() => this.http.get<AuthUser>('/api/v1/auth/me')),
        tap((user) => this.userState.set(user)),
        catchError(() => of(null)),
        finalize(() => (this.loading = undefined)),
        shareReplay(1),
      );
    }
    return this.loading;
  }

  login(email: string, password: string): Observable<AuthUser> {
    return this.csrf().pipe(
      switchMap(() => this.http.post<AuthUser>('/api/v1/auth/login', { email, password })),
      tap((user) => this.userState.set(user)),
    );
  }

  logout(): void {
    this.csrf()
      .pipe(switchMap(() => this.http.post<void>('/api/v1/auth/logout', {})))
      .subscribe({ next: () => this.finishLogout(), error: () => this.finishLogout() });
  }

  hasRole(...roles: Role[]): boolean {
    return !!this.userState() && roles.includes(this.userState()!.role);
  }
  private csrf(): Observable<void> {
    return this.http.get('/api/v1/auth/csrf').pipe(map(() => undefined));
  }
  private finishLogout(): void {
    this.userState.set(null);
    void this.router.navigateByUrl('/login');
  }
}
