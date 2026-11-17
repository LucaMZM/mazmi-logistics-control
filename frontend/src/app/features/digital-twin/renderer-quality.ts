import type { WebGLRenderer } from 'three';

/** Upper bound for a single scene's drawing buffer, not an FPS measurement. */
export const SCENE_PIXEL_BUDGET = 2_500_000;

/**
 * Limit GPU fill rate on Retina displays while preserving the CSS-sized canvas.
 * Recalculate on resize because a 3D scene can move from desktop to mobile.
 */
export function scenePixelRatio(width: number, height: number, deviceRatio: number): number {
  const w = Number.isFinite(width) && width > 0 ? width : 1;
  const h = Number.isFinite(height) && height > 0 ? height : 1;
  const dpr = Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
  const detailCap = w < 700 ? 1.25 : 1.5;
  return Math.min(dpr, detailCap, Math.sqrt(SCENE_PIXEL_BUDGET / (w * h)));
}

/** Resize after adjusting the pixel ratio so the drawing buffer stays bounded. */
export function resizeSceneRenderer(
  renderer: Pick<WebGLRenderer, 'getPixelRatio' | 'setPixelRatio' | 'setSize'>,
  width: number,
  height: number,
  deviceRatio: number,
): void {
  const ratio = scenePixelRatio(width, height, deviceRatio);
  if (Math.abs(renderer.getPixelRatio() - ratio) > 0.001) {
    renderer.setPixelRatio(ratio);
  }
  renderer.setSize(width, height);
}
