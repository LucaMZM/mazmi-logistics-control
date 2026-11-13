import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { RealtimeUpdate } from '../../shared/models/models';
import { IFrame, IMessage, StompConfig } from '@stomp/stompjs';
import { RealtimeClient, RealtimeService, STOMP_CLIENT_FACTORY } from './realtime.service';

interface MockClientConfig {
  reconnectDelay: number;
  onConnect: () => void;
  onWebSocketClose: () => void;
}

interface MockSubscription {
  destination: string;
  callback: (message: { body: string }) => void;
  unsubscribe: ReturnType<typeof vi.fn>;
}

interface MockClient {
  active: boolean;
  connected: boolean;
  config: MockClientConfig;
  subscriptions: MockSubscription[];
}

const stomp = { instances: [] as MockClient[] };
const connectedFrame: IFrame = {
  command: 'CONNECTED',
  headers: {},
  body: '',
  binaryBody: new Uint8Array(),
  isBinaryBody: false,
};

class TestClient implements RealtimeClient {
  active = false;
  connected = false;
  readonly subscriptions: MockSubscription[] = [];
  readonly config: MockClientConfig;
  constructor(config: StompConfig) {
    this.config = {
      reconnectDelay: config.reconnectDelay ?? 0,
      onConnect: () => config.onConnect?.(connectedFrame),
      onWebSocketClose: () => config.onWebSocketClose?.(new CloseEvent('close')),
    };
    stomp.instances.push(this);
  }
  activate(): void {
    this.active = true;
  }
  deactivate(): Promise<void> {
    this.active = false;
    this.connected = false;
    return Promise.resolve();
  }
  subscribe(destination: string, callback: (message: IMessage) => void) {
    const subscription = {
      id: destination,
      destination,
      callback: ({ body }: { body: string }) =>
        callback({ ...connectedFrame, body, ack: vi.fn(), nack: vi.fn() }),
      unsubscribe: vi.fn(),
    };
    this.subscriptions.push(subscription);
    return subscription;
  }
}

describe('RealtimeService', () => {
  let service: RealtimeService;

  beforeEach(() => {
    stomp.instances.length = 0;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: STOMP_CLIENT_FACTORY,
          useValue: (config: StompConfig) => new TestClient(config),
        },
      ],
    });
    service = TestBed.inject(RealtimeService);
  });

  it('configures automatic reconnect and publishes the connected state', async () => {
    const connected = firstValueFrom(service.watchConnected());
    service.connect();
    const client = stomp.instances[0] as MockClient;
    expect(service.status()).toBe('connecting');
    expect(client.config.reconnectDelay).toBe(2500);
    client.connected = true;
    client.config.onConnect();
    await connected;
    expect(service.status()).toBe('connected');
  });

  it('resubscribes and emits shipment updates after a connection', async () => {
    const updatePromise = firstValueFrom(service.watchShipment('shipment-1'));
    service.connect();
    const client = stomp.instances[0] as MockClient;
    client.connected = true;
    client.config.onConnect();
    const subscription = client.subscriptions.find(
      (item) => item.destination === '/topic/shipments/shipment-1',
    );
    const update = {
      id: 'shipment-1',
      status: 'IN_TRANSIT',
      deliveryHealth: 'ON_TIME',
      latitude: 40.4,
      longitude: -3.7,
      progress: 50,
      simulationActive: true,
      eta: null,
      latestEvent: null,
    } satisfies RealtimeUpdate;
    subscription?.callback({ body: JSON.stringify(update) });
    expect(await updatePromise).toEqual(update);
  });

  it('unsubscribes from a shipment topic when the last watcher leaves', () => {
    service.connect();
    const client = stomp.instances[0] as MockClient;
    client.connected = true;
    client.config.onConnect();
    const watcher = service.watchShipment('shipment-1').subscribe();
    const subscription = client.subscriptions.find(
      (item) => item.destination === '/topic/shipments/shipment-1',
    );

    watcher.unsubscribe();

    expect(subscription?.unsubscribe).toHaveBeenCalledOnce();
    client.config.onConnect();
    expect(
      client.subscriptions.filter((item) => item.destination === '/topic/shipments/shipment-1'),
    ).toHaveLength(1);
  });

  it('keeps a new connection alive when the previous socket closes after logout', () => {
    service.connect();
    const previous = stomp.instances[0] as MockClient;
    previous.connected = true;
    previous.config.onConnect();

    service.disconnect();
    previous.active = true;
    service.connect();
    const current = stomp.instances[1] as MockClient;
    expect(current).toBeDefined();
    expect(service.status()).toBe('connecting');

    previous.config.onWebSocketClose();
    expect(service.status()).toBe('connecting');
    current.connected = true;
    current.config.onConnect();
    expect(service.status()).toBe('connected');
  });

  it('ignores queued frames from a disconnected session and keeps one shared subscription', () => {
    const receive = vi.fn();
    const first = service.watchShipment('shipment-1').subscribe(receive);
    const second = service.watchShipment('shipment-1').subscribe(receive);
    const dashboard = service.watchDashboard().subscribe(receive);
    service.connect();
    const client = stomp.instances[0] as MockClient;
    client.connected = true;
    client.config.onConnect();
    expect(
      client.subscriptions.filter((item) => item.destination.includes('/shipments/')),
    ).toHaveLength(1);
    const oldSubscriptions = [...client.subscriptions];
    service.disconnect();
    service.connect();
    for (const subscription of oldSubscriptions) subscription.callback({ body: '{}' });
    expect(receive).not.toHaveBeenCalled();
    first.unsubscribe();
    second.unsubscribe();
    dashboard.unsubscribe();
  });

  it('ignores old frames after reconnecting the same client', () => {
    const receive = vi.fn();
    const watcher = service.watchShipment('shipment-1').subscribe(receive);
    service.connect();
    const client = stomp.instances[0] as MockClient;
    client.connected = true;
    client.config.onConnect();
    const old = client.subscriptions[0];
    client.config.onWebSocketClose();
    client.config.onConnect();
    old.callback({ body: '{}' });
    expect(receive).not.toHaveBeenCalled();
    watcher.unsubscribe();
  });
});
