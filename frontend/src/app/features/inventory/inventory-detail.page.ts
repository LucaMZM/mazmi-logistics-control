import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
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
import { ActivatedRoute } from '@angular/router';
import { filter, forkJoin, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/services/api.service';
import { FeedbackStateComponent } from '../../shared/components/feedback-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';
import { Inventory, StockMovement } from '../../shared/models/models';

const nonZero: ValidatorFn = (control) => (Number(control.value) === 0 ? { nonZero: true } : null);

@Component({
  selector: 'app-inventory-action-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `<h2 mat-dialog-title>
      {{ data.action === 'receive' ? 'Receive stock' : 'Adjust stock' }}
    </h2>
    <mat-dialog-content
      ><p>Every change creates an immutable stock movement.</p>
      <mat-form-field appearance="outline"
        ><mat-label>{{
          data.action === 'receive' ? 'Quantity received' : 'On-hand delta'
        }}</mat-label
        ><input matInput type="number" [formControl]="quantity" /></mat-form-field
      ><mat-form-field appearance="outline"
        ><mat-label>Operational note</mat-label
        ><textarea matInput [formControl]="note"></textarea></mat-form-field></mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button mat-button mat-dialog-close>Cancel</button
      ><button
        mat-flat-button
        color="primary"
        [disabled]="quantity.invalid || note.invalid"
        (click)="save()"
      >
        Record movement
      </button></mat-dialog-actions
    >`,
  styles: [
    'mat-dialog-content{display:grid;min-width:min(420px,75vw)}p{font-size:12px;color:#64748b}',
  ],
})
export class InventoryActionDialog {
  readonly data = inject<{ action: 'receive' | 'adjust' }>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<InventoryActionDialog>);
  readonly quantity = new FormControl<number>(this.data.action === 'receive' ? 1 : 0, {
    nonNullable: true,
    validators: [
      Validators.required,
      ...(this.data.action === 'receive' ? [Validators.min(1)] : [nonZero]),
    ],
  });
  readonly note = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/\S/)],
  });
  save(): void {
    if (this.quantity.valid && this.note.valid)
      this.ref.close({ quantity: this.quantity.value, note: this.note.value });
  }
}

@Component({
  selector: 'app-inventory-detail-page',
  imports: [
    DatePipe,
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
        title="Inventory level unavailable"
        message="The balance and movement history could not be loaded."
        actionLabel="Retry"
        (action)="load()"
      />
    } @else if (level(); as item) {
      <app-page-header
        eyebrow="Inventory level"
        [title]="item.sku + ' · ' + item.product"
        [subtitle]="item.warehouse"
        ><app-status-chip [status]="item.stockStatus" />
        @if (auth.canOperate()) {
          <button mat-stroked-button (click)="open('receive')">Receive stock</button
          ><button mat-flat-button color="primary" (click)="open('adjust')">Adjust stock</button>
        }
      </app-page-header>
      <section class="balances">
        <article>
          <span>On hand</span><strong>{{ item.onHand }}</strong>
        </article>
        <article>
          <span>Reserved</span><strong>{{ item.reserved }}</strong>
        </article>
        <article>
          <span>Available</span><strong>{{ item.available }}</strong>
        </article>
        <article>
          <span>Reorder level</span><strong>{{ item.reorderLevel }}</strong>
        </article>
      </section>
      <section class="history">
        <header>
          <h2>Stock movement history</h2>
          <p>Version {{ item.version }} · updated {{ item.updatedAt | date: 'medium' }}</p>
        </header>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Note</th>
                <th class="numeric">On-hand delta</th>
                <th class="numeric">Reserved delta</th>
                <th>Actor</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              @for (movement of movements(); track movement.id) {
                <tr>
                  <td><app-status-chip [status]="movement.type" /></td>
                  <td>{{ movement.note }}</td>
                  <td class="numeric" [class.negative]="movement.onHandDelta < 0">
                    {{ signed(movement.onHandDelta) }}
                  </td>
                  <td class="numeric" [class.negative]="movement.reservedDelta < 0">
                    {{ signed(movement.reservedDelta) }}
                  </td>
                  <td>{{ movement.createdBy }}</td>
                  <td>{{ movement.createdAt | date: 'short' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6">
                    <app-feedback-state
                      title="No stock movements"
                      message="No audited movement has been recorded for this stock level."
                    />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }`,
  styles: [
    `
      .balances {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
        margin-bottom: 18px;
      }
      .balances article {
        background: #fff;
        border: 1px solid #e2e8f0;
        padding: 20px;
      }
      .balances span {
        font-size: 11px;
        color: #64748b;
      }
      .balances strong {
        display: block;
        font-size: 27px;
        margin-top: 10px;
      }
      .history {
        background: #fff;
        border: 1px solid #e2e8f0;
      }
      .history header {
        padding: 17px 20px;
        border-bottom: 1px solid #e2e8f0;
      }
      .history h2 {
        font-size: 13px;
        margin: 0;
      }
      .history p {
        font-size: 10px;
        color: #64748b;
        margin: 4px 0 0;
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
        padding: 13px 16px;
        border-bottom: 1px solid #eef2f7;
        text-align: left;
        font-size: 11px;
      }
      th {
        background: #f8fafc;
        color: #64748b;
        text-transform: uppercase;
        font-size: 9px;
      }
      .numeric {
        text-align: right;
      }
      .negative {
        color: #b91c1c;
      }
      @media (max-width: 700px) {
        .balances {
          grid-template-columns: 1fr 1fr;
        }
      }
    `,
  ],
})
export class InventoryDetailPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly level = signal<Inventory | null>(null);
  readonly movements = signal<StockMovement[]>([]);
  private id = '';
  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }
  open(action: 'receive' | 'adjust'): void {
    this.dialog
      .open(InventoryActionDialog, { data: { action } })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap((value: { quantity: number; note: string }) =>
          this.api.inventoryAction(
            this.id,
            action,
            action === 'receive'
              ? { quantity: value.quantity, note: value.note }
              : { onHandDelta: value.quantity, note: value.note },
          ),
        ),
      )
      .subscribe(() => {
        this.snackBar.open('Stock movement recorded.', 'Dismiss', { duration: 2500 });
        this.load();
      });
  }
  signed(value: number): string {
    return value > 0 ? `+${value}` : String(value);
  }
  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    forkJoin({
      level: this.api.inventoryLevel(this.id),
      movements: this.api.movements(this.id),
    }).subscribe({
      next: ({ level, movements }) => {
        this.level.set(level);
        this.movements.set(movements);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }
}
