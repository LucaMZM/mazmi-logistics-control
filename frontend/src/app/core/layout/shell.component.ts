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
import { IconComponent } from '../../shared/components/icon.component';
import { Router, NavigationEnd, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../auth/auth.service';
import { RealtimeService } from '../websocket/realtime.service';
import { workspaceNavigation } from './workspace-navigation';

@Component({
  selector: 'app-shell',
  host: { '(document:pointerdown)': 'outside($event)', '(document:keydown.escape)': 'escape()' },
  imports: [NgTemplateOutlet, RouterLink, RouterOutlet, IconComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnDestroy {
  readonly auth = inject(AuthService);
  readonly realtime = inject(RealtimeService);
  private readonly router = inject(Router);
  private readonly breakpoint = inject(BreakpointObserver);
  readonly compact = signal(this.breakpoint.isMatched('(max-width: 700px)'));

  readonly drawerOpen = signal(false);
  readonly openGroup = signal<string | null>(null);
  private disclosure?: HTMLButtonElement;
  readonly url = signal('');
  readonly drawer = viewChild<ElementRef<HTMLDialogElement>>('drawer');
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
  readonly activeGroup = computed(
    () => this.groups().find((g) => g.links.some((link) => this.active(link.path)))?.label,
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
      .observe('(max-width: 700px)')
      .pipe(takeUntilDestroyed())
      .subscribe(({ matches }) => {
        if (matches === this.compact()) return;
        if (!matches) this.drawer()?.nativeElement.close();
        this.compact.set(matches);
        this.openGroup.set(null);
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
    const movingFromNav = !!document.activeElement?.closest('.routes');
    this.openGroup.set(null);
    if (this.drawer()?.nativeElement.open) {
      this.drawer()?.nativeElement.close();
    }
    if (movingFromNav) document.getElementById('main-content')?.focus({ preventScroll: true });
  }
  toggle(label: string, button: HTMLButtonElement) {
    this.disclosure = button;
    this.openGroup.update((old) => (old === label ? null : label));
  }
  outside(event: Event) {
    if (!this.compact() && event.target instanceof Element && !event.target.closest('.area'))
      this.openGroup.set(null);
  }
  leave(event: FocusEvent) {
    if (
      !this.compact() &&
      event.relatedTarget instanceof Node &&
      !(event.currentTarget as HTMLElement).contains(event.relatedTarget)
    )
      this.openGroup.set(null);
  }
  escape() {
    if (!this.compact() && this.openGroup()) {
      this.openGroup.set(null);
      this.disclosure?.focus();
    }
  }
  openMenu() {
    this.openGroup.set(this.activeGroup() ?? null);
    this.drawer()?.nativeElement.showModal();
    this.drawerOpen.set(true);
  }
  selected(event: MouseEvent, path: string) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (this.router.url === path) {
      this.drawer()?.nativeElement.close();
      this.openGroup.set(null);
      document.getElementById('main-content')?.focus({ preventScroll: true });
    }
  }
}
