import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { RealtimeService } from '../websocket/realtime.service';
import { IconComponent, IconName } from '../../shared/components/icon.component';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, A11yModule, IconComponent],
  host: { '(document:keydown.escape)': 'closeNavigation()' },
  template: `
    <div class="workspace" [class.sidebar-open]="mobileOpen()">
      <a class="skip-link" href="#main-content">Skip to content</a>
      <aside
        id="primary-sidebar"
        class="sidebar"
        [inert]="isMobile() && !mobileOpen()"
        [cdkTrapFocus]="isMobile() && mobileOpen()"
      >
        <button
          class="close-navigation"
          type="button"
          aria-label="Close navigation"
          (click)="closeNavigation()"
        >
          ×
        </button>
        <a routerLink="/dashboard" class="brand" aria-label="Mazmi Logistics Control home"
          ><strong>MAZMI</strong><span>Logistics Control</span></a
        >
        <nav aria-label="Primary navigation">
          <p>Workspace</p>
          @for (item of navigation; track item.path) {
            @if (item.path === '/customers') {
              <p>Resources</p>
            }
            <a [routerLink]="item.path" routerLinkActive="active" ariaCurrentWhenActive="page"
              ><app-icon [name]="item.icon" /><span>{{ item.label }}</span></a
            >
          }
          @if (auth.user()?.role === 'ADMIN') {
            <p>Administration</p>
            <a routerLink="/admin/users" routerLinkActive="active" ariaCurrentWhenActive="page"
              ><app-icon name="users" /><span>Users</span></a
            >
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
          (click)="closeNavigation()"
        ></button>
      }
      <div class="main" [inert]="isMobile() && mobileOpen()">
        <header class="topbar">
          <button
            class="menu"
            type="button"
            id="navigation-toggle"
            (click)="toggleNavigation()"
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
            <span
              class="connection"
              role="status"
              [class.connected]="realtime.status() === 'connected'"
              ><i></i
              >{{
                realtime.status() === 'connected'
                  ? 'Live updates'
                  : realtime.status() === 'offline'
                    ? 'Offline'
                    : 'Connecting…'
              }}</span
            >
            <div class="identity">
              <strong>{{ auth.user()?.name }}</strong
              ><small>{{ auth.user()?.role }}</small>
            </div>
            <button mat-button type="button" (click)="logout()">Log out</button>
          </div>
        </header>
        <main id="main-content" class="content" tabindex="-1"><router-outlet /></main>
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
        align-content: start;
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
        border-radius: 6px;
        min-height: 44px;
        transition:
          background-color 140ms,
          color 140ms;
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
      nav p {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: #94a3b8;
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
        border-radius: 6px;
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
        color: #94a3b8;
        margin-top: 3px;
      }
      .main {
        margin-left: 244px;
        min-height: 100vh;
      }
      .topbar {
        height: 68px;
        background: rgb(255 255 255 / 94%);
        backdrop-filter: blur(12px);
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
      .skip-link {
        position: fixed;
        left: 260px;
        top: -70px;
        z-index: 100;
        padding: 12px 18px;
        background: white;
        color: #176b87;
      }
      .skip-link:focus {
        top: 10px;
      }
      .close-navigation {
        display: none;
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
        .skip-link {
          left: 12px;
        }
        .close-navigation {
          display: block;
          position: absolute;
          right: 8px;
          top: 12px;
          width: 44px;
          height: 44px;
          color: white;
          background: transparent;
          border: 0;
          font-size: 26px;
          cursor: pointer;
        }
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
  private readonly breakpoints = inject(BreakpointObserver);
  private breakpointSubscription?: Subscription;
  readonly isMobile = signal(false);
  private navigationSubscription?: Subscription;
  readonly mobileOpen = signal(false);
  readonly pageTitle = signal('Operations overview');
  readonly navigation: { path: string; label: string; icon: IconName }[] = [
    { path: '/dashboard', label: 'Overview', icon: 'overview' },
    { path: '/orders', label: 'Orders', icon: 'orders' },
    { path: '/inventory', label: 'Inventory', icon: 'inventory' },
    { path: '/shipments', label: 'Shipments', icon: 'shipments' },
    { path: '/incidents', label: 'Incidents', icon: 'incidents' },
    { path: '/customers', label: 'Customers', icon: 'customers' },
    { path: '/fleet', label: 'Fleet', icon: 'fleet' },
  ];
  ngOnInit(): void {
    this.breakpointSubscription = this.breakpoints
      .observe('(max-width: 900px)')
      .subscribe(({ matches }) => {
        this.isMobile.set(matches);
        if (!matches) this.mobileOpen.set(false);
      });
    this.realtime.connect();
    this.updateTitle(this.router.url);
    this.navigationSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.updateTitle(event.urlAfterRedirects));
  }
  ngOnDestroy(): void {
    this.breakpointSubscription?.unsubscribe();
    this.navigationSubscription?.unsubscribe();
    this.realtime.disconnect();
  }
  logout(): void {
    this.realtime.disconnect();
    this.auth.logout();
  }
  toggleNavigation(): void {
    this.mobileOpen.set(!this.mobileOpen());
    if (this.mobileOpen())
      setTimeout(() => document.querySelector<HTMLButtonElement>('.close-navigation')?.focus());
  }
  closeNavigation(): void {
    if (!this.mobileOpen()) return;
    this.mobileOpen.set(false);
    setTimeout(() => document.getElementById('navigation-toggle')?.focus());
  }
  private updateTitle(url: string): void {
    const wasOpen = this.mobileOpen();
    this.mobileOpen.set(false);
    if (wasOpen) setTimeout(() => document.getElementById('main-content')?.focus());
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
