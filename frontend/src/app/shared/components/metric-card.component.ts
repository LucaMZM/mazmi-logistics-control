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
        background: var(--surface);
        border: 1px solid var(--line);
        padding: 20px 22px;
        min-height: 130px;
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        border-top: 3px solid var(--accent);
      }
      span {
        font-size: 12px;
        color: var(--muted);
        font-weight: 600;
      }
      strong {
        display: block;
        font-size: 34px;
        letter-spacing: -0.04em;
        font-variant-numeric: tabular-nums;
        line-height: 1;
        margin: 13px 0 7px;
        color: var(--ink);
      }
      small {
        font-size: 11px;
        color: var(--muted);
      }
      article[data-tone='danger'] {
        border-top-color: var(--danger);
      }
      article[data-tone='warning'] {
        border-top-color: var(--warning);
      }
      article[data-tone='tracking'] {
        border-top-color: var(--line);
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
