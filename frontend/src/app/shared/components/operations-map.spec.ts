import { ElementRef } from '@angular/core';
import { OperationsMapComponent } from './operations-map.component';

const mocks = vi.hoisted(() => {
  const map = { setView: vi.fn(), fitBounds: vi.fn(), invalidateSize: vi.fn(), remove: vi.fn() };
  const marker = {
    setLatLng: vi.fn(),
    setIcon: vi.fn(),
    setTooltipContent: vi.fn(),
    bindTooltip: vi.fn(),
    addTo: vi.fn(),
  };
  return { map, marker, markerFactory: vi.fn(), disconnect: vi.fn() };
});
vi.mock('leaflet', () => ({
  map: () => mocks.map,
  layerGroup: () => ({ addTo: vi.fn(), removeLayer: vi.fn() }),
  control: { zoom: () => ({ addTo: vi.fn() }) },
  tileLayer: () => ({ addTo: vi.fn() }),
  latLngBounds: (bounds: unknown) => bounds,
  divIcon: (options: unknown) => options,
  marker: mocks.markerFactory,
}));

describe('OperationsMapComponent realtime viewport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.map.setView.mockReturnValue(mocks.map);
    Object.values(mocks.marker).forEach((fn) => fn.mockReturnValue(mocks.marker));
    mocks.markerFactory.mockReturnValue(mocks.marker);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect = mocks.disconnect;
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('updates a vehicle in place without resetting the user viewport', () => {
    const component = new OperationsMapComponent();
    component.mapElement = new ElementRef(document.createElement('div'));
    component.points = [{ id: 'truck', latitude: 40, longitude: -3, label: 'Shipment 20%' }];
    component.ngAfterViewInit();
    mocks.map.setView.mockClear();
    component.points = [{ id: 'truck', latitude: 40.1, longitude: -3.1, label: 'Shipment 28%' }];
    component.ngOnChanges();
    expect(mocks.markerFactory).toHaveBeenCalledTimes(1);
    expect(mocks.marker.setLatLng).toHaveBeenCalledWith([40.1, -3.1]);
    expect(mocks.map.setView).not.toHaveBeenCalled();
    expect(mocks.map.fitBounds).not.toHaveBeenCalled();
    component.fitBounds();
    expect(mocks.map.setView).toHaveBeenCalledTimes(1);
    component.ngOnDestroy();
    expect(mocks.disconnect).toHaveBeenCalledOnce();
    expect(mocks.map.remove).toHaveBeenCalledOnce();
  });
});
