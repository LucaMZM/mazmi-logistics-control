import { DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { FeedbackStateComponent } from '../../shared/components/feedback-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';
import { Incident } from '../../shared/models/models';

@Component({
  selector: 'app-incidents-page',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatSelectModule,
    FeedbackStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    StatusChipComponent,
  ],
  template: `<app-page-header
      title="Incidents"
      subtitle="Operational exceptions linked to shipment health and ETA."
    />
    <div class="filters">
      <mat-form-field appearance="outline" subscriptSizing="dynamic"
        ><mat-label>Status</mat-label
        ><mat-select [formControl]="status"
          ><mat-option value="">All</mat-option><mat-option value="OPEN">Open</mat-option
          ><mat-option value="RESOLVED">Resolved</mat-option></mat-select
        ></mat-form-field
      ><mat-form-field appearance="outline" subscriptSizing="dynamic"
        ><mat-label>Severity</mat-label
        ><mat-select [formControl]="severity"
          ><mat-option value="">All</mat-option><mat-option value="LOW">Low</mat-option
          ><mat-option value="MEDIUM">Medium</mat-option><mat-option value="HIGH">High</mat-option
          ><mat-option value="CRITICAL">Critical</mat-option></mat-select
        ></mat-form-field
      >
    </div>
    <section>
      @if (loading()) {
        <app-loading-state />
      } @else if (loadError()) {
        <app-feedback-state
          kind="error"
          title="Incidents unavailable"
          message="Operational incidents could not be loaded. The current filters have been preserved."
          actionLabel="Retry"
          (action)="load()"
        />
      } @else {
        @if (incidents().length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Severity</th>
                  <th>Type</th>
                  <th>Shipment</th>
                  <th>Title</th>
                  <th>Opened</th>
                </tr>
              </thead>
              <tbody>
                @for (item of incidents(); track item.id) {
                  <tr>
                    <td><app-status-chip [status]="item.status" /></td>
                    <td><app-status-chip [status]="item.severity" /></td>
                    <td>{{ item.type.replaceAll('_', ' ') }}</td>
                    <td>{{ item.trackingNumber }}</td>
                    <td>
                      <a [routerLink]="['/incidents', item.id]">{{ item.title }}</a>
                    </td>
                    <td>{{ item.openedAt | date: 'short' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-feedback-state
            title="No incidents found"
            message="No operational incident matches the current filters."
          />
        }
      }
    </section>`,
  styles: [
    `
      .filters {
        display: flex;
        gap: 12px;
        margin-bottom: 14px;
      }
      .filters mat-form-field {
        width: 190px;
      }
      section {
        background: #fff;
        border: 1px solid #e2e8f0;
      }
      .table-wrap {
        overflow: auto;
      }
      table {
        width: 100%;
        min-width: 850px;
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
      td a {
        color: #1d4ed8;
        font-weight: 700;
        text-decoration: none;
      }
    `,
  ],
})
export class IncidentsPage implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly destroy$ = new Subject<void>();
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly incidents = signal<Incident[]>([]);
  readonly status = new FormControl('', { nonNullable: true });
  readonly severity = new FormControl('', { nonNullable: true });
  ngOnInit(): void {
    this.load();
    this.status.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.load());
    this.severity.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.load());
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.api
      .incidents({ status: this.status.value, severity: this.severity.value, size: 100 })
      .subscribe({
        next: (result) => {
          this.incidents.set(result.content);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set(true);
          this.loading.set(false);
        },
      });
  }
}
