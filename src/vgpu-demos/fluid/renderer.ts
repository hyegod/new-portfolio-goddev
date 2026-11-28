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
  ambient?: boolean;
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
  let cvTarget: Element | undefined;
  let isVisible = true;
  let cvSkipped = false;
  let started = false;
  let animationFrame = 0;
  let accumulator = 0;
  let previous = 0;

  const stopLoop = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  };

  const ambientFrameIntervalMs = options.ambient ? 1000 / 30 - 2 : 0;

  const tick = (now: number) => {
    animationFrame = 0;
    if (disposed || !isVisible || cvSkipped || document.hidden) return;
    const elapsedMs = now - previous;
    if (ambientFrameIntervalMs > 0 && elapsedMs < ambientFrameIntervalMs) {
      animationFrame = requestAnimationFrame(tick);
      return;
    }
    if (fluid && input && canvasSurface) {
      if (options.ambient) {
        // Single deterministic fluid step at ~30fps cuts Hero WebGPU compute/render load in half
        stepFluid(fluid, input);
      } else {
        const fixed = fixedStepCount(accumulator, elapsedMs / 1000);
        accumulator = fixed.accumulator;
        for (let i = 0; i < fixed.steps; i++) {
          stepFluid(fluid, input);
        }
      }
      renderFluid(fluid, canvasSurface);
    }
    previous = now;
    animationFrame = requestAnimationFrame(tick);
  };

  const reconcileLoop = () => {
    if (!started || disposed) return;
    const shouldRun = isVisible && !cvSkipped && !document.hidden;
    if (shouldRun && !animationFrame) {
      previous = performance.now();
      accumulator = 0;
      animationFrame = requestAnimationFrame(tick);
    } else if (!shouldRun) {
      stopLoop();
    }
  };

  const onVisibilityChange = () => reconcileLoop();
  const onCvChange = (event: Event) => {
    cvSkipped = Boolean((event as Event & { skipped?: boolean }).skipped);
    reconcileLoop();
  };

  function dispose() {
    if (disposed) return;
    disposed = true;
    stopLoop();
    unsubscribeResize?.();
    intersection?.disconnect();
    cvTarget?.removeEventListener("contentvisibilityautostatechange", onCvChange);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
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
    // Soft painterly ambient fluid renders identically at 0.85x DPR while cutting fragment bandwidth ~55%
    canvasSurface = surface(gpu, options.canvas, {
      dpr: options.ambient ? [0.75, 0.9] : [1, 1.25],
    });
    fluid = createFluid(gpu);
    input = installStirInput(options.canvas, options.ambient);
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
    cvTarget =
      options.canvas.closest(
        ".deferred-section, .deferred-slogan, .deferred-works, .deferred-gallery, .deferred-footer, .deferred-lab"
      ) ?? options.canvas;
    cvTarget.addEventListener("contentvisibilityautostatechange", onCvChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (typeof IntersectionObserver !== "undefined") {
      intersection = new IntersectionObserver(
        (entries) => {
          isVisible = entries[entries.length - 1]?.isIntersecting ?? isVisible;
          reconcileLoop();
        },
        { threshold: 0 }
      );
      intersection.observe(options.canvas);
    }
    started = true;
    reconcileLoop();
  };

  const ready = initialize().catch((error: unknown) => {
    if (disposed) return;
    fail(error);
  });

  return { ready, dispose };
}
