import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageHeaderComponent } from './page-header.component';

describe('MAZMI Glass page headers', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });
  afterEach(() => TestBed.resetTestingModule());

  it('keeps a semantic h1 while revealing words visually', () => {
    const fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.componentRef.setInput('title', 'Operations command center');
    fixture.componentRef.setInput('aurora', true);
    fixture.detectChanges();
    const heading = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(heading.getAttribute('aria-label')).toBe('Operations command center');
    expect(heading.querySelectorAll('.kinetic-word')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('app-silk-aurora')).toBeTruthy();

    fixture.componentRef.setInput('title', 'Orders');
    fixture.detectChanges();
    expect(heading.getAttribute('aria-label')).toBe('Orders');
    expect(heading.querySelectorAll('.kinetic-word')).toHaveLength(1);
    fixture.destroy();
  });

  it('can display titles without any word animation markup', () => {
    const fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.componentRef.setInput('title', 'Order details');
    fixture.componentRef.setInput('kinetic', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe('Order details');
    expect(fixture.nativeElement.querySelector('.kinetic-word')).toBeNull();
    fixture.destroy();
  });
});
