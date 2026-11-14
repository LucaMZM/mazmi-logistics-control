import * as T from 'three';
import { buildLayoutObject, positionLayoutObject } from '../warehouse-spatial/layout-objects';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TwinAssets } from '../digital-twin/twin-assets';
import { LayoutItem } from './warehouse-layout.model';
import { WarehouseEditorEvents, WarehouseEditorScenePort } from './warehouse-editor-scene-loader';

/** Editor-only blueprint: display geometry is never an inventory or pallet record. */
export class WarehouseEditorScene implements WarehouseEditorScenePort {
  private readonly world = new T.Scene();
  private readonly camera = new T.OrthographicCamera(-18, 18, 15, -15, 0.1, 150);
  private readonly assets = new TwinAssets();
  private readonly layoutRoot = new T.Group();

  private readonly center = new T.Vector3(0, 1.1, 0);
  private renderer?: T.WebGLRenderer;
  private controls?: OrbitControls;
  private observer?: ResizeObserver;
  private outline?: T.Box3Helper;
  private grid?: T.GridHelper;
  private frame = 0;
  private disposed = false;

  private selected: string | null = null;
  private start = new T.Vector2();

  constructor(
    private readonly host: HTMLElement,
    private readonly events: WarehouseEditorEvents,
  ) {}

  init(items: LayoutItem[]): void {
    try {
      this.world.background = new T.Color('#e9edf0');
      this.world.add(new T.HemisphereLight('#ffffff', '#81949f', 2.45));
      const sun = new T.DirectionalLight('#fff6e6', 2.65);
      sun.position.set(11, 22, 18);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, {
        left: -20,
        right: 20,
        top: 20,
        bottom: -20,
        far: 90,
      });
      this.world.add(sun);
      this.assets.box(this.world, [29, 0.52, 23], [0, -0.31, 0], '#b9c4cb', 0.25);
      this.assets.box(this.world, [27, 0.08, 21], [0, 0, 0], '#f0f1ef');
      this.assets.box(this.world, [26.8, 5.7, 0.2], [0, 2.85, -9.5], '#d7dedf');
      this.assets.box(this.world, [0.2, 5.6, 20.5], [-13.4, 2.8, 0], '#e2e6e5');
      this.assets.box(this.world, [26, 0.21, 0.3], [0, 5.8, -9.5], '#758792');
      this.assets.label(this.world, 'MAZMI / LAYOUT', 6, 0.85, [0, 4.9, -9.33]);
      for (const x of [-11, 11]) {
        this.assets.box(this.world, [0.13, 5.8, 0.13], [x, 2.9, -9.4], '#81919a');
      }
      this.grid = new T.GridHelper(24, 24, '#bcc7ca', '#d8dfe0');
      this.grid.position.y = 0.065;
      this.world.add(this.grid, this.layoutRoot);
      this.renderer = new T.WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = T.PCFSoftShadowMap;
      const canvas = this.renderer.domElement;
      canvas.tabIndex = 0;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute(
        'aria-label',
        'Interactive illustrative warehouse blueprint. Select an object, then click the floor to move it. Use controls for keyboard access.',
      );
      this.host.appendChild(canvas);
      this.camera.position.set(24, 23, 28);
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.target.copy(this.center);
      this.controls.minZoom = 0.65;
      this.controls.maxZoom = 2.8;
      this.controls.maxPolarAngle = Math.PI / 2.12;
      this.controls.enableDamping = false;
      this.controls.addEventListener('change', this.invalidate);
      canvas.addEventListener('pointerdown', this.onDown);
      canvas.addEventListener('pointerup', this.onUp);
      canvas.addEventListener('webglcontextlost', this.lost);
      document.addEventListener('visibilitychange', this.visibility);
      this.observer = new ResizeObserver(this.resize);
      this.observer.observe(this.host);
      this.update(items);
      this.resize();
      this.controls.update();
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  update(items: LayoutItem[]): void {
    const previous = new Map(
      this.layoutRoot.children.map((group) => [group.userData['layoutId'], group]),
    );
    for (const item of items) {
      const group = previous.get(item.id);
      if (group instanceof T.Group && group.userData['kind'] === item.kind) {
        positionLayoutObject(group, item);
        previous.delete(item.id);
      } else this.layoutRoot.add(buildLayoutObject(this.assets, item));
    }
    for (const obsolete of previous.values()) this.layoutRoot.remove(obsolete);
    this.select(this.selected);
    this.invalidate();
  }

  select(id: string | null): void {
    this.selected = id;
    this.clearOutline();
    if (id) {
      const group = this.layoutRoot.children.find((child) => child.userData['layoutId'] === id);
      if (group) {
        const box = new T.Box3().setFromObject(group);
        this.outline = new T.Box3Helper(box, '#284f60');
        this.world.add(this.outline);
      }
    }
    this.invalidate();
  }

  private clearOutline(): void {
    if (!this.outline) return;
    this.world.remove(this.outline);
    this.outline.geometry.dispose();
    (this.outline.material as T.Material).dispose();
    this.outline = undefined;
  }

  private readonly onDown = (event: PointerEvent) => {
    this.start.set(event.clientX, event.clientY);
  };
  private readonly onUp = (event: PointerEvent) => {
    if (!this.renderer || this.start.distanceTo(new T.Vector2(event.clientX, event.clientY)) > 5)
      return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ray = new T.Raycaster();
    ray.setFromCamera(
      new T.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    const hits = ray.intersectObjects(this.layoutRoot.children, true);
    let parent: T.Object3D | null = hits[0]?.object ?? null;
    while (parent) {
      const id = parent.userData['layoutId'] as string | undefined;
      if (id) {
        this.events.select(id);
        return;
      }
      parent = parent.parent;
    }
    if (this.selected) {
      const intersection = new T.Vector3();
      if (ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0.07), intersection))
        this.events.move(this.selected, Math.round(intersection.x), Math.round(intersection.z));
    }
  };
  private readonly lost = (event: Event) => {
    event.preventDefault();
    this.dispose();
    this.events.lost();
  };
  private readonly visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    } else this.invalidate();
  };
  private readonly resize = () => {
    if (!this.renderer || !this.host.clientWidth || !this.host.clientHeight) return;
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    const half = Math.max(15, (17 * height) / width);
    this.camera.left = (-half * width) / height;
    this.camera.right = (half * width) / height;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.invalidate();
  };
  private readonly invalidate = () => {
    if (!this.frame && !this.disposed && !document.hidden)
      this.frame = requestAnimationFrame(this.render);
  };
  private readonly render = () => {
    this.frame = 0;
    if (!this.disposed) this.renderer?.render(this.world, this.camera);
  };

  zoom(delta: number) {
    this.camera.zoom = T.MathUtils.clamp(this.camera.zoom + delta * 0.2, 0.65, 2.8);
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }
  focusSelected() {
    if (!this.controls || !this.outline) return;
    const target = this.outline.box.getCenter(new T.Vector3());
    this.camera.position.add(target.clone().sub(this.controls.target));
    this.controls.target.copy(target);
    this.camera.zoom = 1.65;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.invalidate();
  }

  overview(): void {
    if (!this.controls) return;
    this.camera.position.set(24, 23, 28);
    this.controls.target.copy(this.center);
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.invalidate();
  }

  rotate(): void {
    if (!this.controls) return;
    const offset = this.camera.position
      .clone()
      .sub(this.controls.target)
      .applyAxisAngle(new T.Vector3(0, 1, 0), Math.PI / 6);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.invalidate();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.visibility);
    this.clearOutline();
    const canvas = this.renderer?.domElement;
    canvas?.removeEventListener('pointerdown', this.onDown);
    canvas?.removeEventListener('pointerup', this.onUp);
    canvas?.removeEventListener('webglcontextlost', this.lost);
    this.controls?.removeEventListener('change', this.invalidate);
    this.controls?.dispose();
    if (this.grid) {
      this.grid.geometry.dispose();
      const materials = Array.isArray(this.grid.material)
        ? this.grid.material
        : [this.grid.material];
      materials.forEach((material) => material.dispose());
    }
    this.world.traverse((object) => {
      if (object instanceof T.DirectionalLight) object.shadow.dispose();
    });
    this.assets.dispose();
    this.world.clear();
    this.renderer?.dispose();
    canvas?.remove();
  }
}
