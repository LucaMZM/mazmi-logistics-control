import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/services/api.service';
import { FeedbackStateComponent } from '../../shared/components/feedback-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';
import { Incident } from '../../shared/models/models';

@Component({
  selector: 'app-resolve-incident-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `<h2 mat-dialog-title>Resolve incident</h2>
    <mat-dialog-content
      ><p>Record the operational resolution before restoring delivery health.</p>
      <mat-form-field appearance="outline"
        ><mat-label>Resolution note</mat-label
        ><textarea
          matInput
          rows="4"
          [formControl]="note"
        ></textarea></mat-form-field></mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button mat-button mat-dialog-close>Cancel</button
      ><button mat-flat-button color="primary" [disabled]="note.invalid" (click)="resolve()">
        Resolve incident
      </button></mat-dialog-actions
    >`,
  styles: [
    'mat-dialog-content{display:grid;min-width:min(440px,75vw)}p{font-size:12px;color:#64748b}',
  ],
})
export class ResolveIncidentDialog {
  readonly data = inject<{ title: string }>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ResolveIncidentDialog>);
  readonly note = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(5)],
  });
  resolve(): void {
    if (this.note.valid) this.ref.close(this.note.value);
  }
}

@Component({
  selector: 'app-incident-detail-page',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    FeedbackStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    StatusChipComponent,
  ],
  template: `@if (loading()) {
      <app-loading-state />
    } @else if (loadError()) {
      <app-feedback-state
        kind="error"
        title="Incident unavailable"
        message="This incident could not be loaded."
        actionLabel="Retry"
        (action)="load()"
      />
    } @else if (incident(); as item) {
      <app-page-header eyebrow="Incident" [title]="item.title" [subtitle]="item.trackingNumber"
        ><app-status-chip [status]="item.severity" /><app-status-chip [status]="item.status" />
        @if (item.status === 'OPEN' && auth.canOperate()) {
          <button mat-flat-button color="primary" (click)="resolve()">Resolve incident</button>
        }
      </app-page-header>
      <section class="incident">
        <div class="main">
          <h2>Operational description</h2>
          <p>{{ item.description }}</p>
          @if (item.resolutionNote) {
            <div class="resolution">
              <span>Resolution</span><strong>{{ item.resolutionNote }}</strong
              ><small>{{ item.resolvedAt | date: 'medium' }}</small>
            </div>
          }
        </div>
        <aside>
          <dl>
            <dt>Shipment</dt>
            <dd>
              <a [routerLink]="['/shipments', item.shipmentId]">{{ item.trackingNumber }}</a>
            </dd>
            <dt>Type</dt>
            <dd>{{ item.type.replaceAll('_', ' ') }}</dd>
            <dt>Severity</dt>
            <dd>{{ item.severity }}</dd>
            <dt>Opened</dt>
            <dd>{{ item.openedAt | date: 'medium' }}</dd>
            <dt>Created by</dt>
            <dd>{{ item.createdBy }}</dd>
          </dl>
        </aside>
      </section>
    }`,
  styles: [
    `
      .incident {
        display: grid;
        grid-template-columns: 1.5fr 1fr;
        gap: 18px;
      }
      .main,
      aside {
        background: #fff;
        border: 1px solid #e2e8f0;
        padding: 24px;
      }
      .main h2 {
        font-size: 13px;
        margin: 0 0 14px;
      }
      .main > p {
        font-size: 12px;
        line-height: 1.7;
        color: #475569;
      }
      .resolution {
        border-left: 3px solid #16a34a;
        background: #f0fdf4;
        padding: 16px;
        margin-top: 25px;
      }
      .resolution span,
      .resolution strong,
      .resolution small {
        display: block;
      }
      .resolution span {
        font-size: 9px;
        color: #15803d;
        text-transform: uppercase;
        font-weight: 800;
      }
      .resolution strong {
        font-size: 12px;
        margin: 7px 0;
      }
      .resolution small {
        font-size: 9px;
        color: #64748b;
      }
      dl {
        display: grid;
        grid-template-columns: 100px 1fr;
        gap: 15px;
        margin: 0;
      }
      dt {
        font-size: 10px;
        color: #64748b;
      }
      dd {
        font-size: 11px;
        margin: 0;
      }
      dd a {
        color: #1d4ed8;
        font-weight: 700;
        text-decoration: none;
      }
      @media (max-width: 750px) {
        .incident {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class IncidentDetailPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly incident = signal<Incident | null>(null);
  private id = '';
  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }
  resolve(): void {
    this.dialog
      .open(ResolveIncidentDialog, { data: { title: this.incident()?.title } })
      .afterClosed()
      .pipe(
        filter((note): note is string => typeof note === 'string'),
        switchMap((note) => this.api.resolveIncident(this.id, note)),
      )
      .subscribe((incident) => {
        this.incident.set(incident);
        this.snackBar.open('Incident resolved and delivery health recalculated.', 'Dismiss', {
          duration: 3200,
        });
      });
  }
  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.api.incident(this.id).subscribe({
      next: (incident) => {
        this.incident.set(incident);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }
}
