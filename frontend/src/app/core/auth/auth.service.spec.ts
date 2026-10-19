import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('initializes CSRF before login and stores auth only in memory', () => {
    service.login('operator@mazmilogistics.test', 'Demo2026!').subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({ token: 'test' });
    http.expectOne('/api/v1/auth/login').flush({
      id: '1',
      name: 'Operator',
      email: 'operator@mazmilogistics.test',
      role: 'OPERATOR',
    });
    expect(service.user()?.role).toBe('OPERATOR');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('maps failed session lookup to an anonymous state', () => {
    service.ensureLoaded().subscribe((user) => expect(user).toBeNull());
    http.expectOne('/api/v1/auth/csrf').flush({ token: 'test' });
    http.expectOne('/api/v1/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
  });

  it('does not replace a newer login with an older session lookup', () => {
    service.ensureLoaded().subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({ token: 'test' });
    const oldSession = http.expectOne('/api/v1/auth/me');
    service.login('operator@mazmilogistics.test', 'Demo2026!').subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({ token: 'test' });
    http.expectOne('/api/v1/auth/login').flush({
      id: 'operator',
      name: 'Operator',
      email: 'operator@mazmilogistics.test',
      role: 'OPERATOR',
    });
    oldSession.flush({ id: 'viewer', name: 'Viewer', email: 'viewer@test', role: 'VIEWER' });
    expect(service.user()?.role).toBe('OPERATOR');
  });

  it('cancels a previous login request before starting a newer login', () => {
    service.login('viewer@test', 'old').subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({ token: 'test' });
    const oldLogin = http.expectOne('/api/v1/auth/login');
    service.login('operator@test', 'new').subscribe();
    expect(oldLogin.cancelled).toBe(true);
    http.expectOne('/api/v1/auth/csrf').flush({ token: 'test' });
    http.expectOne('/api/v1/auth/login').flush({
      id: 'operator',
      name: 'Operator',
      email: 'operator@test',
      role: 'OPERATOR',
    });
    expect(service.user()?.role).toBe('OPERATOR');
  });

  it('waits for logout before sending a new login request', () => {
    service.logout();
    http.expectOne('/api/v1/auth/csrf').flush({ token: 'test' });
    const oldLogout = http.expectOne('/api/v1/auth/logout');
    service.login('operator@test', 'new').subscribe();
    http.expectNone('/api/v1/auth/login');
    oldLogout.flush(null);
    http.expectOne('/api/v1/auth/csrf').flush({ token: 'test' });
    http.expectOne('/api/v1/auth/login').flush({
      id: 'operator',
      name: 'Operator',
      email: 'operator@test',
      role: 'OPERATOR',
    });
    expect(service.user()?.role).toBe('OPERATOR');
    expect(TestBed.inject(Router).navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not claim logout succeeded when the server could not clear the cookie', () => {
    service.login('operator@test', 'password').subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({ token: 'test' });
    http.expectOne('/api/v1/auth/login').flush({
      id: 'operator',
      name: 'Operator',
      email: 'operator@test',
      role: 'OPERATOR',
    });
    service.logout();
    http.expectOne('/api/v1/auth/csrf').flush({ token: 'test' });
    http.expectOne('/api/v1/auth/logout').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(service.user()?.role).toBe('OPERATOR');
    expect(TestBed.inject(Router).navigateByUrl).not.toHaveBeenCalled();
  });
});
