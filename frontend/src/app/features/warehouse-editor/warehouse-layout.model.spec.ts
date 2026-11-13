import {
  addItem,
  relocate,
  rotateItem,
  starterLayout,
  validLayout,
} from './warehouse-layout.model';

describe('Warehouse visual layout editor', () => {
  it('starts with an illustrative non-overlapping layout', () => {
    const draft = starterLayout();
    expect(validLayout(draft)).toBe(true);
    expect(draft.some((item) => item.kind === 'DOCK')).toBe(true);
  });

  it('rejects collisions and out-of-bounds placement without mutating the draft', () => {
    const draft = starterLayout();
    expect(relocate(draft, 'rack-1', 0, -3)).toBeNull();
    expect(relocate(draft, 'rack-1', 30, -3)).toBeNull();
    expect(draft[0].x).toBe(-7);
    expect(relocate(draft, 'rack-1', -6, -2)).not.toBeNull();
  });

  it('can add items with unique ids and reject impossible placement', () => {
    const draft = starterLayout();
    const next = addItem(draft, 'RACK');
    expect(next).not.toBeNull();
    expect(next?.length).toBe(draft.length + 1);
    expect(new Set(next?.map((item) => item.id)).size).toBe(next?.length);
    expect(validLayout(next ?? [])).toBe(true);
    const bad = [...draft, { ...draft[0], id: 'different' }];
    expect(validLayout(bad)).toBe(false);
  });

  it('rotates racks without allowing overlaps', () => {
    const draft = starterLayout();
    const result = rotateItem(draft, 'rack-1');
    expect(result).not.toBeNull();
    expect(result?.find((x) => x.id === 'rack-1')?.orientation).toBe(90);
    expect(validLayout(draft)).toBe(true);
  });

  it('enforces dispatch dock placement and a bounded object count', () => {
    const draft = starterLayout();
    expect(relocate(draft, 'dock-1', 7, 2)).toBeNull();
    const tooMany = Array.from({ length: 61 }, (_, i) => ({
      id: `rack-${i}`,
      kind: 'RACK' as const,
      x: i,
      z: 0,
      orientation: 0,
    }));
    expect(validLayout(tooMany)).toBe(false);
  });
});
