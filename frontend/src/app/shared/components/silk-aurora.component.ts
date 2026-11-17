import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal } from '@angular/core';

/**
 * A decorative, CSS-only silk aurora. No WebGL canvas or animation loop.
 * The animation is paused when its host is outside the viewport.
 */
@Component({
  selector: 'app-silk-aurora',
  template: `
    <div class="silk" [class.silk-paused]="!visible()" aria-hidden="true">
      <span class="silk-sweep silk-sweep-one"></span>
      <span class="silk-sweep silk-sweep-two"></span>
      <span class="silk-grain"></span>
    </div>
  `,
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
        overflow: hidden;
        background:
          radial-gradient(ellipse at 88% 10%, rgb(195 226 210 / 34%), transparent 64%),
          linear-gradient(120deg, #fbfdfb, #e9f2ee 50%, #f5f7f4);
      }
      .silk-sweep {
        position: absolute;
        width: 86%;
        height: 140%;
        top: -20%;
        left: 24%;
        border-radius: 50%;
        filter: blur(26px);
        transform: rotate(-22deg);
        opacity: 0.36;
        animation: silk-drift 26s ease-in-out infinite alternate;
      }
      .silk-sweep-one {
        background: linear-gradient(
          110deg,
          transparent 9%,
          rgb(133 190 175 / 54%) 33%,
          rgb(211 224 212 / 32%) 55%,
          transparent 77%
        );
      }
      .silk-sweep-two {
        left: 39%;
        top: -30%;
        opacity: 0.26;
        background: linear-gradient(
          105deg,
          transparent 10%,
          rgb(114 161 168 / 50%) 44%,
          rgb(221 210 187 / 42%) 64%,
          transparent 84%
        );
        animation-delay: -13s;
        animation-duration: 34s;
      }
      .silk-grain {
        position: absolute;
        inset: 0;
        background: linear-gradient(100deg, rgb(255 255 255 / 62%), transparent 65%);
      }
      .silk-paused .silk-sweep {
        animation-play-state: paused;
      }
      @keyframes silk-drift {
        from {
          transform: translate3d(-4%, 1%, 0) rotate(-22deg);
        }
        to {
          transform: translate3d(7%, -2%, 0) rotate(-10deg);
        }
      }
      @media (prefers-reduced-motion: reduce), (prefers-reduced-transparency: reduce) {
        .silk-sweep {
          animation: none;
          filter: none;
          opacity: 0.13;
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
