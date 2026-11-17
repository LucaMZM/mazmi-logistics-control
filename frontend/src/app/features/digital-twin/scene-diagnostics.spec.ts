import { describe, expect, it } from 'vitest';
import { readSceneDiagnostics } from './scene-diagnostics';

describe('3D renderer diagnostic snapshots', () => {
  it('reads the previous frame and drawing-buffer dimensions without rendering', () => {
    let renderCalls = 0;
    const fake = {
      info: {
        render: { calls: 84, triangles: 9400 },
        memory: { geometries: 32, textures: 5 },
      },
      domElement: { width: 1600, height: 900 },
      getPixelRatio: () => 1.25,
      render: () => {
        renderCalls++;
      },
    };
    const snapshot = readSceneDiagnostics(fake as never);
    expect(snapshot).toEqual({
      drawCalls: 84,
      triangles: 9400,
      geometryCount: 32,
      textureCount: 5,
      pixelRatio: 1.25,
      bufferWidth: 1600,
      bufferHeight: 900,
    });
    expect(renderCalls).toBe(0);
  });

  it('returns new immutable-value snapshots when the renderer counters change', () => {
    const fake = {
      info: {
        render: { calls: 12, triangles: 100 },
        memory: { geometries: 7, textures: 1 },
      },
      domElement: { width: 1000, height: 600 },
      getPixelRatio: () => 1,
    };
    const first = readSceneDiagnostics(fake as never);
    fake.info.render.calls = 25;
    const second = readSceneDiagnostics(fake as never);
    expect(first.drawCalls).toBe(12);
    expect(second.drawCalls).toBe(25);
  });
});
