import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-page-header',
  imports: [RouterLink],
  template: `<header>
    <div>
      <p>
        @if (backLink) {
          <a [routerLink]="backLink">‹ {{ eyebrow }}</a>
        } @else {
          {{ eyebrow }}
        }
      </p>
      <h1>{{ title }}</h1>
      <span>{{ subtitle }}</span>
    </div>
    <div class="actions"><ng-content /></div>
  </header>`,
  styles: [
    `
      header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 20px;
        margin-bottom: 22px;
      }
      p {
        font-size: 11px;
        letter-spacing: 0.12em;
        font-weight: 700;
        color: var(--accent);
        text-transform: uppercase;
        margin: 0 0 6px;
      }
      p a {
        color: var(--accent);
        text-decoration: none;
        display: inline-block;
        padding: 3px 0;
      }
      p a:hover {
        text-decoration: underline;
      }
      h1 {
        font-size: clamp(27px, 2.2vw, 33px);
        letter-spacing: -0.035em;
        overflow-wrap: anywhere;
        line-height: 1.2;
        margin: 0;
        color: var(--ink);
      }
      span {
        display: block;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.6;
        margin-top: 6px;
      }
      .actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
      }
      @media (max-width: 700px) {
        header {
          align-items: flex-start;
          flex-direction: column;
        }
        .actions {
          width: 100%;
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class PageHeaderComponent {
  @Input() eyebrow = 'Operations';
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() backLink = '';
}
