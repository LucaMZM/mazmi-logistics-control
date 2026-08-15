import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { RealtimeUpdate } from '../../shared/models/models';
import { RealtimeService } from './realtime.service';

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

const stomp = vi.hoisted(() => ({ instances: [] as object[] }));

vi.mock('@stomp/stompjs', () => ({
  Client: class {
    active = false;
    connected = false;
    readonly subscriptions: MockSubscription[] = [];
    constructor(readonly config: MockClientConfig) {
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
    subscribe(destination: string, callback: (message: { body: string }) => void) {
      const subscription = { destination, callback, unsubscribe: vi.fn() };
      this.subscriptions.push(subscription);
      return subscription;
    }
  },
}));

describe('RealtimeService', () => {
  let service: RealtimeService;

  beforeEach(() => {
    stomp.instances.length = 0;
    TestBed.configureTestingModule({});
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
});
