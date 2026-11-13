import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardStore } from '../dashboard/dashboard.store';
import {
  CONTROL_ROOM_STATIONS,
  ControlRoomStation,
  controlRoomSnapshot,
  metricLabel,
} from './control-room.model';
import { CONTROL_ROOM_SCENE_LOADER, ControlRoomScenePort } from './control-room-scene-loader';

@Component({
  selector: 'app-control-room-page',
  imports: [RouterLink],
  providers: [DashboardStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './control-room.page.html',
  styleUrl: './control-room.page.scss',
})
export class ControlRoomPage implements AfterViewInit, OnDestroy {
  readonly store = inject(DashboardStore);
  private readonly zone = inject(NgZone);
  private readonly loadScene = inject(CONTROL_ROOM_SCENE_LOADER);
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;

  readonly stations = CONTROL_ROOM_STATIONS;
  readonly metrics = computed(() => controlRoomSnapshot(this.store.dashboard()));
  readonly label = metricLabel;
  readonly selectedStation = signal<ControlRoomStation>('operations');
  readonly selectedConfig = computed(() =>
    this.stations.find((item) => item.id === this.selectedStation())!,
  );
  readonly sceneLoading = signal(false);
  readonly ready = signal(false);
  readonly sceneError = signal('');
  private scene?: ControlRoomScenePort;
  private generation = 0;
  private destroyed = false;

  private readonly syncMetrics = effect(() => {
    const snapshot = this.metrics();
    this.scene?.update(snapshot);
  });

  ngAfterViewInit(): void {
    void this.openScene();
  }

  async openScene(): Promise<void> {
    if (this.sceneLoading()) return;
    const generation = ++this.generation;
    this.scene?.dispose();
    this.scene = undefined;
    this.ready.set(false);
    this.sceneError.set('');
    this.sceneLoading.set(true);
    try {
      const Scene = await this.loadScene();
      if (this.destroyed || generation !== this.generation) return;
      this.zone.runOutsideAngular(() => {
        this.scene = new Scene(this.host.nativeElement, {
          select: (station) => this.zone.run(() => this.focus(station)),
          lost: () =>
            this.zone.run(() => {
              this.ready.set(false);
              this.sceneError.set(
                '3D context lost. Operational records remain available. Retry the illustration.',
              );
            }),
        });
        this.scene.init(this.metrics());
        this.scene.focus(this.selectedStation(), true);
      });
      this.ready.set(true);
    } catch {
      if (generation === this.generation) {
        const failedScene = this.scene as ControlRoomScenePort | undefined;
        failedScene?.dispose();
        this.scene = undefined;
        this.sceneError.set(
          'The 3D control room is unavailable. Use the live operational panels and links below.',
        );
      }
    } finally {
      if (generation === this.generation) this.sceneLoading.set(false);
    }
  }

  focus(station: ControlRoomStation, event?: MouseEvent): void {
    this.selectedStation.set(station);
    this.scene?.focus(station, event?.detail === 0);
  }

  overview(): void {
    this.scene?.overview();
  }

  rotate(): void {
    this.scene?.rotate();
  }

  refresh(): void {
    this.store.refresh();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    ++this.generation;
    this.scene?.dispose();
    this.scene = undefined;
  }
}
