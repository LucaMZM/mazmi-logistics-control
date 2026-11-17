import { TestBed } from '@angular/core/testing';
import { OperationalCircuitComponent } from './operational-circuit.component';

describe('Control Room illustrative circuit', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('labels lines as illustrative and displays only supplied ERP counters', () => {
    const fixture = TestBed.createComponent(OperationalCircuitComponent);
    fixture.componentRef.setInput('snapshot', {
      activeShipments: 8,
      delayedShipments: 2,
      openIncidents: 3,
      criticalPositions: 1,
    });
    fixture.detectChanges();
    const section = fixture.nativeElement.querySelector('section') as HTMLElement;
    expect(section.getAttribute('aria-label')).toBe('Illustrative operational connections');
    expect(section.textContent).toContain('8');
    expect(section.textContent).toContain('3');
    expect(section.textContent).toContain('1');
    expect(section.textContent).toContain('not physical connections');
    expect(section.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    fixture.destroy();
  });

  it('shows unavailable counters as a dash rather than inventing activity', () => {
    const fixture = TestBed.createComponent(OperationalCircuitComponent);
    fixture.componentRef.setInput('snapshot', {
      activeShipments: null,
      delayedShipments: null,
      openIncidents: null,
      criticalPositions: null,
    });
    fixture.detectChanges();
    expect([...fixture.nativeElement.querySelectorAll('.node strong')].map((n) => n.textContent))
      .toEqual(['—', '—', '—']);
    fixture.destroy();
  });
});
