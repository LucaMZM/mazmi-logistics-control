import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { AuthUser } from '../../shared/models/models';
import { adminGuard, authGuard, operatorGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authentication and role guards', () => {
  const router = {
    createUrlTree: vi.fn((commands: string[]) => ({ commands }) as unknown as UrlTree),
  };

  function configure(user: AuthUser | null): void {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { ensureLoaded: () => of(user) } },
        { provide: Router, useValue: router },
      ],
    });
  }

  beforeEach(() => router.createUrlTree.mockClear());

  it('redirects anonymous visitors to login with their return URL', async () => {
    configure(null);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/orders' } as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;
    expect(await firstValueFrom(result)).not.toBe(true);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/orders' },
    });
  });

  it('allows only administrators through the users route', async () => {
    configure({ id: '1', name: 'Viewer', email: 'viewer@example.test', role: 'VIEWER' });
    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;
    expect(await firstValueFrom(result)).not.toBe(true);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });

  it('keeps viewers out of order creation', async () => {
    configure({ id: '1', name: 'Viewer', email: 'viewer@example.test', role: 'VIEWER' });
    const result = TestBed.runInInjectionContext(() =>
      operatorGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;
    expect(await firstValueFrom(result)).not.toBe(true);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });

  it('allows operators to create orders', async () => {
    configure({ id: '2', name: 'Operator', email: 'operator@example.test', role: 'OPERATOR' });
    const result = TestBed.runInInjectionContext(() =>
      operatorGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;
    expect(await firstValueFrom(result)).toBe(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });
});
