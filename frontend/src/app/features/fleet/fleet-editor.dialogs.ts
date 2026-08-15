import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Driver, Vehicle } from '../../shared/models/models';

const dialogStyles = `
  form { min-width: min(520px, 80vw); }
  mat-dialog-content { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; }
  mat-form-field { width: 100%; }
  .wide, mat-checkbox { grid-column: 1 / -1; }
  mat-checkbox { margin: 3px 0 15px; }
  @media (max-width: 620px) {
    form { min-width: 0; }
    mat-dialog-content { grid-template-columns: 1fr; }
  }
`;

@Component({
  selector: 'app-driver-editor-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `<form [formGroup]="form" (ngSubmit)="save()">
    <h2 mat-dialog-title>{{ data ? 'Edit driver' : 'New driver' }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline">
        <mat-label>Employee code</mat-label>
        <input matInput formControlName="employeeCode" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>License number</mat-label>
        <input matInput formControlName="licenseNumber" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>First name</mat-label>
        <input matInput formControlName="firstName" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Last name</mat-label>
        <input matInput formControlName="lastName" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Phone</mat-label>
        <input matInput formControlName="phone" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Status</mat-label>
        <mat-select formControlName="status">
          <mat-option value="AVAILABLE">Available</mat-option>
          <mat-option value="OFF_DUTY">Off duty</mat-option>
          @if (data?.status === 'ON_ROUTE') {
            <mat-option value="ON_ROUTE">On route</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-checkbox formControlName="active">Active driver</mat-checkbox>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">Save</button>
    </mat-dialog-actions>
  </form>`,
  styles: [dialogStyles],
})
export class DriverEditorDialog {
  readonly data = inject<Driver | null>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<DriverEditorDialog>);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly form = this.fb.group({
    employeeCode: [this.data?.employeeCode ?? '', Validators.required],
    firstName: [this.data?.firstName ?? '', Validators.required],
    lastName: [this.data?.lastName ?? '', Validators.required],
    phone: [this.data?.phone ?? '', Validators.required],
    licenseNumber: [this.data?.licenseNumber ?? '', Validators.required],
    status: [this.data?.status ?? 'AVAILABLE', Validators.required],
    active: [this.data?.active ?? true],
  });

  save(): void {
    if (this.form.invalid) return;
    this.ref.close(this.form.getRawValue());
  }
}

@Component({
  selector: 'app-vehicle-editor-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `<form [formGroup]="form" (ngSubmit)="save()">
    <h2 mat-dialog-title>{{ data ? 'Edit vehicle' : 'New vehicle' }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline">
        <mat-label>Registration plate</mat-label>
        <input matInput formControlName="registrationPlate" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Model</mat-label>
        <input matInput formControlName="model" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Type</mat-label>
        <mat-select formControlName="vehicleType">
          <mat-option value="VAN">Van</mat-option>
          <mat-option value="TRUCK">Truck</mat-option>
          <mat-option value="LARGE_TRUCK">Large truck</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Capacity (kg)</mat-label>
        <input matInput type="number" min="1" formControlName="capacityKg" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="wide">
        <mat-label>Status</mat-label>
        <mat-select formControlName="status">
          <mat-option value="AVAILABLE">Available</mat-option>
          <mat-option value="MAINTENANCE">Maintenance</mat-option>
          @if (data?.status === 'IN_SERVICE') {
            <mat-option value="IN_SERVICE">In service</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-checkbox formControlName="active">Active vehicle</mat-checkbox>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">Save</button>
    </mat-dialog-actions>
  </form>`,
  styles: [dialogStyles],
})
export class VehicleEditorDialog {
  readonly data = inject<Vehicle | null>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<VehicleEditorDialog>);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly form = this.fb.group({
    registrationPlate: [this.data?.registrationPlate ?? '', Validators.required],
    model: [this.data?.model ?? '', Validators.required],
    vehicleType: [this.data?.vehicleType ?? 'VAN', Validators.required],
    capacityKg: [this.data?.capacityKg ?? 1, [Validators.required, Validators.min(1)]],
    status: [this.data?.status ?? 'AVAILABLE', Validators.required],
    active: [this.data?.active ?? true],
  });

  save(): void {
    if (this.form.invalid) return;
    this.ref.close(this.form.getRawValue());
  }
}
