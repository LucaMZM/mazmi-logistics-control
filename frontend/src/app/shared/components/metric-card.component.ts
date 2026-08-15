import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-metric-card',
  template: `<article [attr.data-tone]="tone">
    <span>{{ label }}</span
    ><strong>{{ value }}</strong
    ><small>{{ detail }}</small>
  </article>`,
  styles: [
    `
      article {
        background: #fff;
        border: 1px solid #e2e8f0;
        padding: 18px 20px;
        min-height: 104px;
        border-left: 3px solid #1d4ed8;
      }
      span {
        font-size: 12px;
        color: #64748b;
        font-weight: 600;
      }
      strong {
        display: block;
        font-size: 28px;
        line-height: 1;
        margin: 13px 0 7px;
        color: #0f172a;
      }
      small {
        font-size: 11px;
        color: #94a3b8;
      }
      article[data-tone='danger'] {
        border-left-color: #dc2626;
      }
      article[data-tone='warning'] {
        border-left-color: #d97706;
      }
      article[data-tone='tracking'] {
        border-left-color: #0891b2;
      }
    `,
  ],
})
export class MetricCardComponent {
  @Input({ required: true }) label = '';
  @Input() value: number | string = '—';
  @Input() detail = 'Live operational total';
  @Input() tone = 'primary';
}
