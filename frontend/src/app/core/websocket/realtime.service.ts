import { Injectable, signal } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Observable, Subject } from 'rxjs';
import { RealtimeUpdate } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly subjects = new Map<string, Subject<RealtimeUpdate>>();
  private readonly subscriptions = new Map<string, StompSubscription>();
  private readonly watchers = new Map<string, number>();
  private readonly dashboardSubject = new Subject<RealtimeUpdate>();
  private readonly connectedSubject = new Subject<void>();
  private dashboardSubscription?: StompSubscription;
  private client?: Client;
  readonly status = signal<'offline' | 'connecting' | 'connected'>('offline');

  connect(): void {
    if (this.client?.active) return;
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    this.status.set('connecting');
    this.client = new Client({
      brokerURL: `${protocol}://${location.host}/ws`,
      reconnectDelay: 2500,
      connectionTimeout: 6000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.status.set('connected');
        this.subjects.forEach((_, id) => this.subscribe(id));
        this.subscribeDashboard();
        this.connectedSubject.next();
      },
      onWebSocketClose: () => {
        this.subscriptions.clear();
        this.dashboardSubscription = undefined;
        this.status.set(this.client?.active ? 'connecting' : 'offline');
      },
      onStompError: () => this.status.set('connecting'),
    });
    this.client.activate();
  }

  disconnect(): void {
    if (this.client?.connected) {
      this.subscriptions.forEach((subscription) => subscription.unsubscribe());
      this.dashboardSubscription?.unsubscribe();
    }
    this.dashboardSubscription = undefined;
    void this.client?.deactivate();
    this.subscriptions.clear();
    this.status.set('offline');
  }

  watchShipment(id: string): Observable<RealtimeUpdate> {
    return new Observable((observer) => {
      let subject = this.subjects.get(id);
      if (!subject) {
        subject = new Subject<RealtimeUpdate>();
        this.subjects.set(id, subject);
      }
      const subjectSubscription = subject.subscribe(observer);
      const watcherCount = (this.watchers.get(id) ?? 0) + 1;
      this.watchers.set(id, watcherCount);
      if (watcherCount === 1 && this.client?.connected) this.subscribe(id);

      return () => {
        subjectSubscription.unsubscribe();
        const remaining = (this.watchers.get(id) ?? 1) - 1;
        if (remaining > 0) {
          this.watchers.set(id, remaining);
          return;
        }
        this.watchers.delete(id);
        if (this.client?.connected) this.subscriptions.get(id)?.unsubscribe();
        this.subscriptions.delete(id);
        this.subjects.delete(id);
        subject.complete();
      };
    });
  }

  watchDashboard(): Observable<RealtimeUpdate> {
    return this.dashboardSubject.asObservable();
  }

  watchConnected(): Observable<void> {
    return this.connectedSubject.asObservable();
  }

  private subscribe(id: string): void {
    this.subscriptions.get(id)?.unsubscribe();
    const subscription = this.client?.subscribe(`/topic/shipments/${id}`, (message: IMessage) =>
      this.subjects.get(id)?.next(JSON.parse(message.body) as RealtimeUpdate),
    );
    if (subscription) this.subscriptions.set(id, subscription);
  }

  private subscribeDashboard(): void {
    this.dashboardSubscription?.unsubscribe();
    this.dashboardSubscription = this.client?.subscribe('/topic/dashboard', (message: IMessage) =>
      this.dashboardSubject.next(JSON.parse(message.body) as RealtimeUpdate),
    );
  }
}
