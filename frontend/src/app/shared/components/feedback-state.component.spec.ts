import { TestBed } from '@angular/core/testing';
import { FeedbackStateComponent } from './feedback-state.component';

describe('MAZMI Glass shared feedback states', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('exposes an unavailable data state as an alert with an explicit retry action', () => {
    const fixture = TestBed.createComponent(FeedbackStateComponent);
    fixture.componentRef.setInput('kind', 'error');
    fixture.componentRef.setInput('title', 'Orders unavailable');
    fixture.componentRef.setInput('message', 'The current filters have been preserved.');
    fixture.componentRef.setInput('actionLabel', 'Retry');
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.textContent).toContain('Orders unavailable');
    const retry = root.querySelector('button') as HTMLButtonElement;
    const action = vi.fn();
    fixture.componentInstance.action.subscribe(action);
    retry.click();
    expect(action).toHaveBeenCalledOnce();
    fixture.destroy();
  });

  it('keeps an empty state accessible without showing a misleading action', () => {
    const fixture = TestBed.createComponent(FeedbackStateComponent);
    fixture.componentRef.setInput('title', 'No matching orders');
    fixture.componentRef.setInput('message', 'Try different filters.');
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(root.textContent).toContain('No matching orders');
    expect(root.querySelector('button')).toBeNull();
    fixture.destroy();
  });
});
