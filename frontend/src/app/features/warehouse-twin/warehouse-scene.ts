import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WarehouseAssets } from './warehouse-assets';
import { WarehouseSequence, WarehouseZone } from './warehouse-model';
import { WarehouseSceneEvents, WarehouseScenePort } from './warehouse-scene-loader';

export class WarehouseScene implements WarehouseScenePort {
  private readonly world = new T.Scene();
  private readonly camera = new T.OrthographicCamera(-22, 22, 18, -18, 0.1, 200);
  private readonly assets = new WarehouseAssets();
  private readonly sequence = new WarehouseSequence();
  private renderer?: T.WebGLRenderer;
  private controls?: OrbitControls;
  private observer?: ResizeObserver;
  private selection?: T.Box3Helper;
  private frame = 0;
  private previous = 0;
  private disposed = false;
  private lastPublished = -1;
  private transition?: { from: T.Vector3; to: T.Vector3; camera: T.Vector3; started: number };
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly pointer = new T.Vector2();
  private readonly transfer = new T.CatmullRomCurve3(
    [
      new T.Vector3(-5.5, 0.12, 0.8),
      new T.Vector3(-5.5, 0.12, 3),
      new T.Vector3(0, 0.12, 3),
      new T.Vector3(5, 0.12, 3),
      new T.Vector3(5, 0.12, 5.4),
    ],
    false,
    'centripetal',
  );
  constructor(
    private readonly host: HTMLElement,
    private readonly events: WarehouseSceneEvents,
  ) {}
  init() {
    try {
      this.renderer = new T.WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(
        Math.min(devicePixelRatio || 1, this.host.clientWidth < 600 ? 1.25 : 1.5),
      );
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = T.PCFSoftShadowMap;
      this.world.background = new T.Color('#e8ecee');
      this.world.add(new T.HemisphereLight('#ffffff', '#86959e', 2.5));
      const sun = new T.DirectionalLight('#fff4e2', 3.2);
      sun.position.set(15, 28, 18);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, far: 100 });
      sun.shadow.normalBias = 0.05;
      this.world.add(sun, this.assets.root);
      this.camera.position.set(30, 27, 36);
      const canvas = this.renderer.domElement;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute(
        'aria-label',
        'Illustrative warehouse. Use zone and camera controls to explore without a pointer.',
      );
      this.host.appendChild(canvas);
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.target.set(0, 1, 2);
      this.controls.minZoom = 0.6;
      this.controls.maxZoom = 2.5;
      this.controls.maxPolarAngle = Math.PI / 2.3;
      this.controls.addEventListener('change', this.invalidate);
      this.controls.addEventListener('start', this.cancelFocus);
      canvas.addEventListener('pointerdown', this.down);
      canvas.addEventListener('pointerup', this.up);
      canvas.addEventListener('webglcontextlost', this.lost);
      document.addEventListener('visibilitychange', this.visibility);
      this.reduced.addEventListener('change', this.motionChanged);
      this.observer = new ResizeObserver(this.resize);
      this.observer.observe(this.host);
      this.pose(0);
      this.resize();
      this.controls.update();
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  private readonly down = (e: PointerEvent) => this.pointer.set(e.clientX, e.clientY);
  private readonly up = (e: PointerEvent) => {
    if (!this.renderer || this.pointer.distanceTo(new T.Vector2(e.clientX, e.clientY)) > 5) return;
    const r = this.renderer.domElement.getBoundingClientRect();
    const ray = new T.Raycaster();
    ray.setFromCamera(
      new T.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      ),
      this.camera,
    );
    const hit = ray.intersectObjects(
      [...this.assets.zones.values(), this.assets.forklift],
      true,
    )[0];
    let object: T.Object3D | null = hit?.object ?? null;
    while (object) {
      const zone = object.userData['zone'];
      if (zone === 'receiving' || zone === 'racks' || zone === 'picking' || zone === 'dispatch') {
        this.events.select(zone);
        this.focus(zone, false);
        return;
      }
      object = object.parent;
    }
  };
  private readonly lost = (event: Event) => {
    event.preventDefault();
    this.dispose();
    this.events.lost();
  };
  private readonly cancelFocus = () => {
    this.transition = undefined;
  };
  private readonly visibility = () => {
    this.previous = 0;
    if (document.hidden) {
      this.pause();
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    } else this.invalidate();
  };
  private readonly motionChanged = () => {
    this.pause();
    this.cancelFocus();
    this.invalidate();
  };
  private readonly resize = () => {
    if (!this.renderer || !this.host.clientWidth || !this.host.clientHeight) return;
    const w = this.host.clientWidth,
      h = this.host.clientHeight,
      half = Math.max(18, (21 * h) / w);
    Object.assign(this.camera, {
      left: (-half * w) / h,
      right: (half * w) / h,
      top: half,
      bottom: -half,
    });
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.invalidate();
  };
  private readonly invalidate = () => {
    if (!this.frame && !this.disposed && !document.hidden)
      this.frame = requestAnimationFrame(this.render);
  };
  private readonly render = (now: number) => {
    this.frame = 0;
    if (this.disposed) return;
    const dt = this.previous ? Math.min((now - this.previous) / 1000, 0.05) : 0;
    this.previous = now;
    const state = this.sequence.advance(dt);
    this.pose(state.elapsed);
    const bucket = Math.floor(state.elapsed * 10);
    if (bucket !== this.lastPublished) {
      this.events.sequence(state);
      this.lastPublished = bucket;
    }
    if (this.transition && this.controls) {
      const t = Math.min(1, (now - this.transition.started) / 250),
        ease = 1 - (1 - t) ** 3;
      const target = this.transition.from.clone().lerp(this.transition.to, ease);
      this.camera.position
        .copy(this.transition.camera)
        .add(target.clone().sub(this.transition.from));
      this.controls.target.copy(target);
      this.controls.update();
      if (t === 1) this.transition = undefined;
    }
    this.renderer?.render(this.world, this.camera);
    if (state.running || this.transition) this.invalidate();
    else this.previous = 0;
  };
  private pose(t: number) {
    const forklift = this.assets.forklift,
      pallet = this.assets.pallet;
    let heading = Math.PI;
    if (t < 7) forklift.position.set(-5.5, 0.12, 4.5 - (Math.max(0, t - 3) / 4) * 3.7);
    else if (t < 15) {
      const ratio = (t - 7) / 8;
      forklift.position.copy(this.transfer.getPointAt(ratio));
      const tangent = this.transfer.getTangentAt(ratio);
      heading = Math.atan2(tangent.x, tangent.z);
    } else {
      forklift.position.set(
        5,
        0.12,
        5.4 + Math.min(1, (t - 15) / 4) * 0.8 - (Math.max(0, t - 22) / 2) * 0.8,
      );
      heading = 0;
    }
    // Heading is interpolated across the pickup turn; subsequent trajectory tangents are continuous.
    if (t >= 7 && t < 8) heading = T.MathUtils.lerp(Math.PI, heading, t - 7);
    forklift.rotation.y = heading;
    if (t < 7) pallet.position.set(-5.5, 0.14, -0.65);
    else if (t < 19)
      pallet.position.copy(
        new T.Vector3(0, T.MathUtils.lerp(0.02, 0.45, Math.min(1, t - 7)), 1.4)
          .applyAxisAngle(new T.Vector3(0, 1, 0), heading)
          .add(forklift.position),
      );
    else
      pallet.position.set(
        5,
        0.57 + Math.min(1, (t - 19) / 3) * 0.65,
        7.6 + Math.min(1, (t - 19) / 3) * 1.8,
      );
    pallet.rotation.y = heading;
  }
  focus(zone: WarehouseZone, instant = true) {
    const group = this.assets.zones.get(zone);
    if (!group || !this.controls) return;
    this.roof(false);
    this.clearSelection();
    const bounds = new T.Box3().setFromObject(group);
    this.selection = new T.Box3Helper(bounds, new T.Color('#8c7046'));
    this.world.add(this.selection);
    const target = bounds.getCenter(new T.Vector3());
    if (instant || this.reduced.matches) {
      this.camera.position.add(target.clone().sub(this.controls.target));
      this.controls.target.copy(target);
      this.transition = undefined;
    } else
      this.transition = {
        from: this.controls.target.clone(),
        to: target,
        camera: this.camera.position.clone(),
        started: performance.now(),
      };
    this.camera.zoom = zone === 'racks' ? 1.15 : 1.6;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.invalidate();
  }
  private clearSelection() {
    if (this.selection) {
      this.world.remove(this.selection);
      this.selection.geometry.dispose();
      const materials = Array.isArray(this.selection.material)
        ? this.selection.material
        : [this.selection.material];
      materials.forEach((material) => material.dispose());
      this.selection = undefined;
    }
  }
  overview() {
    if (!this.controls) return;
    this.cancelFocus();
    this.clearSelection();
    this.camera.position.set(30, 27, 36);
    this.controls.target.set(0, 1, 2);
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.invalidate();
  }
  rotate() {
    if (!this.controls) return;
    this.cancelFocus();
    const offset = this.camera.position
      .clone()
      .sub(this.controls.target)
      .applyAxisAngle(new T.Vector3(0, 1, 0), Math.PI / 6);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.invalidate();
  }
  zoom(direction: number) {
    this.camera.zoom = T.MathUtils.clamp(this.camera.zoom + direction * 0.2, 0.6, 2.5);
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }
  roof(visible: boolean) {
    this.assets.roof.visible = visible;
    this.invalidate();
  }
  play() {
    if (this.disposed || this.reduced.matches) return false;
    this.sequence.play();
    this.previous = 0;
    this.events.sequence(this.sequence.snapshot());
    this.invalidate();
    return true;
  }
  pause() {
    this.sequence.pause();
    this.events.sequence(this.sequence.snapshot());
  }
  reset() {
    this.sequence.reset();
    this.pose(0);
    this.events.sequence(this.sequence.snapshot());
    this.invalidate();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.controls?.dispose();
    this.clearSelection();
    document.removeEventListener('visibilitychange', this.visibility);
    this.reduced.removeEventListener('change', this.motionChanged);
    const canvas = this.renderer?.domElement;
    canvas?.removeEventListener('pointerdown', this.down);
    canvas?.removeEventListener('pointerup', this.up);
    canvas?.removeEventListener('webglcontextlost', this.lost);
    this.assets.dispose();
    this.world.clear();
    this.renderer?.dispose();
    canvas?.remove();
  }
}
