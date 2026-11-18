import {
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { Router, NavigationEnd, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../auth/auth.service';
import { RealtimeService } from '../websocket/realtime.service';
import { workspaceNavigation } from './workspace-navigation';

@Component({
  selector: 'app-shell',
  imports: [NgTemplateOutlet, RouterLink, RouterOutlet, MatButtonModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnDestroy {
  readonly auth = inject(AuthService);
  readonly realtime = inject(RealtimeService);
  private readonly router = inject(Router);
  private readonly breakpoint = inject(BreakpointObserver);
  readonly compact = signal(this.breakpoint.isMatched('(max-width: 960px)'));
  readonly collapsed = signal(false);
  readonly drawerOpen = signal(false);
  readonly expanded = signal(new Set(['Overview', 'Operations', 'Resources']));
  readonly url = signal('');
  readonly drawer = viewChild<ElementRef<HTMLDialogElement>>('drawer');
  readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  readonly groups = computed(() =>
    workspaceNavigation
      .map((group) => ({
        ...group,
        links: group.links.filter((link) =>
          link.access === 'operate'
            ? this.auth.canOperate()
            : link.access === 'admin'
              ? this.auth.user()?.role === 'ADMIN'
              : true,
        ),
      }))
      .filter((group) => group.links.length),
  );
  readonly pageTitle = computed(
    () =>
      this.groups()
        .flatMap((g) => g.links)
        .find((l) => this.active(l.path))?.label ?? 'Operations',
  );
  constructor() {
    this.sync(this.router.url);
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => this.sync(e.urlAfterRedirects));
    this.breakpoint
      .observe('(max-width: 960px)')
      .pipe(takeUntilDestroyed())
      .subscribe(({ matches }) => {
        if (!matches) this.drawer()?.nativeElement.close();
        this.compact.set(matches);
      });
    this.realtime.connect();
  }
  ngOnDestroy() {
    this.realtime.disconnect();
  }
  active(path: string) {
    return this.url() === path || this.url().startsWith(path + '/');
  }
  private sync(url: string) {
    this.url.set(url.split(/[?#]/)[0]);
    const group = workspaceNavigation.find((g) => g.links.some((l) => this.active(l.path)));
    if (group) this.expanded.update((s) => new Set([...s, group.label]));
    if (this.drawer()?.nativeElement.open) {
      this.drawer()?.nativeElement.close();
      document.getElementById('main-content')?.focus({ preventScroll: true });
    }
  }
  toggle(label: string) {
    this.expanded.update((old) => {
      const next = new Set(old);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }
  openMenu() {
    if (this.compact()) {
      this.drawer()?.nativeElement.showModal();
      this.drawerOpen.set(true);
    } else {
      this.collapsed.set(false);
      requestAnimationFrame(() =>
        document.querySelector<HTMLButtonElement>('.sidebar .hide-menu')?.focus(),
      );
    }
  }
  hideMenu() {
    if (this.compact()) {
      this.drawer()?.nativeElement.close();
    } else {
      this.collapsed.set(true);
      requestAnimationFrame(() => this.trigger()?.nativeElement.focus());
    }
  }
  selected(event: MouseEvent, path: string) {
    if (
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey &&
      path === this.router.url
    )
      this.drawer()?.nativeElement.close();
  }
}
