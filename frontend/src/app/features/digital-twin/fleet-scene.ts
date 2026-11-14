import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TwinAssets } from './twin-assets';

export class FleetScene {
  private readonly assets = new TwinAssets();
  private readonly scene = new T.Scene();
  private readonly camera = new T.OrthographicCamera(-16, 16, 12, -12, 0.1, 150);
  private renderer?: T.WebGLRenderer;
  private controls?: OrbitControls;
  private observer?: ResizeObserver;
  private van?: T.Group;
  private frame = 0;
  private disposed = false;
  private moving = false;
  private bodyColor = '';
  private selected = false;
  private elapsed = 0;
  private previous = 0;
  private focusTarget?: T.Vector3;
  private pointerStart = new T.Vector2();
  private readonly path = new T.CatmullRomCurve3(
    [
      new T.Vector3(-3.2, 0, 3.5),
      new T.Vector3(-3.2, 0, 5.5),
      new T.Vector3(3.5, 0, 6),
      new T.Vector3(6.8, 0, 3),
      new T.Vector3(5.8, 0, -0.3),
      new T.Vector3(1, 0, -0.2),
      new T.Vector3(-3.2, 0, 3.5),
    ],
    false,
    'centripetal',
  );
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');
  constructor(
    private readonly host: HTMLElement,
    private readonly select: () => void,
    private readonly lost: () => void,
    private readonly stopped: () => void,
  ) {}
  init(plate: string, color: string) {
    this.bodyColor = color;
    try {
      this.renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = T.PCFSoftShadowMap;
      this.scene.background = new T.Color('#e8ecee');
      this.scene.add(new T.HemisphereLight('#ffffff', '#83929c', 2.5));
      const sun = new T.DirectionalLight('#fff2dc', 3.2);
      sun.position.set(8, 18, 10);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, far: 60 });
      sun.shadow.normalBias = 0.04;
      this.scene.add(sun);
      this.scene.add(this.assets.yard());
      this.van = this.assets.van(plate, color);
      this.van.position.set(-3.2, 0, 3.5);
      this.scene.add(this.van);
      this.camera.position.set(22, 20, 27);
      const canvas = this.renderer.domElement;
      canvas.setAttribute(
        'aria-label',
        'Illustrative logistics yard. Use the HTML controls to select and inspect the vehicle.',
      );
      canvas.setAttribute('role', 'img');
      this.host.appendChild(canvas);
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.target.set(0, 0, 0);
      this.controls.minZoom = 0.6;
      this.controls.maxZoom = 3;
      this.controls.maxPolarAngle = Math.PI / 2.3;
      this.controls.addEventListener('change', this.invalidate);
      this.controls.addEventListener('start', this.cancelFocus);
      canvas.addEventListener('pointerdown', this.down);
      canvas.addEventListener('pointerup', this.up);
      canvas.addEventListener('pointermove', this.hover);
      canvas.addEventListener('webglcontextlost', this.contextLost);
      document.addEventListener('visibilitychange', this.visibility);
      this.reduced.addEventListener('change', this.motionChanged);
      this.observer = new ResizeObserver(this.resize);
      this.observer.observe(this.host);
      this.resize();
      this.controls.update();
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  private readonly cancelFocus = () => {
    this.focusTarget = undefined;
  };
  private readonly down = (e: PointerEvent) => this.pointerStart.set(e.clientX, e.clientY);
  private hit(e: PointerEvent) {
    if (!this.renderer || !this.van) return false;
    const r = this.renderer.domElement.getBoundingClientRect();
    const ray = new T.Raycaster();
    ray.setFromCamera(
      new T.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      ),
      this.camera,
    );
    return ray.intersectObject(this.van, true).length > 0;
  }
  private readonly up = (e: PointerEvent) => {
    if (this.pointerStart.distanceTo(new T.Vector2(e.clientX, e.clientY)) < 5 && this.hit(e)) {
      this.select();
      this.focus(false);
    }
  };
  private readonly hover = (e: PointerEvent) => {
    const hit = this.hit(e);
    if (this.renderer) this.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
    this.assets.highlightBody(this.bodyColor, hit || this.selected);
    this.invalidate();
  };
  private readonly contextLost = (e: Event) => {
    e.preventDefault();
    this.dispose();
    this.lost();
  };
  private readonly motionChanged = () => {
    this.pause();
    this.focusTarget = undefined;
    this.invalidate();
  };
  private readonly visibility = () => {
    this.previous = 0;
    if (document.hidden) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    } else this.invalidate();
  };
  private readonly resize = () => {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h || !this.renderer) return;
    const half = Math.max(12, (16 * h) / w);
    this.camera.left = (-half * w) / h;
    this.camera.right = (half * w) / h;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.invalidate();
  };
  private readonly invalidate = () => {
    if (!this.frame && !this.disposed && !document.hidden)
      this.frame = requestAnimationFrame(this.render);
  };
  private readonly render = (time: number) => {
    this.frame = 0;
    if (this.disposed) return;
    const dt = this.previous ? Math.min((time - this.previous) / 1000, 0.05) : 0;
    this.previous = time;
    if (this.moving && this.van) {
      this.elapsed = Math.min(18, this.elapsed + dt);
      const t = this.elapsed / 18;
      this.van.position.copy(this.path.getPointAt(t));
      const tangent = this.path.getTangentAt(t);
      const target = new T.Quaternion().setFromAxisAngle(
        new T.Vector3(0, 1, 0),
        Math.atan2(tangent.x, tangent.z),
      );
      this.van.quaternion.slerp(target, 1 - Math.exp(-dt * 8));
      if (t === 1) this.pause();
    }
    if (this.focusTarget && this.controls) {
      const delta = this.focusTarget
        .clone()
        .sub(this.controls.target)
        .multiplyScalar(1 - Math.exp(-dt * 14));
      this.controls.target.add(delta);
      this.camera.position.add(delta);
      if (this.controls.target.distanceTo(this.focusTarget) < 0.01) this.focusTarget = undefined;
      this.controls.update();
    }
    if (this.renderer) this.renderer.render(this.scene, this.camera);
    if (this.moving || this.focusTarget) this.invalidate();
    else this.previous = 0;
  };
  focus(instant = true) {
    this.selected = true;
    this.assets.highlightBody(this.bodyColor, true);
    if (!this.van || !this.controls) return;
    const target = this.van.position.clone().add(new T.Vector3(0, 1, 0));
    if (instant || this.reduced.matches) {
      this.camera.position.add(target.clone().sub(this.controls.target));
      this.controls.target.copy(target);
    } else this.focusTarget = target;
    this.camera.zoom = 1.8;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.invalidate();
  }
  reset() {
    if (!this.controls) return;
    this.focusTarget = undefined;
    this.camera.position.set(22, 20, 27);
    this.controls.target.set(0, 0, 0);
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.invalidate();
  }
  rotate() {
    if (!this.controls) return;
    const offset = this.camera.position
      .clone()
      .sub(this.controls.target)
      .applyAxisAngle(new T.Vector3(0, 1, 0), Math.PI / 6);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.invalidate();
  }
  play() {
    if (this.reduced.matches || this.disposed) return false;
    if (this.elapsed >= 18) this.elapsed = 0;
    this.moving = true;
    this.previous = 0;
    this.invalidate();
    return true;
  }
  pause() {
    this.moving = false;
    this.stopped();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.controls?.dispose();
    document.removeEventListener('visibilitychange', this.visibility);
    this.reduced.removeEventListener('change', this.motionChanged);
    const canvas = this.renderer?.domElement;
    canvas?.removeEventListener('pointerdown', this.down);
    canvas?.removeEventListener('pointerup', this.up);
    canvas?.removeEventListener('pointermove', this.hover);
    canvas?.removeEventListener('webglcontextlost', this.contextLost);
    this.scene.traverse((object) => {
      if (object instanceof T.DirectionalLight) object.shadow.dispose();
    });
    this.assets.dispose();
    this.scene.clear();
    this.renderer?.dispose();
    canvas?.remove();
  }
}
