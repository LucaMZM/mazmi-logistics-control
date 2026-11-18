import { describe, expect, it } from 'vitest';
import { routes } from '../../app.routes';
import { adminGuard, operatorGuard } from '../auth/auth.guard';
import { workspaceNavigation } from './workspace-navigation';

describe('Workspace navigation', () => {
  it('covers each top-level destination once without turning detail or action routes into menu entries', () => {
    const paths = workspaceNavigation.flatMap((group) => group.links.map((link) => link.path));
    const children = routes.find((route) => route.children)?.children ?? [];
    const expected = children
      .filter(
        (route) => route.loadComponent && !route.path?.includes(':') && route.path !== 'orders/new',
      )
      .map((route) => '/' + route.path);
    expect(paths.sort()).toEqual(expected.sort());
  });
  it('uses the visibility corresponding to the actual route guards', () => {
    const children = routes.find((route) => route.children)?.children ?? [];
    for (const item of workspaceNavigation.flatMap((group) => group.links)) {
      const guards = children.find((route) => '/' + route.path === item.path)?.canActivate ?? [];
      expect(item.access, item.path).toBe(
        guards.includes(adminGuard)
          ? 'admin'
          : guards.includes(operatorGuard)
            ? 'operate'
            : undefined,
      );
    }
  });
});
