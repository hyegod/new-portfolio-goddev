import type { Gpu, Target } from "vgpu";
import type { StirInput } from "./pointer-input";
import advectVelocityWgsl from "./advect-velocity.wgsl";
import curlWgsl from "./curl.wgsl";
import vorticityWgsl from "./vorticity.wgsl";
import divergenceWgsl from "./divergence.wgsl";
import pressureWgsl from "./pressure.wgsl";
import projectWgsl from "./project.wgsl";
import advectDyeWgsl from "./advect-dye.wgsl";
import displayWgsl from "./display.wgsl";
import { compute, effect, frame, pingPongStorage, storage } from "vgpu";

// Square isotropic grids (exact multiples of 8x8 workgroup) paired with cover UV mapping
// in display.wgsl & pointer-input.ts so vortices stay perfectly circular on desktop, tablet & mobile.
const GRID_SIZE = [104, 104] as const;
const DYE_SIZE = [GRID_SIZE[0] * 4, GRID_SIZE[1] * 4] as const;
const GRID_GROUPS = [GRID_SIZE[0] / 8, GRID_SIZE[1] / 8] as const;
const DYE_GROUPS = [DYE_SIZE[0] / 8, DYE_SIZE[1] / 8] as const;
const CELLS = GRID_SIZE[0] * GRID_SIZE[1];
const DYE_CELLS = DYE_SIZE[0] * DYE_SIZE[1];

export function createFluid(gpu: Gpu) {
  const allocated: object[] = [];
  try {
    const velocity = pingPongStorage(gpu, CELLS * 8);
    allocated.push(velocity.read, velocity.write);
    const dye = pingPongStorage(gpu, DYE_CELLS * 16);
    allocated.push(dye.read, dye.write);
    const pressure = pingPongStorage(gpu, CELLS * 4);
    allocated.push(pressure.read, pressure.write);
    const divergence = storage(gpu, CELLS * 4, "read-write");
    allocated.push(divergence);
    const curl = storage(gpu, CELLS * 4, "read-write");
    allocated.push(curl);
    const passes = createPasses(gpu);
    return {
      gpu,
      velocity,
      dye,
      pressure,
      divergence,
      curl,
      passes,
      outputSize: [1280, 720] as [number, number],
      step: 0,
      lastInputStep: -1000,
    };
  } catch (error) {
    for (const buffer of allocated) {
      destroyBuffer(buffer);
    }
    throw error;
  }
}

export type Fluid = ReturnType<typeof createFluid>;

export function destroyFluid(fluid: Fluid): void {
  const buffers = [
    fluid.velocity.read,
    fluid.velocity.write,
    fluid.dye.read,
    fluid.dye.write,
    fluid.pressure.read,
    fluid.pressure.write,
    fluid.divergence,
    fluid.curl,
  ];
  for (const buffer of buffers) {
    destroyBuffer(buffer);
  }
}

function destroyBuffer(buffer: object) {
  (buffer as { destroy(): void }).destroy();
}

function createPasses(gpu: Gpu) {
  const withGrid = (shader: typeof advectVelocityWgsl) =>
    compute(gpu, shader, {
      set: { grid: { size: GRID_SIZE, dye_size: DYE_SIZE } },
    });
  return {
    advectVelocity: withGrid(advectVelocityWgsl),
    curl: withGrid(curlWgsl),
    vorticity: withGrid(vorticityWgsl),
    divergence: withGrid(divergenceWgsl),
    pressure: withGrid(pressureWgsl),
    project: withGrid(projectWgsl),
    advectDye: withGrid(advectDyeWgsl),
    display: effect(gpu, displayWgsl),
  };
}

export async function prepareFluid(
  fluid: Fluid,
  output: Target
): Promise<void> {
  resizeFluid(fluid, output);
  await fluid.passes.display.compile({ colors: [output.format] });
}

export function resizeFluid(fluid: Fluid, output: Target): void {
  fluid.outputSize[0] = Math.max(1, output.size[0]);
  fluid.outputSize[1] = Math.max(1, output.size[1]);
  fluid.passes.display.set({ config: { output_size: output.size } });
}

export function stepFluid(fluid: Fluid, input?: StirInput): void {
  if (input?.active) fluid.lastInputStep = fluid.step;
  const dynamic = inputUniforms(fluid, input);
  const p = fluid.passes;

  p.advectVelocity
    .set({
      input: dynamic,
      src: fluid.velocity.read,
      dst: fluid.velocity.write,
    })
    .dispatch(GRID_GROUPS[0], GRID_GROUPS[1]);
  fluid.velocity.swap();

  // Confinement restores the small rotating details lost by semi-Lagrangian advection.
  p.curl
    .set({ velocity: fluid.velocity.read, curl: fluid.curl })
    .dispatch(GRID_GROUPS[0], GRID_GROUPS[1]);
  p.vorticity
    .set({
      src: fluid.velocity.read,
      curl: fluid.curl,
      dst: fluid.velocity.write,
    })
    .dispatch(GRID_GROUPS[0], GRID_GROUPS[1]);
  fluid.velocity.swap();

  p.divergence
    .set({ velocity: fluid.velocity.read, divergence: fluid.divergence })
    .dispatch(GRID_GROUPS[0], GRID_GROUPS[1]);
  for (let i = 0; i < 3; i++) {
    p.pressure
      .set({
        params: { decay: i === 0 ? 0.8 : 1 },
        src: fluid.pressure.read,
        divergence: fluid.divergence,
        dst: fluid.pressure.write,
      })
      .dispatch(GRID_GROUPS[0], GRID_GROUPS[1]);
    fluid.pressure.swap();
  }

  p.project
    .set({
      src: fluid.velocity.read,
      pressure: fluid.pressure.read,
      dst: fluid.velocity.write,
    })
    .dispatch(GRID_GROUPS[0], GRID_GROUPS[1]);
  fluid.velocity.swap();

  p.advectDye
    .set({
      input: dynamic,
      src: fluid.dye.read,
      velocity: fluid.velocity.read,
      dst: fluid.dye.write,
    })
    .dispatch(DYE_GROUPS[0], DYE_GROUPS[1]);
  fluid.dye.swap();
  fluid.step++;
  input?.consumeStep();
}

export function renderFluid(fluid: Fluid, output: Target): void {
  fluid.passes.display.set({ dye: fluid.dye.read });
  frame(fluid.gpu, (currentFrame) => {
    currentFrame.pass(output, fluid.passes.display);
  });
}

function inputUniforms(fluid: Fluid, input?: StirInput) {
  const time = fluid.step / 60;
  const viewAspect = fluid.outputSize[0] / Math.max(1, fluid.outputSize[1]);
  const [a, b] = idleEmitters(fluid.step, viewAspect);
  const sinceInput = fluid.step - fluid.lastInputStep;
  const idle =
    sinceInput < 90 ? 0.15 : 0.15 + 0.85 * Math.min(1, (sinceInput - 90) / 60);
  const ramp = Math.min(1, (fluid.step + 1) / 24);
  let pointerVelocity = input?.velocity ?? ([0, 0] as [number, number]);
  if (input?.active && Math.hypot(...pointerVelocity) < 0.02) {
    pointerVelocity = [0.14 * Math.cos(time * 5), 0.14 * Math.sin(time * 5)];
  }
  const speed = Math.hypot(...pointerVelocity);
  const direction =
    speed > 1e-4
      ? [pointerVelocity[0] / speed, pointerVelocity[1] / speed]
      : [0, 0];
  // Scale emitter radius slightly with visible cover slice so plumes never turn blobby on narrow phones
  const visMin = viewAspect < 1 ? viewAspect : 1 / viewAspect;
  const radiusScale = Math.max(0.55, Math.min(1.0, visMin * 1.15));
  return {
    step: fluid.step,
    pointer_active: input?.active ? 1 : 0,
    pointer_from: input?.from ?? [0.5, 0.5],
    pointer_to: input?.to ?? [0.5, 0.5],
    pointer_velocity: pointerVelocity,
    // GODDEV dye channels: R = deep architectural ink, G = survey ice highlight, B = Electric Cobalt.
    pointer_color: [
      0.22 + 0.52 * Math.abs(direction[0]!),
      0.32 + 0.52 * (0.5 + 0.5 * direction[1]!),
      1,
      1,
    ],
    idle_a: [...a, ramp * idle, 0.0024 * radiusScale],
    idle_b: [...b, ramp * idle, 0.0021 * radiusScale],
  };
}

function idleEmitters(
  step: number,
  viewAspect: number
): [[number, number], [number, number]] {
  const t = step / 60;
  // Keep both emitters orbiting inside the visible cover-cropped region on portrait, tablet, and desktop
  const visX = viewAspect < 1 ? viewAspect : 1;
  const visY = viewAspect > 1 ? 1 / viewAspect : 1;
  return [
    [
      0.5 + 0.28 * visX * Math.sin(0.73 * t),
      0.5 + 0.24 * visY * Math.sin(1.09 * t + 0.4),
    ],
    [
      0.5 + 0.26 * visX * Math.sin(0.61 * t + Math.PI),
      0.5 + 0.24 * visY * Math.sin(0.97 * t + 2.1),
    ],
  ];
}
