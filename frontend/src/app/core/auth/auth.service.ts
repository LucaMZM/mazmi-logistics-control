import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  defer,
  filter,
  finalize,
  map,
  Observable,
  of,
  shareReplay,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { AuthUser, Role } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly userState = signal<AuthUser | null>(null);
  private loading?: Observable<AuthUser | null>;
  private logoutInFlight?: Observable<void>;
  private readonly loginSuperseded = new Subject<void>();
  private sessionRevision = 0;
  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => this.userState() !== null);
  readonly canOperate = computed(() =>
    ['ADMIN', 'OPERATOR'].includes(this.userState()?.role ?? ''),
  );

  ensureLoaded(): Observable<AuthUser | null> {
    if (this.userState()) return of(this.userState());
    if (!this.loading) {
      const revision = this.sessionRevision;
      const loading = this.csrf().pipe(
        switchMap(() => this.http.get<AuthUser>('/api/v1/auth/me')),
        map((user) => {
          if (revision !== this.sessionRevision) return this.userState();
          this.userState.set(user);
          return user;
        }),
        catchError(() => of(this.userState())),
        finalize(() => {
          if (this.loading === loading) this.loading = undefined;
        }),
        shareReplay(1),
      );
      this.loading = loading;
    }
    return this.loading;
  }

  login(email: string, password: string): Observable<AuthUser> {
    return defer(() => {
      const revision = ++this.sessionRevision;
      this.loginSuperseded.next();
      return (this.logoutInFlight ?? of(undefined)).pipe(
        switchMap(() => this.csrf()),
        switchMap(() => this.http.post<AuthUser>('/api/v1/auth/login', { email, password })),
        takeUntil(this.loginSuperseded),
        filter(() => revision === this.sessionRevision),
        tap((user) => this.userState.set(user)),
      );
    });
  }

  logout(): void {
    if (this.logoutInFlight) return;
    const revision = ++this.sessionRevision;
    this.loginSuperseded.next();
    const request = this.csrf().pipe(
      switchMap(() => this.http.post<void>('/api/v1/auth/logout', {})),
      tap(() => this.finishLogout(revision)),
      finalize(() => {
        if (this.logoutInFlight === request) this.logoutInFlight = undefined;
      }),
      shareReplay(1),
    );
    this.logoutInFlight = request;
    request.subscribe({ error: () => {} });
  }

  hasRole(...roles: Role[]): boolean {
    const user = this.userState();
    return !!user && roles.includes(user.role);
  }
  private csrf(): Observable<void> {
    return this.http.get('/api/v1/auth/csrf').pipe(map(() => undefined));
  }
  private finishLogout(revision: number): void {
    if (revision !== this.sessionRevision) return;
    this.userState.set(null);
    void this.router.navigateByUrl('/login');
  }
}
