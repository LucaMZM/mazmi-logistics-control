import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import * as L from 'leaflet';

export interface OperationMapPoint {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  kind?: 'origin' | 'destination' | 'vehicle';
  health?: string;
}

@Component({
  selector: 'app-operations-map',
  template: '<div #map class="map" role="img" aria-label="Simulated logistics tracking map"></div>',
  styles: [
    `
      .map {
        height: 100%;
        min-height: 360px;
        background: #e2e8f0;
      }
      .marker {
        border-radius: 50%;
      }
    `,
  ],
})
export class OperationsMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('map', { static: true }) mapElement!: ElementRef<HTMLDivElement>;
  @Input() points: OperationMapPoint[] = [];
  @Input() route: Array<[number, number]> = [];
  private map?: L.Map;
  private layer = L.layerGroup();

  ngAfterViewInit(): void {
    this.map = L.map(this.mapElement.nativeElement, {
      zoomControl: true,
      attributionControl: true,
    }).setView([40.2, -3.2], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
    this.layer.addTo(this.map);
    this.render();
  }
  ngOnChanges(): void {
    this.render();
  }
  ngOnDestroy(): void {
    this.map?.remove();
  }
  private render(): void {
    if (!this.map) return;
    this.layer.clearLayers();
    const bounds: L.LatLngExpression[] = [];
    this.points.forEach((point) => {
      const color =
        point.kind === 'origin'
          ? '#1d4ed8'
          : point.kind === 'destination'
            ? '#16a34a'
            : point.health === 'DELAYED'
              ? '#dc2626'
              : '#0891b2';
      const icon = L.divIcon({
        className: '',
        html: `<span aria-hidden="true" style="display:block;width:14px;height:14px;border:3px solid white;border-radius:50%;background:${color};box-shadow:0 1px 5px #33415580"></span>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      const tooltip = document.createElement('span');
      tooltip.textContent = point.label;
      L.marker([point.latitude, point.longitude], { icon }).bindTooltip(tooltip).addTo(this.layer);
      bounds.push([point.latitude, point.longitude]);
    });
    if (this.route.length > 1) {
      L.polyline(this.route, {
        color: '#0891b2',
        weight: 3,
        dashArray: '7 7',
        opacity: 0.85,
      }).addTo(this.layer);
      this.route.forEach((point) => bounds.push(point));
    }
    if (bounds.length > 1)
      this.map.fitBounds(L.latLngBounds(bounds), { padding: [36, 36], maxZoom: 10 });
    else if (bounds.length === 1) this.map.setView(bounds[0], 8);
    setTimeout(() => this.map?.invalidateSize(), 0);
  }
}
