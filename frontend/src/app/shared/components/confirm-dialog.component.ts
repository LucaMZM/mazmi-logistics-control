import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `<h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content
      ><p>{{ data.message }}</p></mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button mat-button mat-dialog-close>Keep current state</button
      ><button mat-flat-button [color]="data.danger ? 'warn' : 'primary'" (click)="confirm()">
        {{ data.confirmLabel }}
      </button></mat-dialog-actions
    >`,
})
export class ConfirmDialogComponent {
  readonly data = inject<{
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
  }>(MAT_DIALOG_DATA);
  private readonly dialog = inject(MatDialogRef<ConfirmDialogComponent>);
  confirm(): void {
    this.dialog.close(true);
  }
}
