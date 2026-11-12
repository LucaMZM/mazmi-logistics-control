import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { FleetTwinStore } from './fleet-twin.store';
import { vehicleRepresentation } from './vehicle-twin';
import type { FleetScene } from './fleet-scene';

@Component({
  selector: 'app-digital-twin-page',
  imports: [RouterLink, MatButtonModule],
  providers: [FleetTwinStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <div>
        <p class="eyebrow">MAZMI DIGITAL TWIN / 01</p>
        <h1>Fleet Twin</h1>
        <p>A real fleet record. An original, illustrative world.</p>
      </div>
      <a mat-stroked-button routerLink="/fleet">Open Fleet</a>
    </header>
    <div class="world-layout">
      <section class="world" aria-label="Interactive fleet yard">
        <div class="scene" #host></div>
        <div class="world-label">
          <strong>Distribution yard</strong
          ><span>Illustrative layout · Not a live vehicle location</span>
        </div>
        @if (sceneLoading()) {
          <p class="notice" role="status">Preparing the 3D yard…</p>
        }
        @if (sceneError()) {
          <div class="notice" role="alert">
            <p>{{ sceneError() }}</p>
            <button mat-stroked-button (click)="openScene()">Retry 3D</button>
          </div>
        }
        @if (!ready() && !sceneLoading() && !sceneError()) {
          <p class="notice">
            Select a van and open its 3D representation. All records remain available in the fleet
            panel.
          </p>
        }
        <div class="controls" aria-label="Scene controls">
          <button mat-stroked-button [disabled]="!ready()" (click)="focus($event)">
            Inspect vehicle
          </button>
          <button mat-stroked-button [disabled]="!ready()" (click)="scene?.rotate()">Rotate</button>
          <button mat-stroked-button [disabled]="!ready()" (click)="scene?.reset()">
            Overview
          </button>
          <button mat-flat-button [disabled]="!ready() || reduced()" (click)="toggleMotion()">
            {{ moving() ? 'Pause manoeuvre' : 'Play manoeuvre' }}
          </button>
        </div>
      </section>
      <aside aria-label="Fleet records">
        <h2>Fleet register</h2>
        @if (store.loading()) {
          <p role="status">Loading fleet…</p>
        }
        @if (store.error()) {
          <p role="alert">{{ store.error() }}</p>
        }
        <button mat-button [disabled]="store.loading()" (click)="store.load()">
          Refresh records
        </button>
        <label for="twin-vehicle">Vehicle</label>
        <select id="twin-vehicle" [value]="store.selectedId()" (change)="choose($event)">
          @for (vehicle of store.vehicles(); track vehicle.id) {
            <option [value]="vehicle.id">
              {{ vehicle.registrationPlate }} · {{ vehicle.model }}
            </option>
          }
        </select>
        @if (store.selected(); as v) {
          <h3>{{ v.registrationPlate }}</h3>
          <p>{{ v.model }}</p>
          <dl>
            <dt>Operational status</dt>
            <dd>{{ v.status }}</dd>
            <dt>Capacity</dt>
            <dd>{{ v.capacityKg }} kg</dd>
            <dt>Vehicle type</dt>
            <dd>{{ v.vehicleType }}</dd>
            <dt>Record active</dt>
            <dd>{{ v.active ? 'Yes' : 'No' }}</dd>
          </dl>
          <p class="disclosure">
            {{ representation()?.fidelity }}. No manufacturer or exact variant is claimed. Neutral
            body colour: not recorded by the ERP.
          </p>
          @if (representation()?.asset) {
            <button mat-flat-button [disabled]="sceneLoading()" (click)="openScene()">
              Open vehicle in 3D
            </button>
          } @else {
            <p>
              No 3D asset for this vehicle type. Its real record remains available here and in
              Fleet.
            </p>
          }
        } @else if (!store.loading() && !store.error()) {
          <p>No vehicles registered.</p>
        }
      </aside>
    </div>
    <footer>
      <strong>Visual demonstration only</strong>
      <p>
        The manoeuvre does not dispatch a shipment or change vehicle availability. Drag to orbit;
        scroll or pinch to zoom. Keyboard users can use Inspect, Rotate and Overview.
      </p>
      @if (reduced()) {
        <p>Reduced motion enabled: vehicle animation is disabled.</p>
      }
    </footer>
  `,
  styles: [
    `
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 24px;
      }
      h1 {
        font-size: 32px;
        letter-spacing: -1px;
        margin: 4px 0;
      }
      p {
        color: var(--muted);
        font-size: 14px;
      }
      .eyebrow {
        font-size: 11px;
        letter-spacing: 0.12em;
      }
      .world-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 290px;
        gap: 18px;
      }
      .world {
        position: relative;
        min-width: 0;
        border: 1px solid var(--line);
        border-radius: 12px;
        overflow: hidden;
        background: #e8ecee;
      }
      .scene {
        height: 620px;
        width: 100%;
        touch-action: none;
      }
      .world-label {
        position: absolute;
        top: 18px;
        left: 20px;
        pointer-events: none;
      }
      .world-label strong,
      .world-label span {
        display: block;
      }
      .world-label span {
        font-size: 12px;
        color: #52606c;
        margin-top: 4px;
      }
      .controls {
        position: absolute;
        bottom: 16px;
        left: 16px;
        right: 16px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 10px;
        background: var(--glass);
        backdrop-filter: blur(12px);
        border: 1px solid white;
        border-radius: 9px;
      }
      .notice {
        position: absolute;
        top: 35%;
        left: 10%;
        right: 10%;
        padding: 20px;
        background: #fafbfd;
        border: 1px solid var(--line);
        border-radius: 8px;
      }
      aside {
        padding: 22px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 10px;
        min-width: 0;
      }
      h2 {
        font-size: 17px;
        margin: 0 0 8px;
      }
      h3 {
        font-size: 23px;
        margin: 25px 0 0;
        overflow-wrap: anywhere;
      }
      label {
        display: block;
        font-size: 13px;
        margin: 16px 0 8px;
      }
      select {
        width: 100%;
        padding: 11px;
        border: 1px solid var(--line);
        border-radius: 6px;
        background: white;
        color: var(--ink);
      }
      dl {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        font-size: 13px;
        margin: 24px 0;
      }
      dt {
        color: var(--muted);
      }
      dd {
        margin: 0;
        text-align: right;
        overflow-wrap: anywhere;
      }
      .disclosure {
        padding-top: 16px;
        border-top: 1px solid var(--line);
        font-size: 12px;
        line-height: 1.7;
      }
      footer {
        max-width: 850px;
        margin-top: 20px;
        font-size: 13px;
      }
      footer p {
        font-size: 12px;
      }
      @media (max-width: 1100px) {
        .world-layout {
          grid-template-columns: 1fr;
        }
        .scene {
          height: 540px;
        }
        aside {
          max-width: none;
        }
      }
      @media (max-width: 600px) {
        header {
          align-items: flex-start;
        }
        .scene {
          height: 460px;
        }
        .world-label {
          left: 12px;
          right: 12px;
        }
        .world-label span {
          max-width: 220px;
        }
        .controls {
          left: 8px;
          right: 8px;
          bottom: 8px;
          gap: 4px;
        }
        .controls button {
          font-size: 12px;
        }
      }
      @media (prefers-reduced-transparency: reduce) {
        .controls {
          backdrop-filter: none;
          background: #fafbfd;
        }
      }
    `,
  ],
})
export class DigitalTwinPage implements AfterViewInit, OnDestroy {
  readonly store = inject(FleetTwinStore);
  private readonly zone = inject(NgZone);
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
  readonly representation = computed(() => {
    const v = this.store.selected();
    return v ? vehicleRepresentation(v) : undefined;
  });
  readonly sceneLoading = signal(false);
  readonly sceneError = signal('');
  readonly ready = signal(false);
  readonly moving = signal(false);
  private readonly motion = matchMedia('(prefers-reduced-motion: reduce)');
  readonly reduced = signal(this.motion.matches);
  scene?: FleetScene;
  private generation = 0;
  private destroyed = false;
  private readonly motionChanged = () => this.reduced.set(this.motion.matches);
  ngAfterViewInit() {
    this.store.load();
    this.motion.addEventListener('change', this.motionChanged);
  }
  choose(event: Event) {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.generation++;
      this.scene?.dispose();
      this.scene = undefined;
      this.ready.set(false);
      this.moving.set(false);
      this.sceneLoading.set(false);
      this.sceneError.set('');
      this.store.select(target.value);
    }
  }
  async openScene() {
    const v = this.representation();
    if (!v?.asset) return;
    const generation = ++this.generation;
    this.scene?.dispose();
    this.ready.set(false);
    this.moving.set(false);
    this.sceneLoading.set(true);
    this.sceneError.set('');
    try {
      const { FleetScene } = await import('./fleet-scene');
      if (this.destroyed || generation !== this.generation) return;
      this.zone.runOutsideAngular(() => {
        this.scene = new FleetScene(
          this.host.nativeElement,
          () => this.zone.run(() => this.store.select(v.id)),
          () =>
            this.zone.run(() => {
              this.ready.set(false);
              this.sceneError.set(
                '3D context lost. Fleet data is still available. Retry to rebuild the scene.',
              );
            }),
          () => this.zone.run(() => this.moving.set(false)),
        );
        this.scene.init(v.plate, v.color);
      });
      this.ready.set(true);
    } catch {
      if (generation === this.generation)
        this.sceneError.set(
          '3D is unavailable on this device. Use the fleet panel, or retry with WebGL enabled.',
        );
    } finally {
      if (generation === this.generation) this.sceneLoading.set(false);
    }
  }
  focus(event: MouseEvent) {
    this.scene?.focus(event.detail === 0);
  }
  toggleMotion() {
    if (this.moving()) this.scene?.pause();
    else this.moving.set(this.scene?.play() ?? false);
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.generation++;
    this.scene?.dispose();
    this.motion.removeEventListener('change', this.motionChanged);
  }
}
