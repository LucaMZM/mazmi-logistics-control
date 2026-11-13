import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, Subject, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { RealtimeService } from '../../core/websocket/realtime.service';
import { Dashboard } from '../../shared/models/models';
import { CONTROL_ROOM_SCENE_LOADER } from './control-room-scene-loader';
import { ControlRoomPage } from './control-room.page';

const dashboard = {
  activeShipments: 8,
  delayedShipments: 2,
  openIncidents: 3,
  criticalInventory: [{ sku: 'SKU-1' }],
} as unknown as Dashboard;

class FakeRoom {
  static latest?: FakeRoom;
  static shouldThrow = false;
  init = vi.fn(() => {
    if (FakeRoom.shouldThrow) throw new Error('WebGL disabled');
  });
  update = vi.fn();
  focus = vi.fn();
  overview = vi.fn();
  rotate = vi.fn();
  dispose = vi.fn();
  constructor() {
    FakeRoom.latest = this;
  }
}

describe('Control Room page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    FakeRoom.latest = undefined;
    FakeRoom.shouldThrow = false;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: { dashboard: () => of(dashboard) } },
        {
          provide: RealtimeService,
          useValue: { watchDashboard: () => NEVER, watchConnected: () => NEVER },
        },
        { provide: CONTROL_ROOM_SCENE_LOADER, useValue: async () => FakeRoom },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('loads the scene lazily and renders verified metrics and world links', async () => {
    const fixture = TestBed.createComponent(ControlRoomPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(FakeRoom.latest?.init).toHaveBeenCalledWith({
      activeShipments: 8,
      delayedShipments: 2,
      openIncidents: 3,
      criticalPositions: 1,
    });
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Control Room');
    expect(text).toContain('8');
    expect(text).toContain('Warehouse Twin');
    expect(fixture.nativeElement.querySelector('a[href="/digital-twin"]')).toBeTruthy();
    fixture.componentInstance.focus('warehouse');
    expect(FakeRoom.latest?.focus).toHaveBeenCalledWith('warehouse', false);
    fixture.destroy();
    expect(FakeRoom.latest?.dispose).toHaveBeenCalledOnce();
  });

  it('updates the 3D monitors when dashboard data arrives after the scene', async () => {
    const laterDashboard = new Subject<Dashboard>();
    TestBed.overrideProvider(ApiService, {
      useValue: { dashboard: () => laterDashboard.asObservable() },
    });
    const fixture = TestBed.createComponent(ControlRoomPage);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(FakeRoom.latest?.init).toHaveBeenCalledWith({
      activeShipments: null,
      delayedShipments: null,
      openIncidents: null,
      criticalPositions: null,
    });
    laterDashboard.next(dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(FakeRoom.latest?.update).toHaveBeenCalledWith({
      activeShipments: 8,
      delayedShipments: 2,
      openIncidents: 3,
      criticalPositions: 1,
    });
    fixture.destroy();
  });

  it('keeps real metrics and navigation accessible if WebGL fails', async () => {
    FakeRoom.shouldThrow = true;
    const fixture = TestBed.createComponent(ControlRoomPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.sceneError()).toContain('unavailable');
    expect(fixture.nativeElement.textContent).toContain('8');
    fixture.destroy();
  });

  it('discards a delayed scene load after the page is destroyed', async () => {
    let resolve!: (value: typeof FakeRoom) => void;
    TestBed.overrideProvider(CONTROL_ROOM_SCENE_LOADER, {
      useValue: () => new Promise<typeof FakeRoom>((done) => (resolve = done)),
    });
    const fixture = TestBed.createComponent(ControlRoomPage);
    fixture.detectChanges();
    fixture.destroy();
    resolve(FakeRoom);
    await Promise.resolve();
    expect(FakeRoom.latest).toBeUndefined();
  });
});
