// Free-roaming transparent full-viewport quadruped companions powered by vgpu/scene + FABRIK IK.
// Single transparent MSAA render pass (alphaMode: "premultiplied", no terrain/plinth/shadow-map).

import { clamp, type Vec3 } from "math";
import { mulberry32, type Mulberry32 } from "math/random";
import { draw, frame, geometry, surface, uniforms, type Draw, type Geometry, type Gpu, type Surface } from "vgpu";
import {
  orbitRig,
  perspective,
  rigPose,
  viewMatrices,
  type CameraMatrices,
  type Lens,
  type OrbitRig,
  type Pose,
} from "vgpu/scene";
import { instanceGeometry, type InstanceGeometry } from "vgpu/scene/gpu";

import { cameraRay } from "./camera";
import { buildPartMeshes, MESH_VERTEX_FLOATS, type MeshData } from "./meshes";
import { createRig, PART_MESHES, poseRig, publishRig, type PartMesh } from "./rig";
import { createRobot, placeRobot, stepRobot, type Robot } from "./robot";
import { createTerrain, HALF, type Terrain } from "./terrain";
import roamingPartsShader from "./roaming-parts.wgsl";
import roamingShadowShader from "./roaming-shadow.wgsl";

export interface RoamingRendererOptions {
  readonly canvas: HTMLCanvasElement;
  readonly count?: number;
}

const FIXED_DT = 1 / 60;
const MAX_CATCH_UP = 3;
const MIN_SEPARATION = 1.35;
const ROAM_LENS: Lens = { fov: 28, near: 0.2, far: 80 };
const SUN_DIRECTION = normalize([-0.42, 0.84, 0.34]);

interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function normalize(v: readonly [number, number, number]): [number, number, number] {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function meshGeometry(gpu: Gpu, mesh: MeshData): Geometry {
  return geometry(gpu, {
    buffers: [
      {
        data: mesh.vertices,
        stride: MESH_VERTEX_FLOATS * 4,
        attributes: {
          position: { format: "float32x3", offset: 0, location: 0 },
          normal: { format: "float32x3", offset: 12, location: 1 },
          material: { format: "float32", offset: 24, location: 2 },
        },
      },
    ],
    indices: mesh.indices,
  });
}

function createFlatTerrain(): Terrain {
  const terrain = createTerrain(1);
  terrain.heights.fill(0);
  return terrain;
}

export function createRoamingRenderer({
  canvas,
  count = 2,
}: RoamingRendererOptions) {
  const botCount = clamp(Math.round(count), 1, 4);

  let disposed = false;
  let started = false;
  let gpu: Gpu | undefined;
  let output: Surface | undefined;
  let rafId = 0;
  let unsubscribeResize: (() => void) | undefined;

  const terrain = createFlatTerrain();
  const robots: Robot[] = Array.from({ length: botCount }, (_, idx) => createRobot(idx));
  const randoms: Mulberry32[] = Array.from({ length: botCount }, (_, idx) =>
    mulberry32.create((idx + 1) * 0x9e3779b1)
  );
  const idleTimers = new Float32Array(botCount);
  const push = new Float32Array(botCount * 2);
  const shadowData = new Float32Array(botCount * 4);

  const bounds: WorldBounds = { minX: -5.2, maxX: 5.2, minZ: -3.4, maxZ: 3.4 };

  // Clean elevated 3/4 isometric viewport camera
  const orbit: OrbitRig = orbitRig({
    target: [0, 0, 0],
    yaw: 0,
    pitch: 0.9,
    distance: 17.5,
  });
  const lens: Lens = { ...ROAM_LENS };
  const pose: Pose = {
    position: new Float32Array(3),
    quaternion: new Float32Array(4),
  };
  const projection = new Float32Array(16);
  const matrices: CameraMatrices = {
    view: new Float32Array(16),
    viewProjection: new Float32Array(16),
  };

  let outputWidth = 1;
  let outputHeight = 1;
  let lastScrollY = typeof window !== "undefined" ? window.scrollY : 0;
  let lastPointerClient: [number, number] | null = null;
  let lastPointerTime = 0;

  const rayOrigin: Vec3 = [0, 0, 0];
  const rayDir: Vec3 = [0, 0, 0];

  function ndcToFloor(ndcX: number, ndcY: number): [number, number] | null {
    const aspect = outputWidth / Math.max(1, outputHeight);
    cameraRay(pose, lens, aspect, ndcX, ndcY, rayOrigin, rayDir);
    if (Math.abs(rayDir[1]) < 1e-4) return null;
    const t = -rayOrigin[1] / rayDir[1];
    if (t <= 0) return null;
    return [rayOrigin[0] + rayDir[0] * t, rayOrigin[2] + rayDir[2] * t];
  }

  function clientToFloor(clientX: number, clientY: number): [number, number] | null {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = 1 - ((clientY - rect.top) / rect.height) * 2;
    const hit = ndcToFloor(ndcX, ndcY);
    if (!hit) return null;
    return [
      clamp(hit[0], bounds.minX, bounds.maxX),
      clamp(hit[1], bounds.minZ, bounds.maxZ),
    ];
  }

  function updateBoundsFromCamera(): void {
    const safeLimit = HALF - 0.95;
    const bl = ndcToFloor(-0.88, -0.82);
    const br = ndcToFloor(0.88, -0.82);
    const tl = ndcToFloor(-0.88, 0.72);
    const tr = ndcToFloor(0.88, 0.72);
    if (!bl || !br || !tl || !tr) return;

    const minX = Math.max(-safeLimit, Math.max(bl[0], tl[0]));
    const maxX = Math.min(safeLimit, Math.min(br[0], tr[0]));
    const minZ = Math.max(-safeLimit, Math.max(tl[1], tr[1]));
    const maxZ = Math.min(safeLimit, Math.min(bl[1], br[1]));

    if (maxX - minX > 2.2) {
      bounds.minX = minX;
      bounds.maxX = maxX;
    }
    if (maxZ - minZ > 1.8) {
      bounds.minZ = minZ;
      bounds.maxZ = maxZ;
    }
  }

  function pickWaypoint(index: number): [number, number] {
    const rng = randoms[index]!;
    const spanX = bounds.maxX - bounds.minX;
    const spanZ = bounds.maxZ - bounds.minZ;

    // Slightly favor perimeter & lower-half zones so bots roam freely while rarely parking over center prose
    let x = bounds.minX + mulberry32.sample(rng) * spanX;
    let z = bounds.minZ + mulberry32.sample(rng) * spanZ;
    if (mulberry32.sample(rng) < 0.65) {
      if (mulberry32.sample(rng) < 0.5) {
        // Left or right perimeter lane
        const rightSide = mulberry32.sample(rng) < 0.5;
        x = rightSide
          ? bounds.maxX - mulberry32.sample(rng) * spanX * 0.28
          : bounds.minX + mulberry32.sample(rng) * spanX * 0.28;
      } else {
        // Lower corridor of the viewport
        z = bounds.maxZ - mulberry32.sample(rng) * spanZ * 0.34;
      }
    }
    return [clamp(x, bounds.minX, bounds.maxX), clamp(z, bounds.minZ, bounds.maxZ)];
  }

  function spawnBots(): void {
    for (let i = 0; i < botCount; i++) {
      const robot = robots[i]!;
      const startX =
        i % 2 === 0
          ? clamp(bounds.minX + 0.9 + i * 0.7, bounds.minX, bounds.maxX)
          : clamp(bounds.maxX - 0.9 - i * 0.5, bounds.minX, bounds.maxX);
      const startZ = clamp(
        bounds.maxZ - 0.65 - (i % 2) * 0.85,
        bounds.minZ,
        bounds.maxZ
      );
      const heading = i % 2 === 0 ? 0.65 : -0.75;
      placeRobot(robot, terrain, startX, startZ, heading);
      // Give the second robot the cobalt sensor payload & brighter LED eyes
      robot.palette = i === 1 ? 1 : 0;
      robot.phase = i * 0.37;
      const wp = pickWaypoint(i);
      robot.goal[0] = wp[0];
      robot.goal[1] = wp[1];
      robot.arrived = false;
      idleTimers[i] = 0.2 + i * 0.4;
    }
  }

  function summonNearestBot(clientX: number, clientY: number): void {
    const hit = clientToFloor(clientX, clientY);
    if (!hit) return;
    let nearest = 0;
    let bestDist = Infinity;
    for (let i = 0; i < botCount; i++) {
      const r = robots[i]!;
      const d = Math.hypot(r.position[0] - hit[0], r.position[2] - hit[1]);
      if (d < bestDist) {
        bestDist = d;
        nearest = i;
      }
    }
    const chosen = robots[nearest]!;
    chosen.goal[0] = hit[0];
    chosen.goal[1] = hit[1];
    chosen.arrived = false;
    idleTimers[nearest] = 0;
  }

  const onWindowPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    // Ignore UI controls, links, dialogs, and interactive 3D/WebGPU stages
    if (
      target?.closest(
        "a, button, input, textarea, select, dialog[open], canvas.touch-none, [role='tab'], [role='button']"
      )
    ) {
      return;
    }
    summonNearestBot(event.clientX, event.clientY);
  };

  const onWindowPointerMove = (event: PointerEvent) => {
    if (!event.isPrimary || event.pointerType !== "mouse") return;
    const now = event.timeStamp;
    if (lastPointerClient && now - lastPointerTime > 0 && now - lastPointerTime < 80) {
      const speed =
        Math.hypot(
          event.clientX - lastPointerClient[0],
          event.clientY - lastPointerClient[1]
        ) / Math.max(8, now - lastPointerTime);
      // If pointer whips rapidly right past a robot, playfully dodge aside
      if (speed > 1.8) {
        const hit = clientToFloor(event.clientX, event.clientY);
        if (hit) {
          for (let i = 0; i < botCount; i++) {
            const r = robots[i]!;
            const dx = r.position[0] - hit[0];
            const dz = r.position[2] - hit[1];
            const d = Math.hypot(dx, dz);
            if (d < 1.35) {
              const nx = d > 0.01 ? dx / d : 1;
              const nz = d > 0.01 ? dz / d : 0;
              r.goal[0] = clamp(r.position[0] + nx * 2.2, bounds.minX, bounds.maxX);
              r.goal[1] = clamp(r.position[2] + nz * 2.2, bounds.minZ, bounds.maxZ);
              r.arrived = false;
              idleTimers[i] = 0;
            }
          }
        }
      }
    }
    lastPointerClient = [event.clientX, event.clientY];
    lastPointerTime = now;
  };

  const onWindowScroll = () => {
    const sy = window.scrollY;
    const dy = sy - lastScrollY;
    lastScrollY = sy;
    if (Math.abs(dy) < 120) return;
    // Gently nudge idle bots toward a fresh roaming point along the scroll direction
    const zShift = clamp(dy * 0.0025, -1.6, 1.6);
    for (let i = 0; i < botCount; i++) {
      const r = robots[i]!;
      if (r.arrived && idleTimers[i]! > 0.4) {
        r.goal[1] = clamp(r.position[2] - zShift, bounds.minZ, bounds.maxZ);
        r.arrived = false;
        idleTimers[i] = 0;
      }
    }
  };

  function stepSimulation(): void {
    push.fill(0);
    for (let a = 0; a < botCount; a++) {
      for (let b = a + 1; b < botCount; b++) {
        const ra = robots[a]!;
        const rb = robots[b]!;
        const dx = rb.position[0] - ra.position[0];
        const dz = rb.position[2] - ra.position[2];
        const d = Math.hypot(dx, dz);
        if (d < MIN_SEPARATION) {
          const nx = d > 1e-4 ? dx / d : 1;
          const nz = d > 1e-4 ? dz / d : 0;
          const shift = (MIN_SEPARATION - d) * 0.45;
          push[a * 2] -= nx * shift;
          push[a * 2 + 1] -= nz * shift;
          push[b * 2] += nx * shift;
          push[b * 2 + 1] += nz * shift;
        }
      }
    }

    for (let i = 0; i < botCount; i++) {
      const robot = robots[i]!;
      let steerX = 0;
      let steerZ = 0;

      // Clamp active goal inside current viewport bounds (e.g., after window resize)
      robot.goal[0] = clamp(robot.goal[0], bounds.minX, bounds.maxX);
      robot.goal[1] = clamp(robot.goal[1], bounds.minZ, bounds.maxZ);

      const dx = robot.goal[0] - robot.position[0];
      const dz = robot.goal[1] - robot.position[2];
      const dist = Math.hypot(dx, dz);

      if (dist < 0.24) {
        robot.arrived = true;
        idleTimers[i] -= FIXED_DT;
        if (idleTimers[i]! <= 0) {
          const next = pickWaypoint(i);
          robot.goal[0] = next[0];
          robot.goal[1] = next[1];
          robot.arrived = false;
          idleTimers[i] = 1.6 + mulberry32.sample(randoms[i]!) * 2.8;
        }
      } else {
        const speedRamp = clamp(dist / 0.85, 0.28, 0.92);
        steerX = (dx / dist) * speedRamp;
        steerZ = (dz / dist) * speedRamp;
      }

      stepRobot(robot, {
        terrain,
        dt: FIXED_DT,
        pace: 0.92,
        steerX,
        steerZ,
        pushX: push[i * 2]!,
        pushZ: push[i * 2 + 1]!,
      });
    }
  }

  let rig: ReturnType<typeof createRig> | undefined;
  let instanced: [InstanceGeometry, Draw][] = [];
  let shadowGeo: Geometry | undefined;
  let shadowDraw: Draw | undefined;
  let cameraUniforms: ReturnType<typeof uniforms> | undefined;

  const cameraValues = {
    viewProjection: matrices.viewProjection,
    eye: pose.position,
    exposure: 1.08,
    sunDirection: SUN_DIRECTION,
    time: 0,
    sunColor: [2.75, 2.82, 2.94],
    pad0: 0,
    skyColor: [0.58, 0.65, 0.78],
    pad1: 0,
  };

  function updateCamera(): void {
    const aspect = outputWidth / Math.max(1, outputHeight);
    // Slightly adapt distance on narrower viewports so bots stay proportional & inside tile
    orbit.distance = aspect < 1.15 ? 20.5 : 17.5;
    rigPose(orbit, pose);
    perspective(ROAM_LENS, aspect, projection);
    viewMatrices(pose, projection, matrices);
    cameraUniforms?.set(cameraValues);
    updateBoundsFromCamera();
  }

  let accumulator = 0;
  let lastFrameAt = 0;
  let renderTime = 0;

  const stopLoop = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  const tick = (now: number) => {
    rafId = 0;
    if (disposed || document.hidden || !gpu || !output || !rig || !shadowGeo || !shadowDraw) {
      return;
    }
    const rawDt = lastFrameAt ? Math.min(0.08, (now - lastFrameAt) / 1000) : FIXED_DT;
    lastFrameAt = now;
    renderTime += rawDt;

    accumulator += rawDt;
    let steps = 0;
    while (accumulator >= FIXED_DT && steps < MAX_CATCH_UP) {
      stepSimulation();
      accumulator -= FIXED_DT;
      steps++;
    }
    if (steps === MAX_CATCH_UP) accumulator = 0;

    if (steps > 0) {
      poseRig(rig, robots, botCount);
      publishRig(rig, robots, botCount);
    }

    for (let i = 0; i < botCount; i++) {
      const r = robots[i]!;
      shadowData[i * 4] = r.position[0];
      shadowData[i * 4 + 1] = r.position[2];
      shadowData[i * 4 + 2] = r.heading.value;
      shadowData[i * 4 + 3] = 1.0;
    }
    shadowGeo.write(shadowData);

    cameraValues.time = renderTime;
    cameraUniforms?.set(cameraValues);

    const counts = instanced.map(([bridge]) => bridge.publish());
    const targetSurface = output;
    const drawShadow = shadowDraw;

    try {
      frame(gpu, (currentFrame) => {
        currentFrame.pass(
          { target: targetSurface, clear: [0, 0, 0, 0] },
          (pass) => {
            pass.draw(drawShadow, { instances: botCount });
            for (let i = 0; i < instanced.length; i++) {
              const countForMesh = counts[i]!;
              if (countForMesh > 0) {
                pass.draw(instanced[i]![1], { instances: countForMesh });
              }
            }
          }
        );
      });
    } catch {
      dispose();
      return;
    }

    rafId = requestAnimationFrame(tick);
  };

  const reconcileLoop = () => {
    if (!started || disposed) return;
    if (!document.hidden && !rafId) {
      lastFrameAt = performance.now();
      accumulator = 0;
      rafId = requestAnimationFrame(tick);
    } else if (document.hidden) {
      stopLoop();
    }
  };

  const onVisibilityChange = () => reconcileLoop();

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    stopLoop();
    unsubscribeResize?.();
    if (typeof window !== "undefined") {
      window.removeEventListener("pointerdown", onWindowPointerDown);
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("scroll", onWindowScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
    gpu?.dispose();
  }

  const initialize = async () => {
    const { init } = await import("vgpu");
    if (disposed) return;
    const nextGpu = await init({ label: "goddev-roaming-bots" });
    if (disposed) {
      nextGpu.dispose();
      return;
    }

    gpu = nextGpu;
    output = surface(gpu, canvas, {
      alphaMode: "premultiplied",
      depth: true,
      msaa: true,
      dpr: [1, 1.35],
      clearColor: [0, 0, 0, 0],
      label: "roaming-bots-surface",
    });

    outputWidth = output.size[0];
    outputHeight = output.size[1];

    cameraUniforms = uniforms(gpu, cameraValues);
    rig = createRig(botCount);
    const partMeshes = buildPartMeshes();

    instanced = PART_MESHES.map((mesh: PartMesh): [InstanceGeometry, Draw] => {
      const bridge = instanceGeometry(gpu!, rig!.collections[mesh], {
        mesh: meshGeometry(gpu!, partMeshes[mesh]),
      });
      const colorDraw = draw(gpu!, {
        shader: roamingPartsShader,
        geometry: bridge.geometry,
        targets: [output!],
        cull: "back",
        set: { camera: cameraUniforms! },
        label: `roam.${mesh}`,
      });
      return [bridge, colorDraw];
    });

    shadowGeo = geometry(gpu, {
      buffers: [
        {
          data: shadowData,
          stride: 16,
          stepMode: "instance",
          attributes: {
            body: { format: "float32x4", offset: 0, location: 0 },
          },
        },
      ],
      vertexCount: 4,
      topology: "triangle-strip",
      label: "roam.shadow",
    });

    shadowDraw = draw(gpu, {
      shader: roamingShadowShader,
      geometry: shadowGeo,
      targets: [output],
      blend: "premultiplied",
      depth: { write: false, compare: "less-equal" },
      cull: "none",
      set: { camera: cameraUniforms },
      label: "roam.shadow.draw",
    });

    updateCamera();
    spawnBots();
    poseRig(rig, robots, botCount);
    publishRig(rig, robots, botCount);

    unsubscribeResize = output.onResize(({ width, height }) => {
      outputWidth = width;
      outputHeight = height;
      updateCamera();
    });

    window.addEventListener("pointerdown", onWindowPointerDown, { passive: true });
    window.addEventListener("pointermove", onWindowPointerMove, { passive: true });
    window.addEventListener("scroll", onWindowScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    started = true;
    reconcileLoop();
  };

  const ready = initialize().catch((error: unknown) => {
    if (!disposed) {
      dispose();
      throw error;
    }
  });

  return { ready, dispose };
}
