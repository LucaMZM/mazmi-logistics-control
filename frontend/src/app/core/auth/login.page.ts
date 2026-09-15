import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <main class="login-shell">
      <section class="login-panel" aria-labelledby="login-title">
        <div class="brand-mark">MZ</div>
        <p class="eyebrow">MAZMI · LOGISTICS CONTROL</p>
        <h1 id="login-title">Operations sign in</h1>
        <p class="intro">Sign in to your logistics workspace.</p>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline"
            ><mat-label>Email</mat-label
            ><input
              matInput
              type="email"
              formControlName="email"
              autocomplete="username"
              spellcheck="false"
            /><mat-error>Enter a valid email address.</mat-error></mat-form-field
          >
          <mat-form-field appearance="outline"
            ><mat-label>Password</mat-label
            ><input
              matInput
              type="password"
              formControlName="password"
              autocomplete="current-password"
            /><mat-error>Enter your password.</mat-error></mat-form-field
          >
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || submitting()"
          >
            {{ submitting() ? 'Signing in…' : 'Sign in' }}
          </button>
          @if (loginError()) {
            <p class="login-error" role="alert">{{ loginError() }}</p>
          }
        </form>
        <div class="demo-note">
          <strong>Demo account</strong><span>operator@mazmilogistics.test</span
          ><span>Demo2026!</span>
        </div>
      </section>
      <aside>
        <span>CONNECTED LOGISTICS OPERATIONS</span>
        <h2>Every order.<br />Every movement.<br />One clear view.</h2>
        <p>
          Connect warehouse preparation, stock reservations and delivery operations in a single
          workspace.
        </p>
        <div class="journey">
          <span>01 / Prepare</span><span>02 / Dispatch</span><span>03 / Deliver</span>
        </div>
        <small>Demo environment · Fictional data · Simulated tracking</small>
      </aside>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #f5f7fa;
      }
      .login-shell {
        min-height: 100vh;
        display: grid;
        grid-template-columns: minmax(360px, 520px) 1fr;
      }
      .login-panel {
        padding: clamp(40px, 8vw, 100px);
        display: flex;
        flex-direction: column;
        justify-content: center;
        background: #fff;
      }
      .brand-mark {
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        background: #1d4ed8;
        color: #fff;
        font-weight: 800;
        margin-bottom: 28px;
        border-radius: 8px;
      }
      .eyebrow {
        color: #1d4ed8;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.12em;
      }
      .intro {
        color: #64748b;
        margin: 0 0 28px;
      }
      h1 {
        font-size: 32px;
        margin: 8px 0 10px;
      }
      form {
        display: grid;
        gap: 6px;
      }
      button {
        height: 46px;
      }
      .login-error {
        margin: 6px 0 0;
        padding: 10px 12px;
        border-left: 3px solid #dc2626;
        background: #fef2f2;
        color: #991b1b;
        font-size: 12px;
        line-height: 1.5;
      }
      .demo-note {
        margin-top: 28px;
        padding: 16px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        display: grid;
        gap: 4px;
        font-size: 13px;
        color: #475569;
      }
      .demo-note strong {
        color: #0f172a;
      }
      aside {
        background: #0f172a;
        color: #fff;
        padding: 7vw;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      aside span {
        color: #67e8f9;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 12px;
        font-weight: 700;
      }
      aside h2 {
        font-size: clamp(30px, 4vw, 54px);
        line-height: 1.08;
        max-width: 760px;
        margin: 22px 0;
      }
      aside p {
        color: #94a3b8;
        max-width: 600px;
        line-height: 1.7;
      }
      .journey {
        display: flex;
        flex-wrap: wrap;
        gap: 24px;
        padding: 28px 0;
        margin-top: 20px;
        border-top: 1px solid #334155;
      }
      .journey span {
        font-size: 11px;
        letter-spacing: 0.05em;
        color: #cbd5e1;
      }
      aside small {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 28px;
      }
      @media (max-width: 850px) {
        .login-shell {
          grid-template-columns: 1fr;
        }
        aside {
          display: none;
        }
        .login-panel {
          padding: 32px 24px;
        }
      }
    `,
  ],
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly submitting = signal(false);
  readonly loginError = signal('');
  readonly form = new FormGroup({
    email: new FormControl('operator@mazmilogistics.test', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('Demo2026!', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  submit(): void {
    if (this.form.invalid) return;
    this.loginError.set('');
    this.submitting.set(true);
    this.auth
      .login(this.form.controls.email.value, this.form.controls.password.value)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () =>
          void this.router.navigateByUrl(
            this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard',
          ),
        error: () =>
          this.loginError.set(
            'Sign-in failed. Check the demo credentials and confirm the backend is available.',
          ),
      });
  }
}
