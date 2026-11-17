import type { WebGLRenderer } from 'three';

export interface SceneDiagnostics {
  drawCalls: number;
  triangles: number;
  geometryCount: number;
  textureCount: number;
  pixelRatio: number;
  bufferWidth: number;
  bufferHeight: number;
}

/**
 * An on-demand snapshot of the most recently rendered frame.
 * No extra WebGL frame is rendered, and this is not an FPS or GPU-memory reading.
 */
export function readSceneDiagnostics(
  renderer: Pick<WebGLRenderer, 'info' | 'domElement' | 'getPixelRatio'>,
): SceneDiagnostics {
  const { render, memory } = renderer.info;
  return {
    drawCalls: render.calls,
    triangles: render.triangles,
    geometryCount: memory.geometries,
    textureCount: memory.textures,
    pixelRatio: renderer.getPixelRatio(),
    bufferWidth: renderer.domElement.width,
    bufferHeight: renderer.domElement.height,
  };
}
