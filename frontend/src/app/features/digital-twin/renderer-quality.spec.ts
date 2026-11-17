import { describe, expect, it, vi } from 'vitest';
import { SCENE_PIXEL_BUDGET, resizeSceneRenderer, scenePixelRatio } from './renderer-quality';

describe('shared 3D scene resolution policy', () => {
  it('respects the device ratio for non-Retina displays', () => {
    expect(scenePixelRatio(1000, 600, 1)).toBe(1);
    expect(scenePixelRatio(390, 650, 0.8)).toBe(0.8);
  });

  it('caps the Retina ratio more tightly on mobile', () => {
    expect(scenePixelRatio(390, 650, 3)).toBe(1.25);
    expect(scenePixelRatio(1000, 700, 3)).toBe(1.5);
  });

  it('never exceeds the drawing-buffer pixel budget', () => {
    for (const [width, height] of [
      [1440, 1000],
      [2560, 1600],
      [3840, 2160],
      [7680, 4320],
    ]) {
      const ratio = scenePixelRatio(width, height, 3);
      expect(width * height * ratio ** 2).toBeLessThanOrEqual(SCENE_PIXEL_BUDGET + 1);
      expect(ratio).toBeGreaterThan(0);
    }
  });

  it('recomputes the ratio after desktop to mobile resize', () => {
    let ratio = 1;
    const renderer = {
      getPixelRatio: vi.fn(() => ratio),
      setPixelRatio: vi.fn((value: number) => {
        ratio = value;
      }),
      setSize: vi.fn(),
    };
    resizeSceneRenderer(renderer, 1440, 1000, 2);
    const desktop = ratio;
    resizeSceneRenderer(renderer, 390, 650, 2);
    expect(desktop).toBeLessThan(1.5);
    expect(ratio).toBe(1.25);
    expect(renderer.setPixelRatio).toHaveBeenCalledTimes(2);
    expect(renderer.setSize).toHaveBeenCalledTimes(2);
    resizeSceneRenderer(renderer, 390, 650, 2);
    expect(renderer.setPixelRatio).toHaveBeenCalledTimes(2);
  });

  it('falls back to safe positive values on incomplete input', () => {
    expect(scenePixelRatio(0, NaN, NaN)).toBe(1);
    expect(scenePixelRatio(500, 500, -1)).toBe(1);
  });
});
