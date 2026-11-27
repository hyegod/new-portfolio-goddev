import { surface, type Gpu, type Surface } from "vgpu";

import { installStirInput } from "./pointer-input";
import {
  createFluid,
  prepareFluid,
  renderFluid,
  resizeFluid,
  stepFluid,
  type Fluid,
} from "./simulation";

const FIXED_STEP = 1 / 60;

interface RendererOptions {
  canvas: HTMLCanvasElement;
}

function fixedStepCount(accumulator: number, elapsed: number) {
  let next = accumulator + Math.min(elapsed, 1 / 30);
  let steps = 0;
  while (next >= FIXED_STEP && steps < 2) {
    next -= FIXED_STEP;
    steps++;
  }
  return { steps, accumulator: steps === 2 ? 0 : next };
}

export function createRenderer(options: RendererOptions) {
  let disposed = false;
  let gpu: Gpu | undefined;
  let canvasSurface: Surface | undefined;
  let fluid: Fluid | undefined;
  let input: ReturnType<typeof installStirInput> | undefined;
  let intersection: IntersectionObserver | undefined;
  let unsubscribeResize: (() => void) | undefined;
  let isVisible = true;
  let animationFrame = 0;
  let accumulator = 0;
  let previous = 0;

  const tick = (now: number) => {
    if (disposed) return;
    if (isVisible && !document.hidden && fluid && input && canvasSurface) {
      const fixed = fixedStepCount(accumulator, (now - previous) / 1000);
      accumulator = fixed.accumulator;
      for (let i = 0; i < fixed.steps; i++) {
        stepFluid(fluid, input);
      }
      renderFluid(fluid, canvasSurface);
    }
    // Always reset the clock while hidden so visibility changes never catch up.
    previous = now;
    animationFrame = requestAnimationFrame(tick);
  };

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    unsubscribeResize?.();
    intersection?.disconnect();
    input?.dispose();
    gpu?.dispose();
  }

  function fail(error: unknown): never {
    dispose();
    throw error;
  }

  const initialize = async () => {
    const { init } = await import("vgpu");
    if (disposed) return;
    const nextGpu = await init();
    if (disposed) {
      nextGpu.dispose();
      return;
    }
    gpu = nextGpu;
    canvasSurface = surface(gpu, options.canvas, { dpr: [1, 1.5] });
    fluid = createFluid(gpu);
    input = installStirInput(options.canvas);
    await prepareFluid(fluid, canvasSurface);
    if (disposed) return;
    unsubscribeResize = canvasSurface.onResize(() => {
      if (disposed || !fluid || !canvasSurface) return;
      try {
        resizeFluid(fluid, canvasSurface);
      } catch (error) {
        fail(error);
      }
    });
    if (typeof IntersectionObserver !== "undefined") {
      intersection = new IntersectionObserver(
        (entries) => {
          isVisible = entries[entries.length - 1]?.isIntersecting ?? isVisible;
        },
        { threshold: 0 }
      );
      intersection.observe(options.canvas);
    }
    previous = performance.now();
    animationFrame = requestAnimationFrame(tick);
  };

  const ready = initialize().catch((error: unknown) => {
    if (disposed) return;
    fail(error);
  });

  return { ready, dispose };
}
