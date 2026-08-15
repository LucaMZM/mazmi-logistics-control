import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../services/api.service';
import { apiInterceptor } from './api.interceptor';

describe('apiInterceptor', () => {
  let api: ApiService;
  let http: HttpTestingController;
  const snackBar = { open: vi.fn() };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
    snackBar.open.mockClear();
  });

  afterEach(() => http.verify());

  it('sends cookie credentials and surfaces the server error message', () => {
    api.dashboard().subscribe({ error: () => undefined });
    const request = http.expectOne('/api/v1/dashboard');
    expect(request.request.withCredentials).toBe(true);
    request.flush(
      { code: 'FORBIDDEN', message: 'This action is not permitted.' },
      { status: 403, statusText: 'Forbidden' },
    );
    expect(snackBar.open).toHaveBeenCalledWith('This action is not permitted.', 'Dismiss', {
      duration: 5000,
    });
  });
});
