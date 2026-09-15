import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-metric-card',
  template: `<article [attr.data-tone]="tone">
    <span>{{ label }}</span
    ><strong>{{ value }}</strong>
    @if (detail) {
      <small>{{ detail }}</small>
    }
  </article>`,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      article {
        height: 100%;
        background: #fff;
        border: 1px solid #e2e8f0;
        padding: 20px 22px;
        min-height: 130px;
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        border-top: 3px solid #176b87;
      }
      span {
        font-size: 12px;
        color: #64748b;
        font-weight: 600;
      }
      strong {
        display: block;
        font-size: 34px;
        letter-spacing: -0.04em;
        font-variant-numeric: tabular-nums;
        line-height: 1;
        margin: 13px 0 7px;
        color: #0f172a;
      }
      small {
        font-size: 11px;
        color: #5c6f7e;
      }
      article[data-tone='danger'] {
        border-top-color: #c74444;
      }
      article[data-tone='warning'] {
        border-top-color: #c18022;
      }
      article[data-tone='tracking'] {
        border-top-color: #268e93;
      }
    `,
  ],
})
export class MetricCardComponent {
  @Input({ required: true }) label = '';
  @Input() value: number | string = '—';
  @Input() detail = '';
  @Input() tone = 'primary';
}
