import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-state',
  imports: [MatProgressSpinnerModule],
  template:
    '<div role="status" aria-live="polite"><mat-spinner diameter="28" aria-hidden="true" /><span>Loading operational data…</span></div>',
  styles: [
    `
      div {
        min-height: 220px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 14px;
        color: #64748b;
        font-size: 13px;
      }
    `,
  ],
})
export class LoadingStateComponent {}
