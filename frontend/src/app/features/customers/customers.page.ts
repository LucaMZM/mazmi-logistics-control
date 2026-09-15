import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, Subscription, takeUntil } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { FeedbackStateComponent } from '../../shared/components/feedback-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';
import { Customer } from '../../shared/models/models';

@Component({
  selector: 'app-customers-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    FeedbackStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    StatusChipComponent,
  ],
  template: `<app-page-header
      title="Customers"
      subtitle="Fictional companies and shipping destinations used by the demo workflow."
    /><mat-form-field appearance="outline" subscriptSizing="dynamic"
      ><mat-label>Search customers</mat-label><input matInput [formControl]="search"
    /></mat-form-field>
    <section>
      @if (loading()) {
        <app-loading-state />
      } @else if (loadError()) {
        <app-feedback-state
          kind="error"
          title="Customers unavailable"
          message="The customer directory could not be loaded. Your search has been preserved."
          actionLabel="Retry"
          (action)="retry()"
        />
      } @else {
        @if (customers().length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Location</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (customer of customers(); track customer.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/customers', customer.id]">{{ customer.code }}</a>
                    </td>
                    <td>
                      <strong>{{ customer.companyName }}</strong>
                    </td>
                    <td>{{ customer.contactName }}</td>
                    <td>{{ customer.city }}, {{ customer.country }}</td>
                    <td>{{ customer.email }}</td>
                    <td>
                      <app-status-chip [status]="customer.active ? 'AVAILABLE' : 'INACTIVE'" />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-feedback-state
            title="No customers found"
            message="Try a different company, contact or customer code."
          />
        }
      }
    </section>`,
  styles: [
    `
      mat-form-field {
        width: min(420px, 100%);
        margin-bottom: 14px;
      }
      section {
        background: #fff;
        border: 1px solid #e2e8f0;
      }
      table {
        width: 100%;
        min-width: 850px;
        border-collapse: collapse;
      }
    `,
  ],
})
export class CustomersPage implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly destroy$ = new Subject<void>();
  private request?: Subscription;
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly search = new FormControl('', { nonNullable: true });
  readonly customers = signal<Customer[]>([]);
  ngOnInit(): void {
    this.load();
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.load());
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  retry(): void {
    this.load();
  }
  private load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(false);
    this.request = this.api
      .customers(this.search.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.customers.set(result.content);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set(true);
          this.loading.set(false);
        },
      });
  }
}
