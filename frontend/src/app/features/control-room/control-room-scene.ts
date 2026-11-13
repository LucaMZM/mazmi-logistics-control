import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TwinAssets } from '../digital-twin/twin-assets';
import { ControlRoomSnapshot, ControlRoomStation, metricLabel } from './control-room.model';
import { ControlRoomSceneEvents, ControlRoomScenePort } from './control-room-scene-loader';

type Screen = {
  mesh: T.Mesh<T.PlaneGeometry, T.MeshBasicMaterial>;
  canvas: HTMLCanvasElement;
  texture: T.CanvasTexture;
};

const STATIONS: ControlRoomStation[] = ['operations', 'fleet', 'warehouse'];
const SCREEN_X: Record<ControlRoomStation, number> = {
  operations: -6.6,
  fleet: 0,
  warehouse: 6.6,
};

export class ControlRoomScene implements ControlRoomScenePort {
  private readonly world = new T.Scene();
  private readonly camera = new T.OrthographicCamera(-18, 18, 13, -13, 0.1, 150);
  private readonly assets = new TwinAssets();
  private readonly screens = new Map<ControlRoomStation, Screen>();
  private readonly extraGeometries: T.BufferGeometry[] = [];
  private readonly extraMaterials: T.Material[] = [];
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly homePosition = new T.Vector3(23, 18, 26);
  private readonly homeTarget = new T.Vector3(0, 2, 0);
  private renderer?: T.WebGLRenderer;
  private controls?: OrbitControls;
  private observer?: ResizeObserver;
  private frame = 0;
  private disposed = false;
  private pointerStart = new T.Vector2();
  private animation?: {
    cameraFrom: T.Vector3;
    cameraTo: T.Vector3;
    targetFrom: T.Vector3;
    targetTo: T.Vector3;
    started: number;
  };

  constructor(
    private readonly host: HTMLElement,
    private readonly events: ControlRoomSceneEvents,
  ) {}

  init(snapshot: ControlRoomSnapshot): void {
    try {
      this.renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = T.PCFSoftShadowMap;
      this.world.background = new T.Color('#e9edf0');
      this.world.add(new T.HemisphereLight('#ffffff', '#8395a3', 2.5));
      const sunlight = new T.DirectionalLight('#fff4df', 3.1);
      sunlight.position.set(9, 20, 12);
      sunlight.castShadow = true;
      sunlight.shadow.mapSize.set(1024, 1024);
      sunlight.shadow.camera.left = -18;
      sunlight.shadow.camera.right = 18;
      sunlight.shadow.camera.top = 18;
      sunlight.shadow.camera.bottom = -18;
      sunlight.shadow.camera.far = 75;
      this.world.add(sunlight);
      this.buildOffice();
      this.update(snapshot);
      this.camera.position.copy(this.homePosition);
      const canvas = this.renderer.domElement;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute(
        'aria-label',
        'Illustrative 3D logistics control room. Use the station buttons to navigate with a keyboard.',
      );
      this.host.appendChild(canvas);
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.target.copy(this.homeTarget);
      this.controls.minZoom = 0.65;
      this.controls.maxZoom = 2.5;
      this.controls.maxPolarAngle = Math.PI / 2.18;
      this.controls.addEventListener('change', this.invalidate);
      this.controls.addEventListener('start', this.stopAnimation);
      canvas.addEventListener('pointerdown', this.down);
      canvas.addEventListener('pointerup', this.up);
      canvas.addEventListener('pointermove', this.hover);
      canvas.addEventListener('webglcontextlost', this.contextLost);
      document.addEventListener('visibilitychange', this.visibility);
      this.observer = new ResizeObserver(this.resize);
      this.observer.observe(this.host);
      this.resize();
      this.controls.update();
      this.invalidate();
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  private buildOffice(): void {
    const box = (
      size: [number, number, number],
      position: [number, number, number],
      color: string,
      radius = 0.05,
    ) => this.assets.box(this.world, size, position, color, radius);

    box([27, 0.5, 21], [0, -0.32, 0], '#b7c0c7', 0.28);
    box([26, 0.08, 20], [0, -0.02, 0], '#eef0ed');
    box([26, 7.5, 0.22], [0, 3.7, -9.8], '#dae0df');
    box([0.2, 7.5, 19], [-12.9, 3.7, 0], '#dce2e2');
    box([26.5, 0.22, 0.42], [0, 7.4, -9.5], '#687782');
    box([0.35, 7.3, 0.35], [-12.7, 3.6, 9.3], '#6b7983');

    // Architectural windows and acoustic wall panels; intentionally open at the front.
    for (const x of [-11.5, -8.8, -6.1, 6.1, 8.8, 11.5]) {
      box([0.11, 4.7, 0.14], [x, 3.5, -9.54], '#abb9bd');
    }
    for (const x of [-10.8, -8.5, 8.5, 10.8]) {
      box([1.85, 3.7, 0.07], [x, 4.2, -9.45], '#a6c0c8');
    }
    for (const x of [-10, 10]) {
      for (const z of [-3, 3]) {
        box([0.11, 3.6, 0.11], [x, 1.8, z], '#91a2a9');
        box([0.65, 0.12, 0.65], [x, 3.65, z], '#f6f3e8');
      }
    }
    for (const z of [-6.4, -2, 3.5, 8.0]) {
      box([23.6, 0.018, 0.06], [0, 0.03, z], '#dde3e1', 0.01);
    }
    box([7.5, 0.09, 0.1], [0, 6.8, -9.49], '#8a9ba5');
    this.assets.label(this.world, 'MAZMI / CONTROL', 4.7, 0.8, [0, 6.7, -9.31]);

    for (const station of STATIONS) {
      const x = SCREEN_X[station];
      box([5.95, 3.1, 0.25], [x, 4.4, -9.1], '#34454f', 0.1);
      box([5.6, 2.8, 0.08], [x, 4.4, -8.92], '#1d2d38', 0.06);
      const canvas = document.createElement('canvas');
      canvas.width = 768;
      canvas.height = 384;
      const texture = new T.CanvasTexture(canvas);
      texture.colorSpace = T.SRGBColorSpace;
      const geometry = new T.PlaneGeometry(5.42, 2.62);
      const material = new T.MeshBasicMaterial({ map: texture });
      const mesh = new T.Mesh(geometry, material);
      mesh.position.set(x, 4.4, -8.81);
      mesh.userData['station'] = station;
      this.world.add(mesh);
      this.extraGeometries.push(geometry);
      this.extraMaterials.push(material);
      this.screens.set(station, { mesh, canvas, texture });
      box([0.85, 0.11, 0.2], [x, 2.52, -8.65], '#acbec5');
    }

    // Three desk pods with matte displays, chairs and slim task lights.
    for (const x of [-7.5, 0, 7.5]) {
      box([5.35, 0.28, 2.4], [x, 1.52, 2.4], '#bbc7cc', 0.15);
      box([5.2, 0.08, 2.2], [x, 1.73, 2.4], '#edf0ec');
      for (const dx of [-2.1, 2.1]) {
        box([0.2, 1.5, 0.2], [x + dx, 0.77, 2.4], '#758692');
      }
      for (const dx of [-1.18, 1.18]) {
        box([1.65, 1.05, 0.16], [x + dx, 2.36, 1.8], '#2a3c48');
        box([1.4, 0.8, 0.03], [x + dx, 2.36, 1.91], '#7995a4');
        box([0.11, 0.6, 0.14], [x + dx, 1.9, 1.75], '#63737c');
        box([0.85, 0.08, 0.32], [x + dx, 1.77, 2.5], '#8b9aa4');
      }
      box([1.5, 0.24, 1.5], [x, 0.85, 5], '#566874', 0.22);
      box([1.5, 1.45, 0.24], [x, 1.55, 5.65], '#627480', 0.18);
      box([0.18, 0.55, 0.18], [x, 0.47, 5], '#475964');
      for (const dx of [-0.6, 0.6]) {
        box([0.12, 0.12, 1.2], [x + dx, 0.13, 5], '#475964');
      }
      box([4.8, 0.05, 0.08], [x, 0.07, 7.35], '#d2d9d7');
    }

    for (const x of [-11.3, 11.3]) {
      box([1.2, 2.8, 1.55], [x, 1.4, 7.3], '#647782', 0.08);
      for (const y of [0.65, 1.2, 1.75, 2.3]) {
        box([1.05, 0.16, 0.1], [x, y, 8.11], '#a4c0c8');
      }
    }
    for (const x of [-11.5, 11.5]) {
      box([1.05, 0.85, 1.05], [x, 0.43, -6.9], '#9aaba9');
      box([0.18, 1.65, 0.18], [x, 1.65, -6.9], '#69847d');
      box([0.9, 0.5, 0.95], [x, 2.55, -6.9], '#708f81', 0.22);
    }
  }

  update(snapshot: ControlRoomSnapshot): void {
    const config: Record<ControlRoomStation, [string, string, string, string]> = {
      operations: [
        'OPERATIONS',
        'ACTIVE SHIPMENTS',
        metricLabel(snapshot.activeShipments),
        'DELAYS  ' + metricLabel(snapshot.delayedShipments),
      ],
      fleet: [
        'FLEET / ROUTES',
        'ACTIVE SHIPMENTS',
        metricLabel(snapshot.activeShipments),
        'SIMULATED TRACKING',
      ],
      warehouse: [
        'WAREHOUSE',
        'CRITICAL POSITIONS',
        metricLabel(snapshot.criticalPositions),
        'INCIDENTS  ' + metricLabel(snapshot.openIncidents),
      ],
    };
    this.screens.forEach(({ canvas, texture }, station) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const [title, label, number, detail] = config[station];
      ctx.fillStyle = '#24343f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#7d97a8';
      ctx.fillRect(36, 40, 8, 8);
      ctx.fillStyle = '#e0e8ea';
      ctx.font = 'bold 37px sans-serif';
      ctx.fillText(title, 60, 61);
      ctx.fillStyle = '#afc1c9';
      ctx.font = '25px sans-serif';
      ctx.fillText(label, 42, 141);
      ctx.fillStyle = '#f7f8f6';
      ctx.font = 'bold 120px sans-serif';
      ctx.fillText(number, 40, 289);
      ctx.fillStyle = '#a8bac2';
      ctx.font = '26px sans-serif';
      ctx.fillText(detail, 42, 341);
      texture.needsUpdate = true;
    });
    this.invalidate();
  }

  private readonly down = (event: PointerEvent) => {
    this.pointerStart.set(event.clientX, event.clientY);
  };
  private readonly up = (event: PointerEvent) => {
    if (!this.renderer || this.pointerStart.distanceTo(new T.Vector2(event.clientX, event.clientY)) > 5)
      return;
    const station = this.hit(event);
    if (station) this.events.select(station);
  };
  private hit(event: PointerEvent): ControlRoomStation | undefined {
    if (!this.renderer) return undefined;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return undefined;
    const ray = new T.Raycaster();
    ray.setFromCamera(
      new T.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    const hit = ray.intersectObjects([...this.screens.values()].map((screen) => screen.mesh))[0];
    return hit?.object.userData['station'] as ControlRoomStation | undefined;
  }
  private readonly hover = (event: PointerEvent) => {
    if (this.renderer) this.renderer.domElement.style.cursor = this.hit(event) ? 'pointer' : 'grab';
  };
  private readonly contextLost = (event: Event) => {
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
  private readonly stopAnimation = () => {
    this.animation = undefined;
  };
  private readonly resize = () => {
    if (!this.renderer) return;
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (!width || !height) return;
    const half = Math.max(12, (17 * height) / width);
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
  private readonly render = (now: number) => {
    this.frame = 0;
    if (this.disposed) return;
    if (this.animation && this.controls) {
      const a = this.animation;
      const t = Math.min(1, (now - a.started) / 450);
      const eased = 1 - (1 - t) ** 3;
      this.camera.position.lerpVectors(a.cameraFrom, a.cameraTo, eased);
      this.controls.target.lerpVectors(a.targetFrom, a.targetTo, eased);
      this.controls.update();
      if (t >= 1) this.animation = undefined;
    }
    this.renderer?.render(this.world, this.camera);
    if (this.animation) this.invalidate();
  };
  private moveTo(camera: T.Vector3, target: T.Vector3, instant: boolean): void {
    if (!this.controls) return;
    if (instant || this.reduced.matches) {
      this.animation = undefined;
      this.camera.position.copy(camera);
      this.controls.target.copy(target);
      this.controls.update();
    } else {
      this.animation = {
        cameraFrom: this.camera.position.clone(),
        cameraTo: camera,
        targetFrom: this.controls.target.clone(),
        targetTo: target,
        started: performance.now(),
      };
    }
    this.invalidate();
  }
  focus(station: ControlRoomStation, instant = false): void {
    const x = SCREEN_X[station];
    this.moveTo(new T.Vector3(x + 9, 9.5, 12), new T.Vector3(x, 3.4, -6), instant);
  }
  overview(): void {
    this.moveTo(this.homePosition.clone(), this.homeTarget.clone(), false);
  }
  rotate(): void {
    if (!this.controls) return;
    this.animation = undefined;
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
    const canvas = this.renderer?.domElement;
    canvas?.removeEventListener('pointerdown', this.down);
    canvas?.removeEventListener('pointerup', this.up);
    canvas?.removeEventListener('pointermove', this.hover);
    canvas?.removeEventListener('webglcontextlost', this.contextLost);
    this.controls?.removeEventListener('change', this.invalidate);
    this.controls?.removeEventListener('start', this.stopAnimation);
    this.controls?.dispose();
    this.screens.forEach((screen) => screen.texture.dispose());
    this.extraMaterials.forEach((material) => material.dispose());
    this.extraGeometries.forEach((geometry) => geometry.dispose());
    this.assets.dispose();
    this.world.clear();
    this.renderer?.dispose();
    canvas?.remove();
    this.screens.clear();
  }
}
