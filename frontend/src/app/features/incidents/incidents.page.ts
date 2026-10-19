import { DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { Subject, Subscription, takeUntil } from 'rxjs';
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
      <span class="result-count">{{ incidents().length }} visible incidents</span>
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
            <table class="responsive-table" aria-label="Incidents">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Severity</th>
                  <th>Shipment</th>
                  <th>Type</th>
                  <th>Opened</th>
                </tr>
              </thead>
              <tbody>
                @for (item of incidents(); track item.id) {
                  <tr>
                    <td data-label="Incident" data-wide>
                      <a [routerLink]="['/incidents', item.id]">{{ item.title }}</a>
                    </td>
                    <td data-label="Status"><app-status-chip [status]="item.status" /></td>
                    <td data-label="Severity"><app-status-chip [status]="item.severity" /></td>
                    <td data-label="Shipment">{{ item.trackingNumber }}</td>
                    <td data-label="Type">{{ item.type.replaceAll('_', ' ') }}</td>
                    <td data-label="Opened">{{ item.openedAt | date: 'short' }}</td>
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
      .result-count {
        margin-left: auto;
        align-self: center;
        color: var(--muted);
        font-size: 12px;
        font-weight: 650;
      }
      section {
        background: #fff;
        border: 1px solid #e2e8f0;
      }
      table {
        width: 100%;
        min-width: 800px;
        border-collapse: collapse;
      }
      @media (max-width: 600px) {
        .filters {
          flex-wrap: wrap;
        }
        .filters mat-form-field {
          width: calc(50% - 6px);
        }
        .result-count {
          width: 100%;
          margin-left: 0;
        }
      }
    `,
  ],
})
export class IncidentsPage implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly destroy$ = new Subject<void>();
  private request?: Subscription;
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
    this.request?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(false);
    this.request = this.api
      .incidents({ status: this.status.value, severity: this.severity.value, size: 100 })
      .pipe(takeUntil(this.destroy$))
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
