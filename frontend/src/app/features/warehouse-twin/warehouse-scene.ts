import { sampleRoute, type LoadingLane } from '../warehouse-spatial/loading-lane';
import type { LayoutItem } from '../warehouse-editor/warehouse-layout.model';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WarehouseAssets } from './warehouse-assets';
import { WarehouseSequence, WarehouseZone } from './warehouse-model';
import { WarehouseSceneEvents, WarehouseScenePort } from './warehouse-scene-loader';

export class WarehouseScene implements WarehouseScenePort {
  private readonly world = new T.Scene();
  private readonly camera = new T.OrthographicCamera(-22, 22, 18, -18, 0.1, 200);
  private following = false;
  private readonly focusTarget = new T.Vector3();
  private readonly delta = new T.Vector3();
  private readonly assets: WarehouseAssets;
  private readonly sequence: WarehouseSequence;
  private renderer?: T.WebGLRenderer;
  private controls?: OrbitControls;
  private observer?: ResizeObserver;
  private selection?: T.Box3Helper;
  private frame = 0;
  private previous = 0;
  private disposed = false;
  private lastPublished = -1;
  private transition?: {
    from: T.Vector3;
    to: T.Vector3;
    orbit: T.Spherical;
    end: T.Spherical;
    zoom: number;
    endZoom: number;
    started: number;
  };
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly pointer = new T.Vector2();
  constructor(
    private readonly host: HTMLElement,
    private readonly events: WarehouseSceneEvents,
    layout: LayoutItem[],
    private readonly lane: LoadingLane | null = null,
  ) {
    this.sequence = new WarehouseSequence(lane?.length);
    this.assets = new WarehouseAssets(layout, lane);
  }
  init() {
    try {
      this.renderer = new T.WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(
        Math.min(devicePixelRatio || 1, this.host.clientWidth < 600 ? 1.25 : 1.5),
      );
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = T.PCFShadowMap;
      this.world.background = new T.Color('#e8ecee');
      this.world.add(new T.HemisphereLight('#ffffff', '#86959e', 2.5));
      const sun = new T.DirectionalLight('#fff4e2', 3.2);
      sun.position.set(15, 28, 18);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, far: 100 });
      sun.shadow.radius = 2;
      sun.shadow.normalBias = 0.035;
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
      if (object === this.assets.forklift) {
        this.follow(true);
        return;
      }
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
    this.follow(false);
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
    this.pose(this.sequence.choreographyTime());
    const bucket = Math.floor(state.elapsed * 10);
    if (bucket !== this.lastPublished) {
      this.events.sequence(state);
      this.lastPublished = bucket;
    }
    if (this.following && this.controls) {
      this.focusTarget.copy(this.assets.forklift.position);
      this.focusTarget.y += 1;
      if (this.transition) this.transition.to.copy(this.focusTarget);
      else {
        this.delta.copy(this.focusTarget).sub(this.controls.target);
        this.camera.position.add(this.delta);
        this.controls.target.copy(this.focusTarget);
        this.controls.update();
      }
    }
    if (this.transition && this.controls) {
      const t = Math.min(1, (now - this.transition.started) / 250),
        ease = 1 - (1 - t) ** 3;
      const tr = this.transition;
      this.controls.target.lerpVectors(tr.from, tr.to, ease);
      const theta =
        tr.orbit.theta +
        Math.atan2(
          Math.sin(tr.end.theta - tr.orbit.theta),
          Math.cos(tr.end.theta - tr.orbit.theta),
        ) *
          ease;
      this.camera.position
        .setFromSphericalCoords(
          T.MathUtils.lerp(tr.orbit.radius, tr.end.radius, ease),
          T.MathUtils.lerp(tr.orbit.phi, tr.end.phi, ease),
          theta,
        )
        .add(this.controls.target);
      this.camera.zoom = T.MathUtils.lerp(tr.zoom, tr.endZoom, ease);
      this.camera.updateProjectionMatrix();
      this.controls.update();
      if (t === 1) this.transition = undefined;
    }
    this.renderer?.render(this.world, this.camera);
    if (state.running || this.transition) this.invalidate();
    else this.previous = 0;
  };
  private pose(t: number) {
    if (!this.lane) return;
    const ease = (from: number, to: number) => T.MathUtils.smoothstep(t, from, to);
    const p = sampleRoute(this.lane, ease(7, 19));
    const insertion = 1.9 * ease(19.9, 21.9),
      withdrawal = 1.9 * ease(22.5, 24);
    const lift = 0.38 * ease(3, 7) + 0.62 * ease(19, 19.9) - 0.045 * ease(21.9, 22.5);
    this.assets.forklift.position.set(p.x, 0.12, p.z + insertion - withdrawal);
    this.assets.forklift.rotation.y = p.yaw;
    this.assets.carriage.position.y = lift;
    this.assets.pallet.position.set(
      p.x + Math.sin(p.yaw) * 1.4,
      0.14 + lift,
      p.z + Math.cos(p.yaw) * 1.4 + insertion,
    );
    this.assets.pallet.rotation.y = p.yaw;
  }
  focus(zone: WarehouseZone, instant = true) {
    const group = this.assets.zones.get(zone);
    if (!group?.children.length || !this.controls) return;
    this.follow(false);
    this.roof(false);
    this.clearSelection();
    const bounds = new T.Box3().setFromObject(group);
    this.selection = new T.Box3Helper(bounds, new T.Color('#8c7046'));
    this.world.add(this.selection);
    const target = bounds.getCenter(new T.Vector3());
    this.frameTarget(target, zone === 'racks' ? 1.15 : 1.6, instant);
  }
  private frameTarget(target: T.Vector3, zoom: number, instant = false, offset?: T.Vector3) {
    if (!this.controls) return;
    const current = this.camera.position.clone().sub(this.controls.target);
    if (instant || this.reduced.matches) {
      this.transition = undefined;
      this.controls.target.copy(target);
      this.camera.position.copy(offset ?? current).add(target);
      this.camera.zoom = zoom;
      this.camera.updateProjectionMatrix();
      this.controls.update();
    } else
      this.transition = {
        from: this.controls.target.clone(),
        to: target,
        orbit: new T.Spherical().setFromVector3(current),
        end: new T.Spherical().setFromVector3(offset ?? current),
        zoom: this.camera.zoom,
        endZoom: zoom,
        started: performance.now(),
      };
    this.invalidate();
  }
  showRoute(visible: boolean) {
    this.assets.route.visible = visible;
    this.invalidate();
  }
  follow(enabled: boolean) {
    if (this.following === enabled || !this.controls || (enabled && !this.assets.forklift.parent))
      return;
    this.following = enabled;
    this.events.following(enabled);
    this.assets.catalog.highlightBody('#ac925f', enabled);
    if (enabled) {
      this.clearSelection();
      this.roof(false);
      const target = this.assets.forklift.position.clone();
      target.y += 1;
      this.frameTarget(target, 1.85);
    } else this.transition = undefined;
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
    this.frameTarget(new T.Vector3(0, 1, 2), 1, false, new T.Vector3(30, 26, 34));
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
    this.transition = undefined;
    this.camera.zoom = T.MathUtils.clamp(this.camera.zoom + direction * 0.2, 0.6, 2.5);
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }
  roof(visible: boolean) {
    this.assets.roof.visible = visible;
    this.invalidate();
  }
  play() {
    if (!this.lane || this.disposed || this.reduced.matches) return false;
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
    this.world.traverse((object) => {
      if (object instanceof T.DirectionalLight) object.shadow.dispose();
    });
    this.assets.dispose();
    this.world.clear();
    this.renderer?.dispose();
    canvas?.remove();
  }
}
