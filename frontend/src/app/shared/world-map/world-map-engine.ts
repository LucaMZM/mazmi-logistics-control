import {
  Map as GeoMap,
  Marker,
  MercatorCoordinate,
  NavigationControl,
  setWorkerUrl,
  setWorkerCount,
  type CustomLayerInterface,
  type GeoJSONSource,
} from 'maplibre-gl';
import * as T from 'three';
import { TwinAssets } from '../../features/digital-twin/twin-assets';
import { MapView, MotionTrack, WorldPoint, hasVan, validPosition } from './world-map.model';
import { WorldMapOptions, WorldMapPort } from './world-map-loader';

export function geographicPosition(longitude: number, latitude: number) {
  return MercatorCoordinate.fromLngLat([longitude, latitude], 0);
}

class VehicleLayer implements CustomLayerInterface {
  selected: string | null = null;
  readonly id = 'mazmi-vehicles';
  readonly type = 'custom';
  readonly renderingMode = '3d';
  private assets = new TwinAssets();
  private readonly scene = new T.Scene();
  private readonly camera = new T.Camera();
  private renderer?: T.WebGLRenderer;
  private readonly models = new Map<string, T.Group>();
  private identity = '';
  private origin = geographicPosition(0, 0);
  constructor(
    private readonly tracks: Map<string, MotionTrack>,
    private readonly tick: (now: number) => boolean,
  ) {
    this.scene.add(new T.HemisphereLight('#ffffff', '#89929a', 2.8));
    const sun = new T.DirectionalLight('#fff5e9', 2.6);
    sun.position.set(0, -70, 100);
    this.scene.add(sun);
  }
  onAdd(map: GeoMap, gl: WebGL2RenderingContext) {
    this.renderer = new T.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
    this.renderer.autoClear = false;
  }
  sync() {
    const vans = [...this.tracks.values()].filter((t) => hasVan(t.point));
    const key = vans
      .map(
        (t) =>
          `${t.point.id}:${t.point.shipment?.vehicleId}:${t.point.shipment?.registrationPlate}`,
      )
      .join('|');
    if (this.identity === key) return;
    this.identity = key;
    this.models.forEach((m) => this.scene.remove(m));
    this.models.clear();
    this.assets.dispose();
    this.assets = new TwinAssets();
    if (vans[0]) this.origin = geographicPosition(vans[0].point.longitude, vans[0].point.latitude);
    for (const t of vans) {
      const model = this.assets.van(t.point.shipment?.registrationPlate ?? '', '#dce1e4');
      model.matrixAutoUpdate = false;
      this.models.set(t.point.id, model);
      this.scene.add(model);
    }
  }
  map?: GeoMap;
  render: CustomLayerInterface['render'] = (_gl, args) => {
    if (!this.renderer || !this.map || document.hidden) return;
    const now = performance.now();
    const moving = this.tick(now);
    this.camera.projectionMatrix
      .fromArray(args.defaultProjectionData.mainMatrix)
      .multiply(new T.Matrix4().makeTranslation(this.origin.x, this.origin.y, this.origin.z));
    for (const [id, model] of this.models) {
      const sample = this.tracks.get(id)?.sample(now);
      if (!sample) continue;
      model.visible = this.map.getZoom() >= 16 && (!this.selected || id === this.selected);
      const coordinate = geographicPosition(sample.longitude, sample.latitude);
      // A bounded visual aid (1–4×); at regional zoom use markers, never kilometre-sized vans.
      const scale =
        coordinate.meterInMercatorCoordinateUnits() *
        Math.min(4, Math.max(1, 2 ** (20 - this.map.getZoom())));
      model.matrix
        .makeTranslation(
          coordinate.x - this.origin.x,
          coordinate.y - this.origin.y,
          coordinate.z - this.origin.z,
        )
        .scale(new T.Vector3(scale, -scale, scale))
        .multiply(new T.Matrix4().makeRotationX(Math.PI / 2))
        .multiply(new T.Matrix4().makeRotationY(Math.PI - sample.angle));
    }
    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    this.renderer.resetState();
    if (moving) this.map.triggerRepaint();
  };
  onRemove() {
    this.assets.dispose();
    this.models.clear();
    this.scene.clear();
    // MapLibre owns the shared canvas/context. Never forceContextLoss here.
    this.renderer?.dispose();
    this.renderer = undefined;
  }
}

class WorldMapEngine implements WorldMapPort {
  private map: GeoMap;
  private readonly tracks = new Map<string, MotionTrack>();
  private readonly markers = new Map<string, Marker>();
  private readonly layer: VehicleLayer;
  private route: [number, number][] = [];
  private selected: string | null = null;
  private followed: string | null = null;
  private disposed = false;
  private loaded = false;
  private failed = false;
  private fitted: boolean;
  private observer: ResizeObserver;
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly timeout: ReturnType<typeof setTimeout>;
  constructor(
    host: HTMLElement,
    private readonly options: WorldMapOptions,
  ) {
    host.dataset['mapReady'] = 'false';
    if (!document.querySelector('link[data-world-map-css]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = '/assets/maplibre/maplibre-gl.css';
      css.dataset['worldMapCss'] = '';
      document.head.appendChild(css);
    }
    setWorkerUrl('/assets/maplibre/maplibre-gl-worker.mjs');
    setWorkerCount(2);
    this.fitted = !!options.view;
    this.map = new GeoMap({
      container: host,
      style: options.style,
      center: options.view ? [options.view.longitude, options.view.latitude] : [-3.2, 40.2],
      zoom: options.view?.zoom ?? 5.5,
      pitch: options.view?.pitch ?? 52,
      bearing: options.view?.bearing ?? -20,
      maxPitch: 65,
      maxZoom: 20,
      pixelRatio: Math.min(devicePixelRatio || 1, 1.5),
      canvasContextAttributes: { antialias: true },
      attributionControl: { compact: false },
    });
    this.layer = new VehicleLayer(this.tracks, this.tick);
    this.layer.map = this.map;
    this.map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right');
    this.map.scrollZoom.disable();
    this.map.on('load', () => {
      if (this.disposed) return;
      this.loaded = true;
      this.map.addSource('mazmi-route', { type: 'geojson', data: this.routeData() });
      this.map.addLayer({
        id: 'mazmi-route',
        type: 'line',
        source: 'mazmi-route',
        paint: { 'line-color': '#526b7a', 'line-width': 3, 'line-dasharray': [2, 2] },
      });
      this.map.addLayer(this.layer);
      this.layer.sync();
      clearTimeout(this.timeout);
      options.ready();
    });
    this.map.on('error', this.fail);
    this.map.on('idle', () => {
      host.dataset['mapReady'] = String(this.loaded && this.map.areTilesLoaded());
    });
    this.map.on('movestart', () => {
      host.dataset['mapReady'] = 'false';
    });
    this.map.on('webglcontextlost', this.fail);
    this.map.on('click', (event) => {
      if (this.map.getZoom() < 16) return;
      const target = [...this.tracks.values()]
        .filter((t) => hasVan(t.point))
        .map((t) => {
          const sample = t.sample(performance.now());
          const screen = this.map.project([sample.longitude, sample.latitude]);
          return {
            id: t.point.id,
            distance: Math.hypot(screen.x - event.point.x, screen.y - event.point.y),
          };
        })
        .sort((a, b) => a.distance - b.distance)[0];
      if (target && target.distance < 32) this.options.select(target.id);
    });
    this.map.on('dragstart', this.interacted);
    this.map.on('zoomstart', this.interacted);
    this.map.on('rotatestart', this.interacted);
    this.map.on('pitchstart', this.interacted);
    this.map.on('render', this.followFrame);
    this.observer = new ResizeObserver(() => this.map.resize());
    this.observer.observe(host);
    document.addEventListener('visibilitychange', this.visibility);
    this.reduced.addEventListener('change', this.visibility);
    this.timeout = setTimeout(() => {
      if (!this.loaded && !this.disposed) options.error();
    }, 20000);
  }
  private readonly fail = () => {
    if (this.disposed) return;
    this.failed = true;
    this.tracks.forEach((t) => t.stop());
    this.follow(null);
    this.map.stop();
    this.options.error();
  };
  private readonly interacted = (event: { originalEvent?: unknown }) => {
    if (event.originalEvent) {
      this.follow(null);
      this.options.unfollow();
    }
  };
  private readonly visibility = () => {
    this.tracks.forEach((t) => t.stop());
    this.map.stop();
    if (!document.hidden) this.map.triggerRepaint();
  };
  private readonly followFrame = () => {
    if (!this.followed || document.hidden) return;
    const sample = this.tracks.get(this.followed)?.sample(performance.now());
    if (!sample) return;
    const center = this.map.getCenter();
    if (Math.abs(center.lng - sample.longitude) + Math.abs(center.lat - sample.latitude) > 1e-9)
      this.map.jumpTo({ center: [sample.longitude, sample.latitude] });
  };
  private readonly tick = (now: number) => {
    if (this.failed) return false;
    let moving = false;
    for (const [id, track] of this.tracks) {
      const sample = track.sample(now);
      moving ||= sample.moving;
      const marker = this.markers.get(id);
      const focused = this.selected ? this.tracks.get(this.selected)?.sample(now) : undefined;
      const screen = this.map.project([sample.longitude, sample.latitude]);
      const focusScreen = focused
        ? this.map.project([focused.longitude, focused.latitude])
        : undefined;
      if (marker) {
        const obscuresFocus =
          id !== this.selected &&
          track.point.kind === 'vehicle' &&
          focusScreen &&
          Math.hypot(screen.x - focusScreen.x, screen.y - focusScreen.y) < 70 &&
          this.map.getZoom() >= 16;
        marker.getElement().style.visibility = obscuresFocus ? 'hidden' : 'visible';
        marker
          .getElement()
          .classList.toggle('world-marker-model', hasVan(track.point) && this.map.getZoom() >= 16);
      }
      marker?.setLngLat([sample.longitude, sample.latitude]);
      marker?.setOffset(
        track.point.kind !== 'vehicle'
          ? [-48, 32]
          : hasVan(track.point) && this.map.getZoom() >= 16
            ? [0, -48]
            : [0, 0],
      );
    }
    return moving;
  };
  private routeData(): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features:
        this.route.length < 2
          ? []
          : [
              {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: this.route.map(([lat, lon]) => [lon, lat]),
                },
              },
            ],
    };
  }
  update(points: WorldPoint[], route: [number, number][]) {
    if (this.disposed) return;
    const valid = points.filter(validPosition);
    const ids = new Set(valid.map((p) => p.id));
    for (const id of this.tracks.keys())
      if (!ids.has(id)) {
        if (this.selected === id) this.select(null);
        this.tracks.delete(id);
        this.markers.get(id)?.remove();
        this.markers.delete(id);
        if (this.followed === id) {
          this.follow(null);
          this.options.unfollow();
        }
      }
    for (const point of valid) {
      const track = this.tracks.get(point.id);
      if (track && !track.update(point, performance.now(), this.reduced.matches || document.hidden))
        continue;
      if (!track) this.tracks.set(point.id, new MotionTrack(point));
      let marker = this.markers.get(point.id);
      if (!marker) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'world-marker';
        button.addEventListener('click', (event) => {
          if (point.kind === 'vehicle') this.options.select(point.id, event.detail === 0);
        });
        marker = new Marker({ element: button })
          .setLngLat([point.longitude, point.latitude])
          .addTo(this.map);
        this.markers.set(point.id, marker);
      }
      const element = marker.getElement();
      element.textContent =
        point.kind === 'origin' ? 'O' : point.kind === 'destination' ? 'D' : '›';
      element.setAttribute('aria-label', `${point.label} · ${point.health ?? point.kind}`);
      element.title = `${point.label} · ${point.health ?? point.kind}`;
      element.dataset['health'] = point.health ?? '';
      element.dataset['kind'] = point.kind ?? '';
      element.setAttribute('aria-pressed', String(point.id === this.selected));
    }
    this.route = route.filter(([latitude, longitude]) => validPosition({ latitude, longitude }));
    if (this.loaded) {
      this.map.getSource<GeoJSONSource>('mazmi-route')?.setData(this.routeData());
      this.layer.sync();
    }
    if (!this.fitted && valid.length) {
      this.fitted = true;
      this.overview();
    }
    this.tick(performance.now());
    this.map.triggerRepaint();
  }
  select(id: string | null, instant = true) {
    this.selected = id;
    this.layer.selected = id;
    this.markers.forEach((m, key) =>
      m.getElement().setAttribute('aria-pressed', String(key === id)),
    );
    if (!id) return;
    const point = this.tracks.get(id)?.sample(performance.now());
    if (point)
      this.map.easeTo({
        center: [point.longitude, point.latitude],
        zoom: 19,
        pitch: 58,
        padding:
          this.map.getContainer().clientWidth < 520
            ? { top: 15, right: 15, bottom: 125, left: 15 }
            : { top: 20, right: 30, bottom: 20, left: 230 },
        duration: instant || this.reduced.matches ? 0 : 250,
      });
  }
  follow(id: string | null) {
    this.followed = id;
    if (id) {
      this.select(id);
      this.map.triggerRepaint();
    }
  }
  overview() {
    this.follow(null);
    this.options.unfollow();
    const points = [...this.tracks.values()].map((t) => [t.point.longitude, t.point.latitude]);
    points.push(...this.route.map(([lat, lon]) => [lon, lat]));
    if (!points.length) return;
    this.map.fitBounds(
      [
        [Math.min(...points.map((p) => p[0])), Math.min(...points.map((p) => p[1]))],
        [Math.max(...points.map((p) => p[0])), Math.max(...points.map((p) => p[1]))],
      ],
      { padding: 65, maxZoom: 14, duration: 0 },
    );
  }
  view(): MapView {
    const c = this.map.getCenter();
    return {
      longitude: c.lng,
      latitude: c.lat,
      zoom: this.map.getZoom(),
      bearing: this.map.getBearing(),
      pitch: this.map.getPitch(),
    };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    clearTimeout(this.timeout);
    this.observer.disconnect();
    document.removeEventListener('visibilitychange', this.visibility);
    this.reduced.removeEventListener('change', this.visibility);
    this.markers.forEach((m) => m.remove());
    this.markers.clear();
    this.map.remove();
    this.tracks.clear();
  }
}

export const createWorldMap = (host: HTMLElement, options: WorldMapOptions): WorldMapPort =>
  new WorldMapEngine(host, options);
