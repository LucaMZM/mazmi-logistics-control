import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-page-header',
  imports: [RouterLink],
  template: `
    <header [class.aurora]="aurora">
      <div class="heading-content">
        <p>
          @if (backLink) {
            <a [routerLink]="backLink">‹ {{ eyebrow }}</a>
          } @else {
            {{ eyebrow }}
          }
        </p>
        <h1 [attr.aria-label]="title">
          @if (kinetic && aurora) {
            @for (word of titleWords(); track $index; let i = $index) {
              <span class="kinetic-word" aria-hidden="true" [style.--reveal-index]="i"
                >{{ word }}&nbsp;</span
              >
            }
          } @else {
            {{ title }}
          }
        </h1>
        <span class="subtitle">{{ subtitle }}</span>
      </div>
      <div class="actions"><ng-content /></div>
    </header>
  `,
  styles: [
    `
      header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 20px;
        margin-bottom: 22px;
      }
      header.aurora {
        position: relative;
        isolation: isolate;
        overflow: hidden;
        align-items: center;
        min-height: 0;
      }
      .heading-content,
      .actions {
        position: relative;
        z-index: 1;
        min-width: 0;
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
      h1 .kinetic-word {
        display: inline-block;
        white-space: pre-wrap;
        animation: kinetic-word-in 620ms cubic-bezier(0.16, 1, 0.3, 1) both;
        animation-delay: calc(var(--reveal-index) * 65ms);
      }
      .subtitle {
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
      @keyframes kinetic-word-in {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @media (max-width: 700px) {
        header {
          align-items: flex-start;
          flex-direction: column;
        }
        header.aurora {
          align-items: flex-start;
          gap: 17px;
          min-height: 0;
          padding: 0;
        }
        .actions {
          width: 100%;
          justify-content: flex-start;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        h1 .kinetic-word {
          animation: none;
        }
      }
      @media (prefers-reduced-transparency: reduce) {
        header.aurora {
          background: #f3f3f6;
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
  @Input() aurora = false;
  @Input() kinetic = true;

  titleWords(): string[] {
    return this.title.trim().split(/\s+/).filter(Boolean);
  }
}
