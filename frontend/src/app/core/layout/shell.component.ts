import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { RealtimeService } from '../websocket/realtime.service';
import { IconComponent, IconName } from '../../shared/components/icon.component';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, MatButtonModule, A11yModule, IconComponent],
  host: { '(document:keydown.escape)': 'closeOnEscape()' },
  template: `
    <div class="workspace">
      <a class="skip-link" href="#main-content">Skip to content</a>

      <aside class="rail" aria-label="Primary navigation" (pointermove)="magnetMove($event)" (pointerleave)="resetMagnet()">
        <a class="rail-brand" routerLink="/dashboard" aria-label="MAZMI Logistics Control home">M<span class="brand-dot"></span></a>
        <span class="rail-divider" aria-hidden="true"></span>
        <nav #railNav class="rail-nav" aria-label="Workspace sections">
          <span #selectionPill class="selection-pill" aria-hidden="true"></span>
          @for (item of primaryNavigation; track item.path) {
            <a
              class="dock-item"
              [class.active]="isRouteActive(item.path)"
              [class.nav-inventory]="item.path === '/inventory'"
              [class.nav-fleet]="item.path === '/fleet'"
              [routerLink]="item.path"
              [attr.aria-label]="item.label"
              [attr.aria-current]="isRouteActive(item.path) ? 'page' : null"
              [attr.data-tooltip]="item.label"
              (click)="dismissPanel()"
              data-magnetic
            ><app-icon [name]="item.icon" /></a>
          }
          <button
            class="dock-item"
            type="button"
            [class.active]="isSpacesActive()"
            [attr.aria-expanded]="panel() === 'spaces'"
            aria-controls="spaces-panel"
            aria-label="Digital spaces"
            data-tooltip="Digital spaces"
            (click)="togglePanel('spaces')"
            data-magnetic
          ><app-icon name="twin" /></button>
          <button
            class="dock-item"
            type="button"
            [class.active]="isMoreActive()"
            [attr.aria-expanded]="panel() === 'more'"
            aria-controls="more-panel"
            aria-label="More sections"
            data-tooltip="More sections"
            (click)="togglePanel('more')"
            data-magnetic
          ><app-icon name="more" /></button>
        </nav>
      </aside>

      @if (panel()) {
        <button class="panel-scrim" type="button" aria-label="Close navigation panel" (click)="dismissPanel()"></button>
        <section
          class="nav-panel"
          [id]="panel() === 'spaces' ? 'spaces-panel' : 'more-panel'"
          [attr.aria-label]="panel() === 'spaces' ? 'Digital spaces' : 'More sections'"
          cdkTrapFocus
          [cdkTrapFocusAutoCapture]="false"
        >
          <header class="panel-heading">
            <div>
              <small>MAZMI / LOGISTICS</small>
              <strong>{{ panel() === 'spaces' ? 'Digital spaces' : 'Workspace' }}</strong>
            </div>
            <button class="panel-close" type="button" aria-label="Close panel" (click)="dismissPanel()">×</button>
          </header>
          <nav class="panel-links" aria-label="Secondary navigation">
            @if (panel() === 'spaces') {
              @for (item of spatialNavigation; track item.path) {
                @if (item.path !== '/warehouse-editor' || auth.canOperate()) {
                  <a [routerLink]="item.path" [class.active]="isRouteActive(item.path)" (click)="dismissPanel()">
                    <app-icon [name]="item.icon" /><span>{{ item.label }}</span><span class="chevron">↗</span>
                  </a>
                }
              }
            } @else {
              <p class="panel-section-title">Operations</p>
              @for (item of extraNavigation; track item.path) {
                <a [routerLink]="item.path" [class.active]="isRouteActive(item.path)" (click)="dismissPanel()">
                  <app-icon [name]="item.icon" /><span>{{ item.label }}</span><span class="chevron">↗</span>
                </a>
              }
              <div class="mobile-extras">
                <a routerLink="/inventory" (click)="dismissPanel()"><app-icon name="inventory" /><span>Inventory</span><span class="chevron">↗</span></a>
                <a routerLink="/fleet" (click)="dismissPanel()"><app-icon name="fleet" /><span>Fleet</span><span class="chevron">↗</span></a>
              </div>
              @if (auth.user()?.role === 'ADMIN') {
                <p class="panel-section-title">Administration</p>
                <a routerLink="/admin/users" [class.active]="isRouteActive('/admin/users')" (click)="dismissPanel()">
                  <app-icon name="users" /><span>Users</span><span class="chevron">↗</span>
                </a>
              }
            }
          </nav>
          <p class="panel-note"><span class="demo-dot"></span> Demo workspace · Fictional logistics data</p>
        </section>
      }

      <div class="main">
        <header class="topbar">
          <div class="route">
            <span>MAZMI <span aria-hidden="true">/</span> LOGISTICS CONTROL</span>
            <strong>{{ pageTitle() }}</strong>
          </div>
          <div class="account">
            <span class="connection" role="status" [class.connected]="realtime.status() === 'connected'">
              <i aria-hidden="true"></i>
              {{ realtime.status() === 'connected' ? 'Live updates' : realtime.status() === 'offline' ? 'Offline' : 'Connecting…' }}
            </span>
            <span class="identity"><strong>{{ auth.user()?.name }}</strong><small>{{ auth.user()?.role }}</small></span>
            <button class="logout" mat-button type="button" (click)="logout()">Log out</button>
          </div>
        </header>
        <main id="main-content" class="content" tabindex="-1"><router-outlet /></main>
      </div>
    </div>
`,
  styles: [`
      :host { display: block; min-height: 100dvh; }
      .workspace { min-height: 100dvh; padding: 12px 12px 12px 90px; background: var(--canvas); }
      .rail {
        position: fixed; z-index: 36; top: 50%; left: 14px; transform: translateY(-50%);
        display: flex; flex-direction: column; align-items: center; gap: 14px;
        width: 62px; padding: 12px 8px 14px;
        color: #a1a1aa; border: 1px solid rgb(255 255 255 / 12%);
        border-radius: 32px; background: rgb(35 35 39 / 94%);
        box-shadow: 0 20px 45px -18px rgb(12 12 16 / 48%), 0 2px 8px rgb(12 12 16 / 18%), inset 0 1px rgb(255 255 255 / 10%);
        -webkit-backdrop-filter: blur(16px) saturate(145%);
        backdrop-filter: blur(16px) saturate(145%);
      }
      .rail-brand {
        display: grid; place-items: center; position: relative;
        width: 42px; height: 42px; flex-shrink: 0;
        border-radius: 14px; text-decoration: none;
        background: #f4f4f5; color: #242428;
        font-size: 21px; font-weight: 820; letter-spacing: -0.1em;
      }
      .brand-dot { width: 4px; height: 4px; border-radius: 50%; background: #666670; position: absolute; right: 9px; bottom: 9px; }
      .rail-divider { width: 24px; height: 1px; background: rgb(255 255 255 / 16%); }
      .rail-nav { position: relative; display: grid; gap: 7px; justify-items: center; }
      .dock-item {
        display: grid; place-items: center; position: relative; z-index: 1;
        width: 44px; height: 44px; border: 0; border-radius: 14px;
        background: transparent; color: #a1a1aa; text-decoration: none;
        cursor: pointer; transition: color 160ms ease, background-color 160ms ease;
      }
      .dock-item app-icon {
        transform: translateX(var(--lift, 0px)) scale(var(--scale, 1));
        transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
        will-change: transform;
      }
      .dock-item:hover, .dock-item.active { color: #fafafa; }
      .dock-item:hover { background: rgb(255 255 255 / 6%); }
      .selection-pill {
        position: absolute; z-index: 0; left: 0; top: 0; width: 44px; height: 44px;
        border: 1px solid rgb(255 255 255 / 17%); border-radius: 14px;
        background: rgb(255 255 255 / 13%);
        box-shadow: inset 0 1px rgb(255 255 255 / 18%);
        pointer-events: none; opacity: 0;
        transition: transform 245ms cubic-bezier(0.22, 1, 0.36, 1), opacity 160ms ease;
      }
      .dock-item.active:hover { background: transparent; }
      .dock-item:focus-visible, .rail-brand:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
      .dock-item::after {
        content: attr(data-tooltip); position: absolute; left: calc(100% + 15px); top: 50%;
        padding: 7px 11px; border: 1px solid #48484f; border-radius: 9px;
        background: #28282d; color: #f5f5f7; font-size: 12px; font-weight: 620;
        white-space: nowrap; box-shadow: 0 8px 22px rgb(0 0 0 / 20%);
        transform: translate(-4px,-50%); opacity: 0; pointer-events: none;
        transition: opacity 120ms ease, transform 120ms ease;
      }
      @media (hover: hover) and (pointer: fine) {
        .dock-item:hover::after, .dock-item:focus-visible::after { opacity: 1; transform: translate(0,-50%); }
      }
      .main { min-width: 0; min-height: calc(100dvh - 24px); }
      .topbar {
        position: sticky; top: 12px; z-index: 20; height: 68px; padding: 0 24px;
        display: flex; align-items: center; justify-content: space-between; gap: 20px;
        border: 1px solid rgb(220 221 227 / 88%); border-radius: 18px;
        background: rgb(255 255 255 / 78%);
        box-shadow: 0 8px 28px -18px rgb(20 20 25 / 16%), inset 0 1px rgb(255 255 255 / 95%);
        -webkit-backdrop-filter: blur(18px) saturate(140%);
        backdrop-filter: blur(18px) saturate(140%);
      }
      .route { min-width: 0; display: grid; gap: 2px; }
      .route > span { font-size: 10px; font-weight: 690; color: #797984; letter-spacing: .12em; }
      .route > span span { padding: 0 5px; color: #aaaab2; }
      .route strong { color: var(--ink); font-size: 15px; font-weight: 710; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .account { display: flex; align-items: center; gap: 16px; flex: 0 0 auto; }
      .connection { display: flex; align-items: center; gap: 8px; color: #8a5964; font-size: 11px; font-weight: 600; }
      .connection i { width: 7px; height: 7px; border-radius: 50%; background: #b96a70; }
      .connection.connected { color: #4f505a; }
      .connection.connected i { background: #71717a; }
      .identity { display: grid; gap: 2px; border-left: 1px solid var(--line); padding-left: 15px; text-align: right; }
      .identity strong { color: var(--ink); font-size: 12px; }
      .identity small { color: var(--muted); font-size: 10px; }
      .logout { color: #4f5058; }
      .content { max-width: 1720px; margin: 0 auto; padding: 28px 18px 72px; }
      .skip-link {
        position: fixed; top: -75px; left: 98px; z-index: 100; padding: 12px 18px;
        border-radius: 10px; background: #232327; color: #fff;
      }
      .skip-link:focus { top: 16px; }
      .panel-scrim { position: fixed; inset: 0; z-index: 33; border: 0; background: rgb(21 21 27 / 12%); cursor: default; }
      .nav-panel {
        position: fixed; z-index: 35; top: 50%; left: 90px; transform: translateY(-50%);
        width: min(304px, calc(100vw - 118px)); max-height: min(680px, calc(100dvh - 32px));
        display: flex; flex-direction: column; gap: 16px; overflow-y: auto;
        border: 1px solid rgb(255 255 255 / 90%); border-radius: 22px;
        padding: 20px 16px 14px; background: rgb(250 250 251 / 94%);
        box-shadow: 0 24px 70px -25px rgb(20 20 28 / 33%), inset 0 1px rgb(255 255 255 / 90%);
        -webkit-backdrop-filter: blur(24px) saturate(160%);
        backdrop-filter: blur(24px) saturate(160%);
      }
      .panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 6px; }
      .panel-heading div { display: grid; gap: 3px; }
      .panel-heading small { color: #83838d; font-size: 10px; letter-spacing: .12em; font-weight: 680; }
      .panel-heading strong { color: #252529; font-size: 19px; letter-spacing: -.025em; }
      .panel-close { width: 36px; height: 36px; border: 0; border-radius: 50%; background: #eeeef0; color: #42424a; font-size: 24px; cursor: pointer; }
      .panel-links { display: grid; gap: 4px; }
      .panel-links a { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 9px 12px; border-radius: 11px; color: #4a4a54; text-decoration: none; font-size: 13px; font-weight: 600; }
      .panel-links a:hover, .panel-links a.active { background: #ebebee; color: #1c1c20; }
      .panel-links app-icon { color: #6b6b75; }
      .panel-links .chevron { margin-left: auto; color: #9898a1; }
      .panel-section-title { margin: 12px 12px 3px; font-size: 10px; letter-spacing: .12em; color: #8a8a94; text-transform: uppercase; font-weight: 700; }
      .mobile-extras { display: none; }
      .panel-note { margin: auto 6px 0; padding: 14px 0 0; border-top: 1px solid #e7e7eb; color: #81818b; font-size: 11px; line-height: 1.5; }
      .demo-dot { display: inline-block; width: 6px; height: 6px; margin-right: 6px; border-radius: 50%; background: #9f9fa7; }
      @media (prefers-reduced-transparency: reduce) {
        .rail { -webkit-backdrop-filter: none; backdrop-filter: none; background: #232327; }
        .topbar, .nav-panel { -webkit-backdrop-filter: none; backdrop-filter: none; background: #fafafa; }
      }
      @media (prefers-reduced-motion: reduce) {
        .dock-item app-icon, .selection-pill, .dock-item::after { transition: none; transform: none; }
      }
      @media (max-height: 700px) and (min-width: 681px) {
        .rail { gap: 7px; padding-block: 8px; }
        .rail-nav { gap: 2px; }
        .dock-item, .selection-pill { width: 40px; height: 40px; }
      }
      @media (max-width: 900px) {
        .content { padding: 24px 14px 84px; }
        .identity { display: none; }
      }
      @media (max-width: 680px) {
        .workspace { padding: 10px 10px 88px; }
        .rail {
          top: auto; left: 10px; right: 10px; bottom: 9px; transform: none;
          width: auto; flex-direction: row; justify-content: center; padding: 6px 8px; border-radius: 22px;
        }
        .rail-brand, .rail-divider { display: none; }
        .rail-nav { width: 100%; display: flex; justify-content: space-around; gap: 0; }
        .dock-item { width: 42px; height: 42px; border-radius: 13px; }
        .selection-pill { width: 42px; height: 42px; }
        .dock-item::after { display: none; }
        .nav-panel {
          top: auto; bottom: 80px; left: 10px; right: 10px; transform: none;
          width: auto; max-height: min(65dvh, 580px); border-radius: 21px;
        }
        .topbar { top: 10px; height: 61px; padding: 0 14px; border-radius: 15px; }
        .route > span { font-size: 9px; }
        .route strong { font-size: 13px; }
        .connection { display: none; }
        .account { gap: 0; }
        .logout { font-size: 12px; }
        .content { padding: 22px 4px 42px; }
        .skip-link { left: 12px; }
      }
      @media (max-width: 600px) {
        .nav-inventory, .nav-fleet { display: none; }
        .mobile-extras { display: grid; gap: 4px; }
      }
`],
})

export class ShellComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly realtime = inject(RealtimeService);
  private readonly router = inject(Router);
  private readonly breakpoints = inject(BreakpointObserver);
  @ViewChild('railNav') private railNav?: ElementRef<HTMLElement>;
  @ViewChild('selectionPill') private selectionPill?: ElementRef<HTMLElement>;
  private breakpointSubscription?: Subscription;
  private navigationSubscription?: Subscription;
  private resizeObserver?: ResizeObserver;
  private frame = 0;
  readonly isMobile = signal(false);
  readonly panel = signal<'spaces' | 'more' | null>(null);
  readonly pageTitle = signal('Command center');
  readonly currentUrl = signal('/dashboard');
  readonly primaryNavigation: { path: string; label: string; icon: IconName }[] = [
    { path: '/dashboard', label: 'Command center', icon: 'overview' },
    { path: '/orders', label: 'Orders', icon: 'orders' },
    { path: '/inventory', label: 'Inventory', icon: 'inventory' },
    { path: '/shipments', label: 'Shipments', icon: 'shipments' },
    { path: '/fleet', label: 'Fleet', icon: 'fleet' },
  ];
  readonly extraNavigation: { path: string; label: string; icon: IconName }[] = [
    { path: '/incidents', label: 'Incidents', icon: 'incidents' },
    { path: '/customers', label: 'Customers', icon: 'customers' },
  ];
  readonly spatialNavigation: { path: string; label: string; icon: IconName }[] = [
    { path: '/digital-twin', label: 'Fleet Twin', icon: 'twin' },
    { path: '/warehouse-twin', label: 'Warehouse Twin', icon: 'warehouse' },
    { path: '/warehouse-editor', label: 'Warehouse Editor', icon: 'editor' },
    { path: '/control-room', label: 'Control Room', icon: 'room' },
  ];
  ngOnInit(): void {
    this.breakpointSubscription = this.breakpoints.observe('(max-width: 600px)')
      .subscribe(({ matches }) => {
        this.isMobile.set(matches);
        this.scheduleIndicator(false);
      });
    this.realtime.connect();
    this.updateTitle(this.router.url);
    this.navigationSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.updateTitle(event.urlAfterRedirects));
  }
  ngAfterViewInit(): void {
    this.scheduleIndicator(false);
    if (typeof ResizeObserver !== 'undefined' && this.railNav) {
      this.resizeObserver = new ResizeObserver(() => this.scheduleIndicator(false));
      this.resizeObserver.observe(this.railNav.nativeElement);
    }
  }
  ngOnDestroy(): void {
    this.breakpointSubscription?.unsubscribe();
    this.navigationSubscription?.unsubscribe();
    this.resizeObserver?.disconnect();
    this.resetMagnet();
    if (this.frame) cancelAnimationFrame(this.frame);
    this.realtime.disconnect();
  }
  isRouteActive(path: string): boolean {
    return this.currentUrl() === path || this.currentUrl().startsWith(path + '/');
  }
  isSpacesActive(): boolean {
    return this.spatialNavigation.some((item) => this.isRouteActive(item.path));
  }
  isMoreActive(): boolean {
    return this.extraNavigation.some((item) => this.isRouteActive(item.path)) ||
      this.isRouteActive('/admin/users') ||
      (this.isMobile() && (this.isRouteActive('/inventory') || this.isRouteActive('/fleet')));
  }
  togglePanel(name: 'spaces' | 'more'): void {
    this.panel.set(this.panel() === name ? null : name);
  }
  dismissPanel(): void { this.panel.set(null); }
  closeOnEscape(): void {
    if (!this.panel()) return;
    const section = this.panel();
    this.dismissPanel();
    const selector = section === 'spaces' ? '[aria-label="Digital spaces"][aria-controls]' : '[aria-label="More sections"][aria-controls]';
    document.querySelector<HTMLElement>(selector)?.focus();
  }
  magnetMove(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || typeof matchMedia !== 'function' ||
        !matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
    const nav = this.railNav?.nativeElement;
    if (!nav) return;
    const elements = nav.querySelectorAll<HTMLElement>('[data-magnetic]');
    for (const item of elements) {
      const rect = item.getBoundingClientRect();
      const distance = this.isMobile()
        ? Math.abs(event.clientX - rect.left - rect.width / 2)
        : Math.abs(event.clientY - rect.top - rect.height / 2);
      const intensity = Math.max(0, 1 - distance / 110);
      const horizontal = this.isMobile() ? 0 : intensity * 3.5;
      item.style.setProperty('--lift', horizontal.toFixed(2) + 'px');
      item.style.setProperty('--scale', (1 + intensity * 0.2).toFixed(3));
    }
  }
  resetMagnet(): void {
    this.railNav?.nativeElement.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((item) => {
      item.style.removeProperty('--lift');
      item.style.removeProperty('--scale');
    });
  }
  logout(): void { this.auth.logout(); }
  private updateTitle(url: string): void {
    this.dismissPanel();
    this.currentUrl.set(url.split('?')[0].split('#')[0]);
    const navigation = [...this.primaryNavigation, ...this.extraNavigation, ...this.spatialNavigation];
    const route = navigation.find((item) => this.isRouteActive(item.path));
    this.pageTitle.set(this.currentUrl().startsWith('/admin') ? 'User administration' : (route?.label ?? 'Operations'));
    this.scheduleIndicator(true);
  }
  private scheduleIndicator(animate: boolean): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      const nav = this.railNav?.nativeElement;
      const pill = this.selectionPill?.nativeElement;
      const selected = nav?.querySelector<HTMLElement>('.dock-item.active:not([style*="display: none"])');
      if (!nav || !pill || !selected || selected.getClientRects().length === 0) {
        if (pill) pill.style.opacity = '0';
        return;
      }
      pill.style.transitionDuration = animate ? '' : '0ms';
      pill.style.width = selected.offsetWidth + 'px';
      pill.style.height = selected.offsetHeight + 'px';
      pill.style.transform = 'translate3d(' + selected.offsetLeft + 'px, ' + selected.offsetTop + 'px, 0)';
      pill.style.opacity = '1';
    });
  }
}
