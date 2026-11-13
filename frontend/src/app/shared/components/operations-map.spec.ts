import { ElementRef } from '@angular/core';
import { OperationsMapComponent } from './operations-map.component';
import * as L from 'leaflet';

describe('OperationsMapComponent realtime viewport', () => {
  const disconnect = vi.fn();
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect = disconnect;
      },
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('updates a vehicle in place without resetting the user viewport', () => {
    const component = new OperationsMapComponent();
    component.mapElement = new ElementRef(document.createElement('div'));
    component.points = [{ id: 'truck', latitude: 40, longitude: -3, label: 'Shipment 20%' }];
    component.ngAfterViewInit();
    const setView = vi.spyOn(L.Map.prototype, 'setView');
    const setLatLng = vi.spyOn(L.Marker.prototype, 'setLatLng');
    component.points = [{ id: 'truck', latitude: 40.1, longitude: -3.1, label: 'Shipment 28%' }];
    component.ngOnChanges();
    expect(
      component.mapElement.nativeElement.querySelectorAll('.leaflet-marker-icon'),
    ).toHaveLength(1);
    expect(setLatLng).toHaveBeenCalledWith([40.1, -3.1]);
    expect(setView).not.toHaveBeenCalled();
    expect(component.view()?.latitude).toBeCloseTo(40);
    component.fitBounds();
    expect(setView).toHaveBeenCalledTimes(1);
    component.ngOnDestroy();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(component.mapElement.nativeElement.querySelector('.leaflet-pane')).toBeNull();
  });
});
