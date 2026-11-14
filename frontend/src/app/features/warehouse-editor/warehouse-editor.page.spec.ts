import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Warehouse } from '../../shared/models/models';
import { WAREHOUSE_EDITOR_SCENE_LOADER } from './warehouse-editor-scene-loader';
import { WarehouseEditorPage } from './warehouse-editor.page';
import { WarehouseVisualLayout, starterLayout } from './warehouse-layout.model';

const warehouse = {
  id: 'warehouse-one',
  code: 'VLC-01',
  name: 'Valencia Logistics Hub',
  active: true,
} as Warehouse;
let savedLayout: WarehouseVisualLayout;
let api: {
  warehouses: ReturnType<typeof vi.fn>;
  warehouseVisualLayout: ReturnType<typeof vi.fn>;
  saveWarehouseVisualLayout: ReturnType<typeof vi.fn>;
};

class FakeEditorScene {
  static last?: FakeEditorScene;
  init = vi.fn();
  update = vi.fn();
  select = vi.fn();
  overview = vi.fn();
  rotate = vi.fn();
  dispose = vi.fn();
  constructor() {
    FakeEditorScene.last = this;
  }
}

describe('Warehouse Editor page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    FakeEditorScene.last = undefined;
    savedLayout = {
      warehouseId: warehouse.id,
      revision: 0,
      saved: false,
      items: [],
    };
    api = {
      warehouses: vi.fn(() => of([warehouse])),
      warehouseVisualLayout: vi.fn(() => of(savedLayout)),
      saveWarehouseVisualLayout: vi.fn(
        (id: string, request: { revision: number; items: unknown[] }) =>
          of({
            warehouseId: id,
            revision: request.revision + 1,
            saved: true,
            items: request.items,
          }),
      ),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: api },
        { provide: WAREHOUSE_EDITOR_SCENE_LOADER, useValue: async () => FakeEditorScene },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  async function setup() {
    const fixture = TestBed.createComponent(WarehouseEditorPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('loads only a visual starter plan without claiming real stock locations', async () => {
    const fixture = await setup();
    const page = fixture.componentInstance;
    expect(page.items()).toEqual(starterLayout());
    expect(page.saved()).toBe(false);
    expect(page.canSave()).toBe(true);
    expect(FakeEditorScene.last?.init).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No stock or shelf positions implied');
    fixture.destroy();
    expect(FakeEditorScene.last?.dispose).toHaveBeenCalledOnce();
  });

  it('never saves an empty replacement after a failed layout read', async () => {
    api.warehouseVisualLayout.mockReturnValue(throwError(() => new Error('offline')));
    const fixture = await setup();
    const page = fixture.componentInstance;
    page.add('RACK');
    await page.save();
    expect(page.canSave()).toBe(false);
    expect(page.items()).toEqual([]);
    expect(api.saveWarehouseVisualLayout).not.toHaveBeenCalled();
    fixture.destroy();
  });
  it('edits object positions, saves with the correct revision, and clears dirty state', async () => {
    const fixture = await setup();
    const page = fixture.componentInstance;
    page.select('rack-1');
    page.move('rack-1', -8, -2);
    expect(page.dirty()).toBe(true);
    await page.save();
    expect(api.saveWarehouseVisualLayout).toHaveBeenCalledWith(
      warehouse.id,
      expect.objectContaining({ revision: 0 }),
    );
    expect(page.revision()).toBe(1);
    expect(page.dirty()).toBe(false);
    expect(page.saved()).toBe(true);
    fixture.destroy();
  });

  it('retains local edits when a concurrent revision causes conflict', async () => {
    const fixture = await setup();
    const page = fixture.componentInstance;
    page.move('rack-1', -8, -2);
    api.saveWarehouseVisualLayout.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409 })),
    );
    await page.save();
    expect(page.dirty()).toBe(true);
    expect(page.error()).toContain('newer revision');
    fixture.destroy();
  });

  it('prevents colliding movements and can restore last saved layout', async () => {
    const fixture = await setup();
    const page = fixture.componentInstance;
    page.move('rack-1', 0, -3);
    expect(page.dirty()).toBe(false);
    expect(page.error()).toContain('overlaps');
    page.move('rack-1', -8, -2);
    page.discard();
    expect(page.items()).toEqual(starterLayout());
    expect(page.dirty()).toBe(false);
    fixture.destroy();
  });

  it('supports editing without WebGL', async () => {
    TestBed.overrideProvider(WAREHOUSE_EDITOR_SCENE_LOADER, {
      useValue: async () => {
        throw new Error('WebGL');
      },
    });
    const fixture = await setup();
    expect(fixture.componentInstance.sceneError()).toContain('3D is unavailable');
    fixture.componentInstance.move('rack-1', -8, -2);
    await fixture.componentInstance.save();
    expect(fixture.componentInstance.saved()).toBe(true);
    fixture.destroy();
  });
});
