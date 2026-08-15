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
});
