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
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Warehouse } from '../../shared/models/models';
import {
  LAYOUT_KINDS,
  LAYOUT_LABELS,
  LayoutItem,
  LayoutKind,
  WarehouseVisualLayout,
  addItem,
  relocate,
  rotateItem,
  starterLayout,
  validLayout,
} from './warehouse-layout.model';
import {
  WAREHOUSE_EDITOR_SCENE_LOADER,
  WarehouseEditorScenePort,
} from './warehouse-editor-scene-loader';

@Component({
  selector: 'app-warehouse-editor-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
  templateUrl: './warehouse-editor.page.html',
  styleUrl: './warehouse-editor.page.scss',
})
export class WarehouseEditorPage implements AfterViewInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly zone = inject(NgZone);
  private readonly route = inject(ActivatedRoute);
  private readonly sceneLoader = inject(WAREHOUSE_EDITOR_SCENE_LOADER);
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;

  readonly warehouses = signal<Warehouse[]>([]);
  readonly warehouseId = signal('');
  readonly warehouse = computed(() => this.warehouses().find((w) => w.id === this.warehouseId()));
  readonly items = signal<LayoutItem[]>([]);
  readonly base = signal<LayoutItem[]>([]);
  readonly saved = signal(false);
  readonly revision = signal(0);
  readonly selectedId = signal<string | null>(null);
  readonly selectedItem = computed(
    () => this.items().find((x) => x.id === this.selectedId()) ?? null,
  );
  readonly layoutLoaded = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly sceneLoading = signal(false);
  readonly ready = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly sceneError = signal('');
  readonly kinds = LAYOUT_KINDS;
  readonly labels = LAYOUT_LABELS;
  readonly dirty = computed(() => JSON.stringify(this.items()) !== JSON.stringify(this.base()));
  readonly canSave = computed(
    () =>
      this.layoutLoaded() &&
      !!this.warehouseId() &&
      !this.loading() &&
      !this.saving() &&
      validLayout(this.items()) &&
      (!this.saved() || this.dirty()),
  );

  private scene?: WarehouseEditorScenePort;
  private destroyed = false;
  private requestId = 0;
  private sceneVersion = 0;
  private history: LayoutItem[][] = [];

  private readonly syncScene = effect(() => {
    const items = this.items();
    this.scene?.update(items);
  });
  private readonly syncSelection = effect(() => {
    const id = this.selectedId();
    this.scene?.select(id);
  });

  ngAfterViewInit(): void {
    void this.loadWarehouses();
    void this.openScene();
  }

  private async loadWarehouses(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const warehouses = await firstValueFrom(this.api.warehouses());
      if (this.destroyed) return;
      this.warehouses.set(warehouses);
      const requestId = this.route.snapshot.queryParamMap.get('warehouse');
      const choice =
        warehouses.find((w) => w.id === requestId) ??
        warehouses.find((w) => w.active) ??
        warehouses[0];
      if (choice) {
        this.warehouseId.set(choice.id);
        await this.loadLayout(choice.id);
      } else {
        this.items.set([]);
        this.base.set([]);
        this.loading.set(false);
      }
    } catch {
      if (!this.destroyed) {
        this.error.set('Warehouses could not be loaded. Check your connection and retry.');
        this.loading.set(false);
      }
    }
  }

  async loadLayout(id: string): Promise<void> {
    if (this.saving()) return;
    this.layoutLoaded.set(false);
    this.saved.set(false);
    this.revision.set(0);
    const sequence = ++this.requestId;
    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    this.history = [];
    this.selectedId.set(null);
    this.items.set([]);
    this.base.set([]);
    try {
      const layout: WarehouseVisualLayout = await firstValueFrom(
        this.api.warehouseVisualLayout(id),
      );
      if (this.destroyed || sequence !== this.requestId || id !== this.warehouseId()) return;
      const items = layout.saved ? layout.items : starterLayout();
      if (layout.warehouseId !== id || !validLayout(items))
        throw new Error('Invalid saved visual layout');
      this.layoutLoaded.set(true);
      this.saved.set(layout.saved);
      this.revision.set(layout.revision);
      this.items.set(items.map((item) => ({ ...item })));
      this.base.set(items.map((item) => ({ ...item })));
      if (!layout.saved) this.message.set('Unsaved illustrative starter plan. Save to keep it.');
    } catch {
      if (!this.destroyed && sequence === this.requestId) {
        this.error.set('Could not load the saved layout. Retry before editing this warehouse.');
      }
    } finally {
      if (!this.destroyed && sequence === this.requestId) this.loading.set(false);
    }
  }

  async chooseWarehouse(event: Event): Promise<void> {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) return;
    const id = select.value;
    if (!this.warehouses().some((warehouse) => warehouse.id === id)) return;
    if (id === this.warehouseId()) return;
    if (this.dirty() && !confirm('Discard the unsaved blueprint changes?')) {
      select.value = this.warehouseId();
      return;
    }
    this.warehouseId.set(id);
    await this.loadLayout(id);
  }

  private edit(next: LayoutItem[]): void {
    if (!this.layoutLoaded() || this.loading() || this.saving() || !validLayout(next)) return;
    this.history = [...this.history.slice(-29), this.items().map((item) => ({ ...item }))];
    this.items.set(next);
    this.message.set('Unsaved layout changes.');
    this.error.set('');
  }

  add(kind: LayoutKind): void {
    if (!this.layoutLoaded() || this.saving() || this.loading()) return;
    const before = this.items();
    const next = addItem(before, kind);
    if (!next) {
      this.error.set('No free space for that object. Remove or move other objects first.');
      return;
    }
    this.edit(next);
    this.selectedId.set(
      next.find((item) => !before.some((prev) => prev.id === item.id))?.id ?? null,
    );
  }

  chooseObject(event: Event): void {
    const element = event.target;
    if (element instanceof HTMLSelectElement) this.selectedId.set(element.value || null);
  }

  select(id: string): void {
    this.selectedId.set(id);
  }

  move(id: string, x: number, z: number): void {
    if (this.loading() || this.saving()) return;
    const next = relocate(this.items(), id, x, z);
    if (!next) {
      this.error.set(
        'That position is outside the grid, overlaps another object, or blocks a dock.',
      );
      return;
    }
    if (JSON.stringify(next) !== JSON.stringify(this.items())) this.edit(next);
  }

  step(dx: number, dz: number): void {
    const item = this.selectedItem();
    if (item) this.move(item.id, item.x + dx, item.z + dz);
  }

  turn(): void {
    const id = this.selectedId();
    if (!id) return;
    const next = rotateItem(this.items(), id);
    if (next) this.edit(next);
    else this.error.set('Cannot rotate here: another object would overlap.');
  }

  remove(): void {
    const id = this.selectedId();
    if (!id || this.loading() || this.saving()) return;
    this.edit(this.items().filter((item) => item.id !== id));
    this.selectedId.set(null);
  }

  undo(): void {
    if (this.loading() || this.saving()) return;
    const previous = this.history.pop();
    if (previous) this.items.set(previous);
    this.error.set('');
    this.message.set('Undo applied. Layout not saved.');
  }

  discard(): void {
    if (this.loading() || this.saving()) return;
    this.items.set(this.base().map((item) => ({ ...item })));
    this.selectedId.set(null);
    this.history = [];
    this.error.set('');
    this.message.set('Restored last saved or starter layout.');
  }

  async reload(): Promise<void> {
    const id = this.warehouseId();
    if (!id) return void this.loadWarehouses();
    if (this.dirty() && !confirm('Discard local changes and reload the saved layout?')) return;
    await this.loadLayout(id);
  }

  async save(): Promise<void> {
    if (!this.canSave()) return;
    const id = this.warehouseId();
    const sequence = this.requestId;
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const result = await firstValueFrom(
        this.api.saveWarehouseVisualLayout(id, {
          revision: this.revision(),
          items: this.items(),
        }),
      );
      if (this.destroyed || sequence !== this.requestId) return;
      this.revision.set(result.revision);
      this.saved.set(true);
      this.items.set(result.items.map((item) => ({ ...item })));
      this.base.set(result.items.map((item) => ({ ...item })));
      this.history = [];
      this.message.set('Visual layout saved for this warehouse. No inventory was moved.');
    } catch (error) {
      if (!this.destroyed && sequence === this.requestId)
        this.error.set(
          error instanceof HttpErrorResponse && error.status === 409
            ? 'Someone saved a newer revision. Your changes are still here; reload to resolve.'
            : 'The visual layout could not be saved. Nothing was changed in the ERP.',
        );
    } finally {
      if (!this.destroyed && sequence === this.requestId) this.saving.set(false);
    }
  }

  async openScene(): Promise<void> {
    if (this.sceneLoading()) return;
    const version = ++this.sceneVersion;
    this.scene?.dispose();
    this.scene = undefined;
    this.ready.set(false);
    this.sceneError.set('');
    this.sceneLoading.set(true);
    try {
      const Scene = await this.sceneLoader();
      if (this.destroyed || version !== this.sceneVersion) return;
      this.zone.runOutsideAngular(() => {
        this.scene = new Scene(this.host.nativeElement, {
          select: (id) => this.zone.run(() => this.select(id)),
          move: (id, x, z) => this.zone.run(() => this.move(id, x, z)),
          lost: () =>
            this.zone.run(() => {
              this.ready.set(false);
              this.sceneError.set(
                '3D context lost. Your blueprint is retained. Retry the visual editor.',
              );
            }),
        });
        this.scene.init(this.items());
        this.scene.select(this.selectedId());
      });
      this.ready.set(true);
    } catch {
      if (!this.destroyed && version === this.sceneVersion) {
        const failed = this.scene as WarehouseEditorScenePort | undefined;
        failed?.dispose();
        this.scene = undefined;
        this.sceneError.set(
          '3D is unavailable. Blueprint editing and saving still work via the controls.',
        );
      }
    } finally {
      if (!this.destroyed && version === this.sceneVersion) this.sceneLoading.set(false);
    }
  }

  overview(): void {
    this.scene?.overview();
  }
  zoom(delta: number) {
    this.scene?.zoom(delta);
  }
  focusSelected() {
    this.scene?.focusSelected();
  }
  rotateCamera(): void {
    this.scene?.rotate();
  }

  canLeave(): boolean {
    return !this.dirty() || confirm('Leave without saving this warehouse layout?');
  }

  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty()) event.preventDefault();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    ++this.requestId;
    ++this.sceneVersion;
    this.scene?.dispose();
    this.scene = undefined;
  }
}
