import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OperationsMapComponent } from '../components/operations-map.component';
import { WORLD_MAP_LOADER, WORLD_MAP_STYLE, WorldMapPort } from './world-map-loader';
import { MapView, WorldPoint, representation, validPosition } from './world-map.model';

@Component({
  selector: 'app-operations-world-map',
  imports: [OperationsMapComponent, RouterLink, DatePipe, DecimalPipe],
  template: `
    <div class="world-toolbar">
      <strong>MAZMI World Map</strong>
      <div role="group" aria-label="Map presentation">
        <button type="button" (click)="mode2d()" [attr.aria-pressed]="mode() === '2d'">2D</button>
        <button type="button" (click)="mode3d()" [attr.aria-pressed]="mode() === '3d'">3D</button>
      </div>
      @if (mode() === '3d' && !error()) {
        <button type="button" (click)="overview()" [disabled]="loading()">Overview</button>
      }
    </div>
    <div class="world-body">
      @if (mode() === '2d') {
        <app-operations-map [points]="validPoints()" [route]="route" [initialView]="view" />
      }
      <div
        #canvasHost
        class="world-canvas"
        [hidden]="mode() !== '3d'"
        role="region"
        aria-label="3D simulated logistics map"
      ></div>
      @if (mode() === '3d') {
        @if (loading()) {
          <p class="world-message" role="status">Loading geographic map…</p>
        }
        @if (error()) {
          <div class="world-message" role="alert">
            <p>3D map unavailable. Check your connection or use the 2D map.</p>
            <button type="button" (click)="mode3d()">Retry 3D map</button>
            <button type="button" (click)="mode2d()">Use 2D map</button>
          </div>
        }
      }
      @if (vehicles().length) {
        <details class="world-panel" [open]="!!selected()">
          <summary>{{ selected()?.shipment?.trackingNumber ?? 'Select a shipment' }}</summary>
          <label
            >Shipment
            <select
              aria-label="Map shipment"
              [value]="selectedId() ?? ''"
              (change)="selectChange($event)"
            >
              <option value="">Operations overview</option>
              @for (point of vehicles(); track point.id) {
                <option [value]="point.id">
                  {{ point.shipment?.trackingNumber ?? point.label }}
                </option>
              }
            </select>
          </label>
          @if (selected(); as point) {
            @if (point.shipment; as s) {
              <p class="world-state">{{ s.status ?? 'Status unavailable' }} · {{ point.health }}</p>
              <progress max="100" [value]="s.progress" aria-label="Shipment progress"></progress>
              <p>
                {{ s.progress }}% ·
                {{ s.simulationActive ? 'Simulation running' : 'Simulation stopped' }}
              </p>
              <dl>
                <dt>Vehicle</dt>
                <dd>
                  {{ s.vehicleId ? (s.registrationPlate ?? 'Plate unavailable') : 'Not assigned' }}
                </dd>
                <dt>Driver</dt>
                <dd>{{ s.driver ?? 'Not assigned' }}</dd>
                <dt>ETA</dt>
                <dd>{{ s.eta ? (s.eta | date: 'dd MMM, HH:mm') : 'Unavailable' }}</dd>
                <dt>Position</dt>
                <dd>
                  {{ point.latitude | number: '1.4-4' }}, {{ point.longitude | number: '1.4-4' }}
                </dd>
                @if (coordinatesAvailable(s.originLatitude, s.originLongitude)) {
                  <dt>Origin</dt>
                  <dd>
                    {{ s.originLatitude | number: '1.3-3' }},
                    {{ s.originLongitude | number: '1.3-3' }}
                  </dd>
                }
                @if (coordinatesAvailable(s.destinationLatitude, s.destinationLongitude)) {
                  <dt>Destination</dt>
                  <dd>
                    {{ s.destinationLatitude | number: '1.3-3' }},
                    {{ s.destinationLongitude | number: '1.3-3' }}
                  </dd>
                }
              </dl>
              <p class="world-note">{{ representation(point) }}</p>
              <a [routerLink]="['/shipments', point.id]">Open shipment</a>
            }
            @if (mode() === '3d' && !error()) {
              <div class="world-actions">
                <button type="button" (click)="focus()">Focus vehicle</button>
                <button type="button" [attr.aria-pressed]="following()" (click)="toggleFollow()">
                  {{ following() ? 'Stop following' : 'Follow vehicle' }}
                </button>
              </div>
            }
          }
        </details>
      }
    </div>
    <p class="world-caption">
      Simulated tracking · dashed line: illustrative trajectory, not a road route.
    </p>
  `,
  styleUrl: './operations-world-map.component.scss',
})
export class OperationsWorldMapComponent implements OnChanges, OnDestroy {
  @Input() points: WorldPoint[] = [];
  @Input() route: [number, number][] = [];
  @ViewChild('canvasHost', { static: true }) host!: ElementRef<HTMLElement>;
  @ViewChild(OperationsMapComponent) leaflet?: OperationsMapComponent;
  private readonly loader = inject(WORLD_MAP_LOADER);
  private readonly style = inject(WORLD_MAP_STYLE);
  private engine?: WorldMapPort;
  private revision = 0;
  private disposed = false;
  private routeKey = '';
  private readonly snapshot = signal<WorldPoint[]>([]);
  readonly mode = signal<'2d' | '3d'>('2d');
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly following = signal(false);
  readonly selectedId = signal<string | null>(null);
  readonly validPoints = computed(() => this.snapshot().filter(validPosition));
  readonly vehicles = computed(() => this.validPoints().filter((p) => p.kind === 'vehicle'));
  readonly selected = computed(() => this.vehicles().find((p) => p.id === this.selectedId()));
  readonly representation = representation;
  coordinatesAvailable(latitude: number | undefined, longitude: number | undefined) {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      validPosition({ latitude, longitude })
    );
  }
  view?: MapView;
  ngOnChanges() {
    const routeKey = JSON.stringify(this.route);
    const changedRoute = this.routeKey !== '' && this.routeKey !== routeKey;
    this.routeKey = routeKey;
    this.snapshot.set(this.points);
    if (this.selectedId() && !this.selected()) {
      this.selectedId.set(null);
      this.following.set(false);
      this.engine?.follow(null);
    }
    this.engine?.update(this.displayPoints(), this.displayRoute());
    if (changedRoute) this.overview();
  }
  private displayPoints() {
    const s = this.selected()?.shipment;
    const points = [...this.validPoints()];
    if (
      s &&
      !points.some((p) => p.kind === 'origin') &&
      typeof s.originLatitude === 'number' &&
      typeof s.originLongitude === 'number' &&
      typeof s.destinationLatitude === 'number' &&
      typeof s.destinationLongitude === 'number'
    ) {
      points.push(
        {
          id: 'origin',
          latitude: s.originLatitude,
          longitude: s.originLongitude,
          label: 'Warehouse origin',
          kind: 'origin',
        },
        {
          id: 'destination',
          latitude: s.destinationLatitude,
          longitude: s.destinationLongitude,
          label: 'Delivery destination',
          kind: 'destination',
        },
      );
    }
    return points;
  }
  private displayRoute(): [number, number][] {
    if (this.route.length) return this.route;
    return this.displayPoints()
      .filter((p) => p.kind === 'origin' || p.kind === 'destination')
      .map((p) => [p.latitude, p.longitude]);
  }
  async mode3d() {
    if (this.loading()) return;
    if (this.mode() === '3d' && !this.error() && this.engine) return;
    if (this.mode() === '2d') this.view = this.leaflet?.view();
    const revision = ++this.revision;
    this.engine?.dispose();
    this.engine = undefined;
    this.mode.set('3d');
    this.loading.set(true);
    this.error.set(false);
    this.following.set(false);
    try {
      const create = await this.loader();
      if (this.disposed || revision !== this.revision) return;
      this.engine = create(this.host.nativeElement, {
        view: this.view,
        style: this.style,
        select: (id) => this.choose(id, false),
        unfollow: () => this.following.set(false),
        ready: () => {
          if (revision === this.revision) this.loading.set(false);
        },
        error: () => {
          if (revision === this.revision) {
            this.error.set(true);
            this.loading.set(false);
            this.following.set(false);
            this.engine?.follow(null);
          }
        },
      });
      this.engine.update(this.displayPoints(), this.displayRoute());
    } catch {
      if (revision === this.revision) {
        this.error.set(true);
        this.loading.set(false);
      }
    }
  }
  mode2d() {
    if (this.mode() === '2d') return;
    ++this.revision;
    this.view = this.engine?.view() ?? this.view;
    this.engine?.dispose();
    this.engine = undefined;
    this.mode.set('2d');
    this.loading.set(false);
    this.error.set(false);
    this.following.set(false);
  }
  choose(id: string, instant = true) {
    this.selectedId.set(this.vehicles().some((p) => p.id === id) ? id : null);
    this.following.set(false);
    this.engine?.follow(null);
    this.engine?.update(this.displayPoints(), this.displayRoute());
    this.engine?.select(this.selectedId(), instant);
  }
  selectChange(event: Event) {
    if (event.target instanceof HTMLSelectElement) this.choose(event.target.value);
  }
  focus() {
    if (this.selectedId()) this.engine?.select(this.selectedId());
  }
  toggleFollow() {
    this.following.set(!this.following());
    this.engine?.follow(this.following() ? this.selectedId() : null);
  }
  overview() {
    this.following.set(false);
    this.selectedId.set(null);
    this.engine?.select(null);
    this.engine?.update(this.displayPoints(), this.displayRoute());
    this.engine?.overview();
  }
  ngOnDestroy() {
    this.disposed = true;
    ++this.revision;
    this.engine?.dispose();
  }
}
