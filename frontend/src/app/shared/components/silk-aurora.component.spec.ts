import { TestBed } from '@angular/core/testing';
import { SilkAuroraComponent } from './silk-aurora.component';

describe('Silk Aurora', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('pauses offscreen and disconnects its observer on destruction', () => {
    let notify!: IntersectionObserverCallback;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          notify = callback;
        }
        observe = observe;
        disconnect = disconnect;
      },
    );
    const fixture = TestBed.createComponent(SilkAuroraComponent);
    fixture.detectChanges();
    expect(observe).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('.silk').getAttribute('aria-hidden')).toBe('true');

    notify([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.silk').classList.contains('silk-paused')).toBe(true);

    notify([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.silk').classList.contains('silk-paused')).toBe(false);
    fixture.destroy();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('remains decorative when IntersectionObserver is not available', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const fixture = TestBed.createComponent(SilkAuroraComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-hidden="true"]')).toBeTruthy();
    fixture.destroy();
  });
});
