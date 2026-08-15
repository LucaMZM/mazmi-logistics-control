import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { FeedbackStateComponent } from '../../shared/components/feedback-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';
import { Role, UserRecord } from '../../shared/models/models';

@Component({
  selector: 'app-user-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `<h2 mat-dialog-title>{{ data.user ? 'Edit user' : 'Create user' }}</h2>
    <mat-dialog-content
      ><form [formGroup]="form">
        <mat-form-field appearance="outline"
          ><mat-label>Name</mat-label><input matInput formControlName="name"
        /></mat-form-field>
        @if (!data.user) {
          <mat-form-field appearance="outline"
            ><mat-label>Email</mat-label
            ><input matInput type="email" formControlName="email" /></mat-form-field
          ><mat-form-field appearance="outline"
            ><mat-label>Temporary password</mat-label
            ><input matInput type="password" formControlName="password"
          /></mat-form-field>
        }
        <mat-form-field appearance="outline"
          ><mat-label>Role</mat-label
          ><mat-select formControlName="role"
            ><mat-option value="ADMIN">Admin</mat-option
            ><mat-option value="OPERATOR">Operator</mat-option
            ><mat-option value="VIEWER">Viewer</mat-option></mat-select
          ></mat-form-field
        >
        @if (data.user) {
          <mat-checkbox formControlName="enabled">Account enabled</mat-checkbox>
        }
      </form></mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button mat-button mat-dialog-close>Cancel</button
      ><button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">
        Save user
      </button></mat-dialog-actions
    >`,
  styles: ['form{display:grid;min-width:min(440px,75vw);padding-top:5px}'],
})
export class UserDialog {
  readonly data = inject<{ user?: UserRecord }>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<UserDialog>);
  readonly form = new FormGroup({
    name: new FormControl(this.data.user?.name ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    email: new FormControl(this.data.user?.email ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: this.data.user ? [] : [Validators.required, Validators.minLength(10)],
    }),
    role: new FormControl<Role>(this.data.user?.role ?? 'VIEWER', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    enabled: new FormControl(this.data.user?.enabled ?? true, { nonNullable: true }),
  });
  save(): void {
    if (this.form.valid) this.ref.close(this.form.getRawValue());
  }
}

@Component({
  selector: 'app-password-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `<h2 mat-dialog-title>Reset password</h2>
    <mat-dialog-content
      ><p>Set a new password for {{ data.name }}. Existing passwords are never displayed.</p>
      <mat-form-field appearance="outline"
        ><mat-label>New password</mat-label
        ><input
          matInput
          type="password"
          [formControl]="password" /></mat-form-field></mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button mat-button mat-dialog-close>Cancel</button
      ><button mat-flat-button color="primary" [disabled]="password.invalid" (click)="save()">
        Reset password
      </button></mat-dialog-actions
    >`,
  styles: [
    'mat-dialog-content{display:grid;min-width:min(420px,75vw)}p{font-size:11px;color:#64748b}',
  ],
})
export class PasswordDialog {
  readonly data = inject<{ name: string }>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<PasswordDialog>);
  readonly password = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(10)],
  });
  save(): void {
    if (this.password.valid) this.ref.close(this.password.value);
  }
}

@Component({
  selector: 'app-users-page',
  imports: [
    DatePipe,
    MatButtonModule,
    FeedbackStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    StatusChipComponent,
  ],
  template: `<app-page-header
      eyebrow="Administration"
      title="Users"
      subtitle="Backend-enforced role and account management."
      ><button mat-flat-button color="primary" (click)="openUser()">
        Create user
      </button></app-page-header
    >
    <section>
      @if (loading()) {
        <app-loading-state />
      } @else if (loadError()) {
        <app-feedback-state
          kind="error"
          title="Users unavailable"
          message="User administration data could not be loaded."
          actionLabel="Retry"
          (action)="load()"
        />
      } @else {
        @if (users().length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (user of users(); track user.id) {
                  <tr>
                    <td>
                      <strong>{{ user.name }}</strong>
                    </td>
                    <td>{{ user.email }}</td>
                    <td><app-status-chip [status]="user.role" /></td>
                    <td>
                      <app-status-chip
                        [status]="user.enabled ? 'AVAILABLE' : 'INACTIVE'"
                        [label]="user.enabled ? 'ENABLED' : 'DISABLED'"
                      />
                    </td>
                    <td>{{ user.createdAt | date: 'mediumDate' }}</td>
                    <td class="actions">
                      <button mat-button (click)="openUser(user)">Edit</button
                      ><button mat-button (click)="resetPassword(user)">Reset password</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-feedback-state
            title="No users"
            message="There are no application users to display."
          />
        }
      }
    </section>`,
  styles: [
    `
      section {
        background: #fff;
        border: 1px solid #e2e8f0;
      }
      .table-wrap {
        overflow: auto;
      }
      table {
        width: 100%;
        min-width: 800px;
        border-collapse: collapse;
      }
      th,
      td {
        padding: 14px 17px;
        text-align: left;
        border-bottom: 1px solid #eef2f7;
        font-size: 11px;
      }
      th {
        background: #f8fafc;
        color: #64748b;
        text-transform: uppercase;
        font-size: 9px;
        letter-spacing: 0.07em;
      }
      .actions {
        text-align: right;
        white-space: nowrap;
      }
    `,
  ],
})
export class UsersPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly users = signal<UserRecord[]>([]);
  ngOnInit(): void {
    this.load();
  }
  openUser(user?: UserRecord): void {
    this.dialog
      .open(UserDialog, { data: { user } })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(
          (value: {
            name: string;
            email: string;
            password: string;
            role: Role;
            enabled: boolean;
          }) =>
            user
              ? this.api.updateUser(user.id, {
                  name: value.name,
                  role: value.role,
                  enabled: value.enabled,
                })
              : this.api.createUser({
                  name: value.name,
                  email: value.email,
                  password: value.password,
                  role: value.role,
                }),
        ),
      )
      .subscribe(() => {
        this.snackBar.open('User saved.', 'Dismiss', { duration: 2400 });
        this.load();
      });
  }
  resetPassword(user: UserRecord): void {
    this.dialog
      .open(PasswordDialog, { data: { name: user.name } })
      .afterClosed()
      .pipe(
        filter((value): value is string => typeof value === 'string'),
        switchMap((password) => this.api.resetPassword(user.id, password)),
      )
      .subscribe(() =>
        this.snackBar.open('Password reset completed.', 'Dismiss', { duration: 2500 }),
      );
  }
  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.api.users().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }
}
