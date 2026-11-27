import type { Vec3 } from "math";
import { clock, frameLoop, surface, type Gpu, type Surface } from "vgpu";
import { orbitRig, smoothRig, type OrbitRig } from "vgpu/scene";

import { applyView, cameraRay, followRobot, VIEWS } from "./camera";
import {
  advance,
  clearDestination,
  createColony,
  DEFAULT_PRESET,
  DEFAULT_SEED,
  PRESETS,
  reset,
  setDestination,
  step,
  type Colony,
  type PresetName,
} from "./colony";
import { installInput, isEditTool, type GardenInput, type Tool } from "./input";
import { createPipeline, type BrushOverlay, type GardenPipeline } from "./pipeline";
import { raycast } from "./terrain";
import { createToolbar, type Toolbar } from "./toolbar";

interface RendererOptions {
  readonly canvas: HTMLCanvasElement;
  readonly container?: HTMLElement;
}

export interface Settings {
  preset: PresetName;
  robots: number;
  seed: number;
  paused: boolean;
  pace: number;
  tool: Tool;
  radius: number;
  strength: number;
  follow: boolean;
  autoOrbit: boolean;
  debug: boolean;
}

const IDLE_ORBIT_SPEED = 0.05;
const CAMERA_TIME_CONSTANT = 0.12;
export const REDUCED_PACE = 0.45;
const REDUCED_TIME_SCALE = 0.3;

export function createRenderer({
  canvas,
  container = canvas.parentElement ?? undefined,
}: RendererOptions) {
  let disposed = false;
  let failed = false;
  let gpu: Gpu | undefined;
  let output: Surface | undefined;
  let colony: Colony | undefined;
  let pipeline: GardenPipeline | undefined;
  let input: GardenInput | undefined;
  let toolbar: Toolbar | undefined;
  let loop: { stop(): void } | undefined;
  let intersection: IntersectionObserver | undefined;
  let unsubscribeResize: (() => void) | undefined;
  let isVisible = true;

  const goal: OrbitRig = orbitRig(VIEWS[DEFAULT_PRESET]);
  const current: OrbitRig = orbitRig(VIEWS[DEFAULT_PRESET]);
  const motion =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : undefined;
  let reducedMotion = motion?.matches ?? false;
  let onMotionChange: ((event: MediaQueryListEvent) => void) | undefined;

  const hoverTarget: HTMLElement = container ?? canvas;
  let hovered = false;
  const onPointerEnter = () => {
    hovered = true;
  };
  const onPointerLeave = () => {
    hovered = false;
  };
  const onWindowBlur = () => input?.cancel();

  let settingsRef: Settings | undefined;

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    for (const cleanup of [
      () => loop?.stop(),
      () => unsubscribeResize?.(),
      () => intersection?.disconnect(),
      () => onMotionChange && motion?.removeEventListener("change", onMotionChange),
      () => hoverTarget.removeEventListener("pointerenter", onPointerEnter),
      () => hoverTarget.removeEventListener("pointerleave", onPointerLeave),
      () => window.removeEventListener("blur", onWindowBlur),
      () => input?.dispose(),
      () => toolbar?.dispose(),
      () => gpu?.dispose(),
    ]) {
      try {
        cleanup();
      } catch {
        // Best-effort cleanup
      }
    }
  }

  function fail(error: unknown): never {
    failed = true;
    dispose();
    throw error;
  }

  function guard<T>(action: () => T): T {
    try {
      return action();
    } catch (error) {
      return fail(error);
    }
  }

  function pixelRatio(): number {
    return output ? output.size[1] / Math.max(1, canvas.clientHeight) : 1;
  }

  function aspect(): number {
    return output && output.size[1] > 0 ? output.size[0] / output.size[1] : 16 / 9;
  }

  const rayOrigin: Vec3 = [0, 0, 0];
  const rayDirection: Vec3 = [0, 0, 0];
  const rayHit: Vec3 = [0, 0, 0];
  function pick(clientX: number, clientY: number, out: [number, number]): boolean {
    if (!pipeline || !colony || !output) return false;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = 1 - ((clientY - rect.top) / rect.height) * 2;
    cameraRay(
      pipeline.camera.pose,
      pipeline.lens,
      output.size[0] / output.size[1],
      ndcX,
      ndcY,
      rayOrigin,
      rayDirection
    );
    if (!raycast(colony.terrain, rayOrigin, rayDirection, rayHit)) return false;
    out[0] = rayHit[0];
    out[1] = rayHit[2];
    return true;
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
    output = surface(gpu, canvas, { dpr: [1, 1.75] });
    const garden = createColony({
      seed: DEFAULT_SEED,
      count: PRESETS[DEFAULT_PRESET].count,
    });
    colony = garden;
    pipeline = createPipeline(gpu, garden, output.size);
    const settings: Settings = {
      preset: DEFAULT_PRESET,
      robots: garden.count,
      seed: DEFAULT_SEED,
      paused: false,
      pace: reducedMotion ? REDUCED_PACE : 1,
      tool: "orbit",
      radius: garden.brush.radius,
      strength: garden.brush.strength,
      follow: false,
      autoOrbit: !reducedMotion,
      debug: false,
    };
    settingsRef = settings;
    garden.pace = settings.pace;

    const beforeStep = () => {
      const pressed = input?.cursor.pressed ?? false;
      garden.brush.mode = settings.tool === "lower" ? "lower" : "elevate";
      garden.brush.active =
        (settings.tool === "elevate" || settings.tool === "lower") && pressed;
      if (input) {
        garden.brush.x = input.cursor.x;
        garden.brush.z = input.cursor.z;
      }
      garden.brush.radius = settings.radius;
      garden.brush.strength = settings.strength;
    };

    const setTool = (tool: Tool) => {
      if (tool === settings.tool) return;
      settings.tool = tool;
      input?.cancel();
      toolbar?.setTool(tool);
      if (isEditTool(tool)) copyRig(goal, current);
    };

    input = installInput(canvas, goal, {
      tool: () => settings.tool,
      pick,
      onDestination: (x, z) => guard(() => setDestination(garden, x, z)),
      onTool: setTool,
      onPause: () => {
        settings.paused = !settings.paused;
        garden.paused = settings.paused;
      },
      onStep: () =>
        guard(() => {
          settings.paused = true;
          garden.paused = true;
          beforeStep();
          step(garden);
        }),
    });

    if (container) {
      const touch =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches;
      toolbar = createToolbar(container, {
        tool: settings.tool,
        radius: settings.radius,
        strength: settings.strength,
        touch,
        onTool: setTool,
        onRadius: (radius) => {
          settings.radius = radius;
        },
        onStrength: (strength) => {
          settings.strength = strength;
        },
        onClearDestination: () => guard(() => clearDestination(garden)),
      });
    }

    window.addEventListener("blur", onWindowBlur);
    hoverTarget.addEventListener("pointerenter", onPointerEnter);
    hoverTarget.addEventListener("pointerleave", onPointerLeave);
    onMotionChange = (event) => {
      reducedMotion = event.matches;
      settings.autoOrbit = !reducedMotion;
      settings.pace = reducedMotion ? REDUCED_PACE : 1;
      garden.pace = settings.pace;
    };
    motion?.addEventListener("change", onMotionChange);

    if (typeof IntersectionObserver !== "undefined") {
      intersection = new IntersectionObserver(
        (entries) => {
          isVisible = entries[entries.length - 1]?.isIntersecting ?? isVisible;
        },
        { threshold: 0 }
      );
      intersection.observe(canvas);
    }

    let framed = false;
    unsubscribeResize = output.onResize(() =>
      guard(() => {
        if (!output || !pipeline) return;
        pipeline.resize(output.size, pixelRatio());
        toolbar?.layout(container?.clientWidth ?? canvas.clientWidth);
        if (!framed && output.size[0] > 0 && output.size[1] > 0) {
          framed = true;
          applyView(goal, settings.preset, aspect());
          applyView(current, settings.preset, aspect());
        }
      })
    );

    const ticks = clock(gpu);
    const brush: BrushOverlay = [0, 0, 1, 0];
    let renderTime = 0;

    loop = frameLoop(gpu, (currentFrame) => {
      if (!isVisible || document.hidden) return;
      guard(() => {
        if (disposed || !output || !pipeline || !input) return;
        const dt = Math.min(ticks.deltaTime, 0.1);
        const { cursor } = input;

        advance(garden, dt, beforeStep);

        const editing = isEditTool(settings.tool);
        if (!editing && settings.follow && garden.count > 0) {
          followRobot(goal, garden.robots[0]!);
        }
        if (
          !editing &&
          settings.autoOrbit &&
          !hovered &&
          !input.engaged &&
          document.activeElement !== canvas
        ) {
          goal.yaw += dt * IDLE_ORBIT_SPEED;
        }
        smoothRig(current, goal, dt, {
          timeConstant: reducedMotion ? 0.02 : CAMERA_TIME_CONSTANT,
        });
        pipeline.updateCamera(current);

        const aiming = editing && (cursor.visible || (toolbar?.adjusting ?? false));
        brush[0] = cursor.x;
        brush[1] = cursor.z;
        brush[2] = settings.radius;
        brush[3] = !aiming
          ? 0
          : settings.tool === "destination"
            ? 2
            : settings.tool === "lower"
              ? -1
              : 1;
        if (brush[3] === 2) brush[2] = 0.3;
        toolbar?.setDestination(garden.destination.active);
        toolbar?.setPaused(settings.paused);
        renderTime += dt * (reducedMotion ? REDUCED_TIME_SCALE : 1);
        pipeline.render(currentFrame, output, {
          time: renderTime,
          brush,
          debug: settings.debug,
        });
      });
    });
  };

  const ready = initialize().catch((error: unknown) => {
    if (disposed && !failed) return;
    fail(error);
  });

  return {
    ready,
    dispose,
    resetTerrain: () => {
      if (!colony || !settingsRef) return;
      reset(colony, settingsRef.seed, colony.count);
      input?.cancel();
      applyView(goal, settingsRef.preset, aspect());
    },
    toggleDebug: () => {
      if (!settingsRef) return false;
      settingsRef.debug = !settingsRef.debug;
      return settingsRef.debug;
    },
  };
}

function copyRig(out: OrbitRig, rig: OrbitRig): void {
  out.target.set(rig.target);
  out.pan.set(rig.pan);
  out.yaw = rig.yaw;
  out.pitch = rig.pitch;
  out.distance = rig.distance;
}
