import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-chip',
  template:
    '<span class="status" [attr.data-status]="status">{{ label || status.replaceAll(\'_\', \' \') }}</span>',
  styles: [
    `
      .status {
        display: inline-flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 5px;
        border: 1px solid var(--line);
        background: var(--surface);
        color: var(--muted);
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.01em;
        white-space: nowrap;
      }
      .status[data-status='DELIVERED'],
      .status[data-status='HEALTHY'],
      .status[data-status='AVAILABLE'],
      .status[data-status='RESOLVED'],
      .status[data-status='ON_TIME'] {
        border-color: var(--success);
        background: var(--raised);
        color: var(--success);
      }
      .status[data-status='DELAYED'],
      .status[data-status='CRITICAL'],
      .status[data-status='OUT_OF_STOCK'],
      .status[data-status='CANCELLED'] {
        border-color: var(--danger);
        background: var(--raised);
        color: var(--danger);
      }
      .status[data-status='AT_RISK'],
      .status[data-status='HIGH'],
      .status[data-status='LOW_STOCK'],
      .status[data-status='URGENT'],
      .status[data-status='OPEN'] {
        border-color: var(--warning);
        background: var(--raised);
        color: var(--warning);
      }
      .status[data-status='IN_TRANSIT'],
      .status[data-status='CONFIRMED'],
      .status[data-status='PREPARING'],
      .status[data-status='READY'],
      .status[data-status='RESERVATION'],
      .status[data-status='DISPATCH'],
      .status[data-status='ON_ROUTE'],
      .status[data-status='IN_SERVICE'],
      .status[data-status='SHIPPED'],
      .status[data-status='ASSIGNED'] {
        border-color: var(--line);
        background: var(--raised);
        color: var(--muted);
      }
    `,
  ],
})
export class StatusChipComponent {
  @Input({ required: true }) status = '';
  @Input() label = '';
}
