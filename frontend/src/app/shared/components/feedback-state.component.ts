import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-feedback-state',
  imports: [MatButtonModule],
  template: `
    <div
      class="state"
      [class.error]="kind === 'error'"
      [attr.role]="kind === 'error' ? 'alert' : 'status'"
      aria-live="polite"
    >
      <span class="state-symbol" aria-hidden="true">{{ kind === 'error' ? '!' : '—' }}</span>
      <strong>{{ title }}</strong>
      <p>{{ message }}</p>
      @if (actionLabel) {
        <button mat-stroked-button type="button" (click)="action.emit()">
          {{ actionLabel }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .state {
        min-height: 170px;
        padding: 30px;
        display: grid;
        place-content: center;
        justify-items: center;
        text-align: center;
        color: #64748b;
      }
      strong {
        color: #0f172a;
        font-size: 14px;
      }
      p {
        max-width: 430px;
        margin: 7px 0 16px;
        font-size: 12px;
        line-height: 1.55;
      }
      .error strong {
        color: #991b1b;
      }
      .state-symbol {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        background: #eef3f6;
        border: 1px solid #dce6ec;
        border-radius: 8px;
        color: #47677a;
        font-size: 18px;
        margin-bottom: 14px;
      }
      .error .state-symbol {
        color: #991b1b;
        background: #fef2f2;
        border-color: #fecaca;
      }
    `,
  ],
})
export class FeedbackStateComponent {
  @Input() kind: 'empty' | 'error' = 'empty';
  @Input({ required: true }) title = '';
  @Input() message = '';
  @Input() actionLabel = '';
  @Output() readonly action = new EventEmitter<void>();
}
