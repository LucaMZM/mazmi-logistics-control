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
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        color: #475569;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.035em;
        white-space: nowrap;
      }
      .status[data-status='DELIVERED'],
      .status[data-status='HEALTHY'],
      .status[data-status='AVAILABLE'],
      .status[data-status='RESOLVED'],
      .status[data-status='ON_TIME'] {
        border-color: #bbf7d0;
        background: #f0fdf4;
        color: #15803d;
      }
      .status[data-status='DELAYED'],
      .status[data-status='CRITICAL'],
      .status[data-status='OUT_OF_STOCK'],
      .status[data-status='CANCELLED'] {
        border-color: #fecaca;
        background: #fef2f2;
        color: #b91c1c;
      }
      .status[data-status='AT_RISK'],
      .status[data-status='HIGH'],
      .status[data-status='LOW_STOCK'],
      .status[data-status='URGENT'],
      .status[data-status='OPEN'] {
        border-color: #fed7aa;
        background: #fff7ed;
        color: #b45309;
      }
      .status[data-status='IN_TRANSIT'],
      .status[data-status='SHIPPED'],
      .status[data-status='ASSIGNED'] {
        border-color: #bae6fd;
        background: #f0f9ff;
        color: #0369a1;
      }
    `,
  ],
})
export class StatusChipComponent {
  @Input({ required: true }) status = '';
  @Input() label = '';
}
