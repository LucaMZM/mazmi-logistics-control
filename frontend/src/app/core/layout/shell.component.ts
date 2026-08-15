import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { RealtimeService } from '../websocket/realtime.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule],
  template: `
    <div class="workspace" [class.sidebar-open]="mobileOpen()">
      <aside id="primary-sidebar" class="sidebar">
        <a routerLink="/dashboard" class="brand" aria-label="Mazmi Logistics Control home"
          ><strong>MAZMI</strong><span>Logistics Control</span></a
        >
        <nav aria-label="Primary navigation">
          @for (item of navigation; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active"
              ><i>{{ item.code }}</i
              ><span>{{ item.label }}</span></a
            >
          }
          @if (auth.user()?.role === 'ADMIN') {
            <p>Administration</p>
            <a routerLink="/admin/users" routerLinkActive="active"><i>US</i><span>Users</span></a>
          }
        </nav>
        <div class="demo-flag">
          <span></span>
          <div><strong>Demo environment</strong><small>Fictional logistics data</small></div>
        </div>
      </aside>
      @if (mobileOpen()) {
        <button
          class="scrim"
          type="button"
          aria-label="Close navigation"
          (click)="mobileOpen.set(false)"
        ></button>
      }
      <div class="main">
        <header class="topbar">
          <button
            class="menu"
            type="button"
            (click)="mobileOpen.set(!mobileOpen())"
            aria-label="Toggle navigation"
            aria-controls="primary-sidebar"
            [attr.aria-expanded]="mobileOpen()"
          >
            ☰
          </button>
          <div class="route">
            <span>Operations</span><strong>{{ pageTitle() }}</strong>
          </div>
          <div class="account">
            <span class="connection" [class.connected]="realtime.status() === 'connected'"
              ><i></i
              >{{ realtime.status() === 'connected' ? 'Live connected' : 'Reconnecting' }}</span
            >
            <div class="identity">
              <strong>{{ auth.user()?.name }}</strong
              ><small>{{ auth.user()?.role }}</small>
            </div>
            <button mat-button type="button" (click)="logout()">Log out</button>
          </div>
        </header>
        <main class="content"><router-outlet /></main>
      </div>
    </div>
  `,
  styles: [
    `
      .workspace {
        min-height: 100vh;
        background: #f5f7fa;
      }
      .sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        width: 244px;
        background: #0f172a;
        color: #cbd5e1;
        display: flex;
        flex-direction: column;
        z-index: 30;
      }
      .brand {
        height: 76px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 0 26px;
        color: #fff;
        text-decoration: none;
        border-bottom: 1px solid #1e293b;
      }
      .brand strong {
        font-size: 19px;
        letter-spacing: 0.14em;
      }
      .brand span {
        font-size: 11px;
        color: #94a3b8;
        letter-spacing: 0.04em;
        margin-top: 2px;
      }
      nav {
        padding: 22px 13px;
        display: grid;
        gap: 4px;
        flex: 1;
        min-height: 0;
        overflow-y: auto;
      }
      nav a {
        display: flex;
        align-items: center;
        gap: 13px;
        color: #94a3b8;
        text-decoration: none;
        padding: 10px 12px;
        font-size: 13px;
        font-weight: 600;
        border-left: 2px solid transparent;
      }
      nav a:hover {
        color: #f8fafc;
        background: #172033;
      }
      nav a.active {
        color: #fff;
        background: #1e293b;
        border-left-color: #38bdf8;
      }
      nav i {
        width: 24px;
        height: 24px;
        display: grid;
        place-items: center;
        border: 1px solid #334155;
        font-style: normal;
        font-size: 9px;
        letter-spacing: 0.04em;
      }
      nav p {
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: #64748b;
        margin: 25px 12px 7px;
      }
      .demo-flag {
        display: flex;
        gap: 10px;
        align-items: center;
        margin: 16px;
        padding: 15px;
        border: 1px solid #334155;
        background: #111c30;
      }
      .demo-flag > span {
        width: 8px;
        height: 8px;
        background: #22d3ee;
      }
      .demo-flag strong,
      .demo-flag small {
        display: block;
      }
      .demo-flag strong {
        font-size: 11px;
        color: #e2e8f0;
      }
      .demo-flag small {
        font-size: 10px;
        color: #64748b;
        margin-top: 3px;
      }
      .main {
        margin-left: 244px;
        min-height: 100vh;
      }
      .topbar {
        height: 76px;
        background: #fff;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 30px;
        position: sticky;
        top: 0;
        z-index: 20;
      }
      .route span,
      .route strong {
        display: block;
      }
      .route span {
        font-size: 10px;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .route strong {
        font-size: 14px;
        margin-top: 3px;
      }
      .account {
        display: flex;
        align-items: center;
        gap: 20px;
      }
      .connection {
        font-size: 11px;
        color: #b45309;
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .connection i {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #d97706;
      }
      .connection.connected {
        color: #15803d;
      }
      .connection.connected i {
        background: #16a34a;
      }
      .identity {
        text-align: right;
        border-left: 1px solid #e2e8f0;
        padding-left: 20px;
      }
      .identity strong,
      .identity small {
        display: block;
      }
      .identity strong {
        font-size: 12px;
      }
      .identity small {
        font-size: 10px;
        color: #64748b;
        margin-top: 2px;
      }
      .content {
        padding: 30px;
        max-width: 1600px;
        margin: 0 auto;
      }
      .menu {
        display: none;
        border: 0;
        background: transparent;
        font-size: 20px;
        cursor: pointer;
      }
      .scrim {
        display: none;
      }
      .route {
        margin-right: auto;
      }
      .topbar .route {
        margin-left: 0;
      }
      @media (max-width: 900px) {
        .sidebar {
          transform: translateX(-100%);
          transition: transform 0.2s;
        }
        .sidebar-open .sidebar {
          transform: none;
        }
        .scrim {
          display: block;
          position: fixed;
          inset: 0;
          z-index: 25;
          border: 0;
          background: rgb(15 23 42 / 46%);
        }
        .main {
          margin-left: 0;
        }
        .menu {
          display: block;
          margin-right: 15px;
        }
        .identity {
          display: none;
        }
        .content {
          padding: 22px 16px;
        }
        .connection {
          display: none;
        }
      }
      @media (max-width: 480px) {
        .topbar {
          padding: 0 12px;
        }
        .menu {
          margin-right: 9px;
        }
        .route {
          min-width: 0;
        }
        .route strong {
          max-width: 130px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .account {
          gap: 4px;
        }
      }
    `,
  ],
})
export class ShellComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly realtime = inject(RealtimeService);
  private readonly router = inject(Router);
  private navigationSubscription?: Subscription;
  readonly mobileOpen = signal(false);
  readonly pageTitle = signal('Operations overview');
  readonly navigation = [
    { path: '/dashboard', label: 'Overview', code: 'OV' },
    { path: '/orders', label: 'Orders', code: 'OR' },
    { path: '/inventory', label: 'Inventory', code: 'IN' },
    { path: '/shipments', label: 'Shipments', code: 'SH' },
    { path: '/customers', label: 'Customers', code: 'CU' },
    { path: '/fleet', label: 'Fleet', code: 'FL' },
    { path: '/incidents', label: 'Incidents', code: 'IC' },
  ];
  ngOnInit(): void {
    this.realtime.connect();
    this.updateTitle(this.router.url);
    this.navigationSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.updateTitle(event.urlAfterRedirects));
  }
  ngOnDestroy(): void {
    this.navigationSubscription?.unsubscribe();
    this.realtime.disconnect();
  }
  logout(): void {
    this.realtime.disconnect();
    this.auth.logout();
  }
  private updateTitle(url: string): void {
    this.mobileOpen.set(false);
    const route = this.navigation.find((item) => url.startsWith(item.path));
    this.pageTitle.set(
      url.startsWith('/admin')
        ? 'User administration'
        : route?.label === 'Overview'
          ? 'Operations overview'
          : (route?.label ?? 'Operations'),
    );
  }
}
