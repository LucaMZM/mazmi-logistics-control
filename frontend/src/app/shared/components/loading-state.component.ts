import { Component, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-state',
  imports: [MatProgressSpinnerModule],
  template:
    '<div role="status" aria-live="polite" aria-busy="true"><mat-spinner diameter="24" aria-hidden="true" /><span>{{ label }}</span><section aria-hidden="true"><i></i><i></i><i></i></section></div>',
  styles: [
    `
      div {
        min-height: 260px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 14px;
        color: #64748b;
        font-size: 13px;
      }
      section {
        width: min(420px, 65vw);
        display: grid;
        gap: 10px;
        margin-top: 10px;
      }
      i {
        display: block;
        height: 12px;
        background: #e9eff3;
        border-radius: 4px;
      }
      i:nth-child(2) {
        width: 85%;
      }
      i:nth-child(3) {
        width: 60%;
      }
    `,
  ],
})
export class LoadingStateComponent {
  @Input() label = 'Loading operational data…';
}
