import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal } from '@angular/core';

/**
 * A decorative, CSS-only silk aurora. No WebGL canvas or animation loop.
 * Highlights keyboard interaction only while the header is visible.
 */
@Component({
  selector: 'app-silk-aurora',
  template: ` <div class="silk" [class.silk-paused]="!visible()" aria-hidden="true"></div> `,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        display: block;
        overflow: hidden;
        border-radius: inherit;
        pointer-events: none;
        contain: paint;
      }
      .silk {
        position: absolute;
        inset: 0;
        border-inline-start: 3px solid var(--accent);
      }
      :host-context(.intro:focus-within) .silk:not(.silk-paused) {
        background-color: var(--raised);
      }
      @media (prefers-reduced-motion: no-preference) {
        .silk {
          transition: background-color 160ms ease-out;
        }
      }
    `,
  ],
})
export class SilkAuroraComponent implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer?: IntersectionObserver;
  readonly visible = signal(true);

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    this.observer = new IntersectionObserver(
      (entries) => this.visible.set(entries[0]?.isIntersecting ?? false),
      { rootMargin: '60px' },
    );
    this.observer.observe(this.element.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
