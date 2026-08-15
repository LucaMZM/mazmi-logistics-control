import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/services/api.service';
import { FeedbackStateComponent } from '../../shared/components/feedback-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';
import { Driver, Vehicle } from '../../shared/models/models';
import { DriverEditorDialog, VehicleEditorDialog } from './fleet-editor.dialogs';

@Component({
  selector: 'app-fleet-page',
  imports: [
    MatButtonModule,
    MatTabsModule,
    FeedbackStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    StatusChipComponent,
  ],
  template: `<app-page-header
      title="Fleet"
      subtitle="Driver availability and vehicle capacity for shipment assignment."
    >
      @if (auth.canOperate()) {
        <button mat-stroked-button (click)="openDriver()">New driver</button>
        <button mat-flat-button color="primary" (click)="openVehicle()">New vehicle</button>
      }
    </app-page-header>
    <section>
      @if (loading()) {
        <app-loading-state />
      } @else if (loadError()) {
        <app-feedback-state
          kind="error"
          title="Fleet unavailable"
          message="Driver and vehicle availability could not be loaded."
          actionLabel="Retry"
          (action)="load()"
        />
      } @else {
        <mat-tab-group animationDuration="0ms"
          ><mat-tab label="Vehicles"
            ><div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Plate</th>
                    <th>Model</th>
                    <th>Type</th>
                    <th class="numeric">Capacity</th>
                    <th>Status</th>
                    @if (auth.canOperate()) {
                      <th>Actions</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (item of vehicles(); track item.id) {
                    <tr>
                      <td>
                        <strong>{{ item.registrationPlate }}</strong>
                      </td>
                      <td>{{ item.model }}</td>
                      <td>{{ item.vehicleType.replaceAll('_', ' ') }}</td>
                      <td class="numeric">{{ item.capacityKg }} kg</td>
                      <td><app-status-chip [status]="item.status" /></td>
                      @if (auth.canOperate()) {
                        <td><button mat-button (click)="openVehicle(item)">Edit</button></td>
                      }
                    </tr>
                  } @empty {
                    <tr>
                      <td [attr.colspan]="auth.canOperate() ? 6 : 5">
                        <app-feedback-state
                          title="No vehicles"
                          message="There are no vehicles configured for assignment."
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table></div></mat-tab
          ><mat-tab label="Drivers"
            ><div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Name</th>
                    <th>License</th>
                    <th>Phone</th>
                    <th>Status</th>
                    @if (auth.canOperate()) {
                      <th>Actions</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (item of drivers(); track item.id) {
                    <tr>
                      <td>
                        <strong>{{ item.employeeCode }}</strong>
                      </td>
                      <td>{{ item.fullName }}</td>
                      <td>{{ item.licenseNumber }}</td>
                      <td>{{ item.phone }}</td>
                      <td><app-status-chip [status]="item.status" /></td>
                      @if (auth.canOperate()) {
                        <td><button mat-button (click)="openDriver(item)">Edit</button></td>
                      }
                    </tr>
                  } @empty {
                    <tr>
                      <td [attr.colspan]="auth.canOperate() ? 6 : 5">
                        <app-feedback-state
                          title="No drivers"
                          message="There are no drivers configured for assignment."
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table></div></mat-tab
        ></mat-tab-group>
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
        min-width: 760px;
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
      .numeric {
        text-align: right;
      }
    `,
  ],
})
export class FleetPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly auth = inject(AuthService);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly drivers = signal<Driver[]>([]);
  readonly vehicles = signal<Vehicle[]>([]);
  ngOnInit(): void {
    this.load();
  }

  openDriver(driver?: Driver): void {
    this.dialog
      .open(DriverEditorDialog, { data: driver ?? null, width: '580px' })
      .afterClosed()
      .subscribe((payload: unknown) => {
        if (!payload) return;
        this.api.saveDriver(driver?.id, payload).subscribe(() => {
          this.snackBar.open(driver ? 'Driver updated.' : 'Driver created.', 'Dismiss', {
            duration: 2500,
          });
          this.load();
        });
      });
  }

  openVehicle(vehicle?: Vehicle): void {
    this.dialog
      .open(VehicleEditorDialog, { data: vehicle ?? null, width: '580px' })
      .afterClosed()
      .subscribe((payload: unknown) => {
        if (!payload) return;
        this.api.saveVehicle(vehicle?.id, payload).subscribe(() => {
          this.snackBar.open(vehicle ? 'Vehicle updated.' : 'Vehicle created.', 'Dismiss', {
            duration: 2500,
          });
          this.load();
        });
      });
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    forkJoin({ drivers: this.api.drivers(), vehicles: this.api.vehicles() }).subscribe({
      next: ({ drivers, vehicles }) => {
        this.drivers.set(drivers);
        this.vehicles.set(vehicles);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }
}
