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
  template: `<div
      #map
      class="map"
      role="region"
      aria-label="Simulated logistics tracking map"
    ></div>
    <button
      type="button"
      class="fit-map"
      (click)="fitBounds()"
      aria-label="Fit all locations on map"
    >
      Fit route
    </button>
    <div class="legend" aria-label="Map legend">
      <span class="origin"></span>Origin <span class="destination"></span>Destination
      <span class="vehicle"></span>Vehicle
    </div>`,
  styles: [
    `
      .map {
        height: 100%;
        min-height: 280px;
        background: #e2e8f0;
      }
      :host {
        display: block;
        position: relative;
        height: 100%;
        isolation: isolate;
        border-radius: inherit;
        overflow: hidden;
      }
      .fit-map,
      .legend {
        position: absolute;
        z-index: 500;
        background: rgb(255 255 255 / 95%);
        border: 1px solid #d8e2e8;
        border-radius: 6px;
        box-shadow: 0 3px 12px #172b3a14;
        color: #344c5e;
        font-size: 12px;
        backdrop-filter: blur(8px);
      }
      .fit-map {
        top: 14px;
        right: 14px;
        padding: 10px 14px;
        cursor: pointer;
      }
      .fit-map:hover {
        background: #f0f7fa;
      }
      .legend {
        bottom: 30px;
        left: 14px;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .legend span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-left: 5px;
      }
      .origin {
        background: #2563eb;
      }
      .destination {
        background: #15803d;
      }
      .vehicle {
        background: #0891b2;
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
  private readonly markers = new Map<string, L.Marker>();
  private routeLayer?: L.Polyline;
  private boundsKey = '';
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapElement.nativeElement, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView([40.2, -3.2], 6);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
    this.layer.addTo(this.map);
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize({ pan: false }));
    this.resizeObserver.observe(this.mapElement.nativeElement);
    this.render();
  }
  ngOnChanges(): void {
    this.render();
  }
  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }
  fitBounds(): void {
    if (!this.map) return;
    const bounds: L.LatLngExpression[] = this.points.map((point) => [
      point.latitude,
      point.longitude,
    ]);
    bounds.push(...this.route);
    if (bounds.length > 1)
      this.map.fitBounds(L.latLngBounds(bounds), {
        padding: [50, 50],
        maxZoom: 12,
        animate: false,
      });
    else if (bounds.length === 1) this.map.setView(bounds[0], 8, { animate: false });
  }
  private render(): void {
    if (!this.map) return;
    const ids = new Set(this.points.map((point) => point.id));
    this.markers.forEach((marker, id) => {
      if (!ids.has(id)) {
        this.layer.removeLayer(marker);
        this.markers.delete(id);
      }
    });
    this.points.forEach((point) => {
      const color =
        point.kind === 'origin'
          ? '#1d4ed8'
          : point.kind === 'destination'
            ? '#16a34a'
            : point.health === 'DELAYED'
              ? '#dc2626'
              : '#0891b2';
      const vehicle = point.kind === 'vehicle';
      const icon = L.divIcon({
        className: '',
        html: `<span aria-hidden="true" style="display:grid;place-items:center;width:${vehicle ? 28 : 18}px;height:${vehicle ? 28 : 18}px;border:3px solid white;border-radius:${vehicle ? '8px' : '50%'};background:${color};box-shadow:0 2px 7px #33415560;color:white;font-size:14px">${vehicle ? '›' : ''}</span>`,
        iconSize: vehicle ? [28, 28] : [18, 18],
        iconAnchor: vehicle ? [14, 14] : [9, 9],
      });
      const tooltip = document.createElement('span');
      tooltip.textContent = point.label;
      const existing = this.markers.get(point.id);
      if (existing) {
        existing
          .setLatLng([point.latitude, point.longitude])
          .setIcon(icon)
          .setTooltipContent(tooltip);
      } else {
        const marker = L.marker([point.latitude, point.longitude], {
          icon,
          title: point.label,
          alt: point.label,
        })
          .bindTooltip(tooltip)
          .addTo(this.layer);
        this.markers.set(point.id, marker);
      }
    });
    if (this.route.length > 1) {
      if (this.routeLayer) this.routeLayer.setLatLngs(this.route);
      else
        this.routeLayer = L.polyline(this.route, {
          color: '#0891b2',
          weight: 3,
          dashArray: '7 7',
          opacity: 0.85,
        }).addTo(this.layer);
    } else if (this.routeLayer) {
      this.layer.removeLayer(this.routeLayer);
      this.routeLayer = undefined;
    }
    const key = [...ids].sort().join(',') + JSON.stringify(this.route);
    if (key !== this.boundsKey) {
      this.boundsKey = key;
      this.fitBounds();
    }
  }
}
