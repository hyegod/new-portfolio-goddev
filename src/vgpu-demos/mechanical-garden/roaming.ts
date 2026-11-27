// Document-anchored free-roaming quadruped companions powered by vgpu/scene + FABRIK IK.
// Robots live on the webpage surface: scrolling down leaves them behind above the viewport,
// and after leaving view they naturally trot back into your current section from any screen edge.
// Single transparent MSAA render pass (alphaMode: "premultiplied", no terrain/plinth/shadow-map).

import { clamp, type Vec3 } from "math";
import { mulberry32, type Mulberry32 } from "math/random";
import {
  draw,
  frame,
  geometry,
  surface,
  uniforms,
  type Draw,
  type Geometry,
  type Gpu,
  type Surface,
} from "vgpu";
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
import {
  createRig,
  PART_MESHES,
  poseRig,
  publishRig,
  type PartMesh,
} from "./rig";
import { createRobot, placeRobot, stepRobot, type Robot } from "./robot";
import { createTerrain, type Terrain } from "./terrain";
import roamingPartsShader from "./roaming-parts.wgsl";
import roamingShadowShader from "./roaming-shadow.wgsl";

export interface RoamingRendererOptions {
  readonly canvas: HTMLCanvasElement;
  readonly count?: number;
}

const FIXED_DT = 1 / 60;
const MAX_CATCH_UP = 3;
const MIN_SEPARATION = 1.35;
/** Telephoto 3/4 isometric lens: uniform robot scale top-to-bottom + 1:1 lockstep with page scroll. */
const ROAM_LENS: Lens = { fov: 17, near: 0.2, far: 120 };
const SUN_DIRECTION = normalize([-0.42, 0.84, 0.34]);

/** NDC clearance past ±1.0 where robot body + contact shadow completely clear the viewport edge. */
const OFF_NDC_X = 1.1;
const OFF_NDC_Y = 1.12;
/** Exact NDC coordinate used when spawning just outside a viewport edge so bots trot in promptly without popping. */
const SPAWN_NDC_X = 1.09;
const SPAWN_NDC_Y = 1.11;

function normalize(
  v: readonly [number, number, number]
): [number, number, number] {
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

/** Shift a robot's entire world state along Z so feet, swing arcs, body, and goal ride scroll 1:1 with zero IK strain. */
function shiftRobotZ(robot: Robot, dz: number): void {
  robot.position[2] += dz;
  robot.goal[1] += dz;
  for (let i = 0; i < robot.feet.length; i++) {
    const foot = robot.feet[i]!;
    foot.position[2] += dz;
    foot.start[2] += dz;
    foot.landing[2] += dz;
  }
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
  const robots: Robot[] = Array.from({ length: botCount }, (_, idx) =>
    createRobot(idx)
  );
  const randoms: Mulberry32[] = Array.from({ length: botCount }, (_, idx) =>
    mulberry32.create((idx + 1) * 0x9e3779b1)
  );
  const idleTimers = new Float32Array(botCount);
  const offscreenTime = new Float32Array(botCount);
  const respawnDelay = new Float32Array(botCount);
  const returning = new Uint8Array(botCount);
  const push = new Float32Array(botCount * 2);
  const shadowData = new Float32Array(botCount * 4);

  let worldZPerPixel = 0.012;

  // Telephoto 3/4 isometric viewport camera
  const orbit: OrbitRig = orbitRig({
    target: [0, 0, 0],
    yaw: 0,
    pitch: 0.92,
    distance: 29.0,
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
  let lastFrameScrollY = typeof window !== "undefined" ? window.scrollY : 0;
  let scrollSpeedPx = 0;
  let lastPointerClient: [number, number] | null = null;
  let lastPointerTime = 0;

  const rayOrigin: Vec3 = [0, 0, 0];
  const rayDir: Vec3 = [0, 0, 0];
  const ndcOut: [number, number] = [0, 0];

  function ndcToFloor(ndcX: number, ndcY: number): [number, number] | null {
    const aspect = outputWidth / Math.max(1, outputHeight);
    cameraRay(pose, lens, aspect, ndcX, ndcY, rayOrigin, rayDir);
    if (Math.abs(rayDir[1]) < 1e-4) return null;
    const t = -rayOrigin[1] / rayDir[1];
    if (t <= 0) return null;
    return [rayOrigin[0] + rayDir[0] * t, rayOrigin[2] + rayDir[2] * t];
  }

  /** Project a floor point (x, 0, z) into exact screen NDC [-1, 1]^2 (handles perspective trapezoid exactly). */
  function projectToNdc(x: number, z: number): [number, number] {
    const m = matrices.viewProjection;
    const cx = m[0]! * x + m[8]! * z + m[12]!;
    const cy = m[1]! * x + m[9]! * z + m[13]!;
    const cw = m[3]! * x + m[11]! * z + m[15]!;
    if (cw <= 1e-4) {
      ndcOut[0] = 0;
      ndcOut[1] = -99;
      return ndcOut;
    }
    ndcOut[0] = cx / cw;
    ndcOut[1] = cy / cw;
    return ndcOut;
  }

  /** How far outside the padded screen border a robot sits in NDC units (0 when visible or partially visible). */
  function offscreenNdcDistance(robot: Robot): number {
    const [nx, ny] = projectToNdc(robot.position[0], robot.position[2]);
    const dx = Math.max(0, Math.abs(nx) - OFF_NDC_X);
    const dy = Math.max(0, Math.abs(ny) - OFF_NDC_Y);
    return Math.hypot(dx, dy);
  }

  function isInsideView(robot: Robot): boolean {
    const [nx, ny] = projectToNdc(robot.position[0], robot.position[2]);
    return Math.abs(nx) <= 0.88 && Math.abs(ny) <= 0.86;
  }

  function clientToFloor(
    clientX: number,
    clientY: number
  ): [number, number] | null {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const ndcX = clamp(((clientX - rect.left) / rect.width) * 2 - 1, -0.84, 0.84);
    const ndcY = clamp(1 - ((clientY - rect.top) / rect.height) * 2, -0.82, 0.78);
    return ndcToFloor(ndcX, ndcY);
  }

  function updateScrollCalibration(): void {
    const topMid = ndcToFloor(0, 1.0);
    const botMid = ndcToFloor(0, -1.0);
    if (!topMid || !botMid) return;
    const worldSpanZ = Math.abs(botMid[1] - topMid[1]);
    const cssH = Math.max(
      1,
      canvas.getBoundingClientRect().height || window.innerHeight || 900
    );
    if (worldSpanZ > 1.0) {
      worldZPerPixel = worldSpanZ / cssH;
    }
  }

  /** Pick an organic visible floor waypoint directly in NDC space so margins are uniform at every aspect ratio. */
  function pickWaypoint(index: number): [number, number] {
    const rng = randoms[index]!;
    let nx = (mulberry32.sample(rng) * 2 - 1) * 0.78;
    let ny = -0.76 + mulberry32.sample(rng) * 1.44; // [-0.76, +0.68] (avoids top fixed navbar)

    // Slightly favor left/right lanes & lower half so center headlines stay clear while bots explore freely
    if (mulberry32.sample(rng) < 0.58) {
      if (mulberry32.sample(rng) < 0.54) {
        const rightSide = mulberry32.sample(rng) < 0.5;
        nx = rightSide
          ? 0.42 + mulberry32.sample(rng) * 0.36
          : -0.42 - mulberry32.sample(rng) * 0.36;
      } else {
        ny = -0.74 + mulberry32.sample(rng) * 0.44;
      }
    }
    return ndcToFloor(nx, ny) ?? [0, 0];
  }

  /** Occasionally let a settled bot stroll calmly off the left or right viewport margin. */
  function pickExitPoint(index: number): [number, number] {
    const rng = randoms[index]!;
    const goRight = mulberry32.sample(rng) < 0.5;
    const nx = goRight ? 1.24 : -1.24;
    const ny = -0.68 + mulberry32.sample(rng) * 1.3;
    return ndcToFloor(nx, ny) ?? [goRight ? 8 : -8, 0];
  }

  /**
   * Spawn a robot right outside the exact pixel edge of the current viewport (left, right, bottom, or top)
   * facing directly toward its inward target so it smoothly trots into view within ~0.4s.
   */
  function enterFromEdge(
    index: number,
    forcedTarget?: readonly [number, number],
    preferredEdge?: 0 | 1 | 2 | 3
  ): void {
    const robot = robots[index]!;
    const rng = randoms[index]!;

    let edge: 0 | 1 | 2 | 3;
    if (preferredEdge !== undefined) {
      edge = preferredEdge;
    } else {
      // Free entry from any edge: left (32%), right (32%), bottom (20%), top (16%)
      const roll = mulberry32.sample(rng);
      edge = roll < 0.32 ? 0 : roll < 0.64 ? 1 : roll < 0.84 ? 2 : 3;
    }

    const sampleSpawnForEdge = (e: 0 | 1 | 2 | 3): [number, number] => {
      if (e === 0) {
        // Left border
        const ny = -0.68 + mulberry32.sample(rng) * 1.28;
        return ndcToFloor(-SPAWN_NDC_X, ny) ?? [-7.2, 0];
      }
      if (e === 1) {
        // Right border
        const ny = -0.68 + mulberry32.sample(rng) * 1.28;
        return ndcToFloor(SPAWN_NDC_X, ny) ?? [7.2, 0];
      }
      if (e === 2) {
        // Bottom border
        const nx = (mulberry32.sample(rng) * 2 - 1) * 0.72;
        return ndcToFloor(nx, -SPAWN_NDC_Y) ?? [0, 5.4];
      }
      // Top border
      const nx = (mulberry32.sample(rng) * 2 - 1) * 0.72;
      return ndcToFloor(nx, SPAWN_NDC_Y) ?? [0, -6.6];
    };

    let spawn = sampleSpawnForEdge(edge);

    // Avoid spawning right on top of another robot
    for (let other = 0; other < botCount; other++) {
      if (other === index) continue;
      const r = robots[other]!;
      if (Math.hypot(r.position[0] - spawn[0], r.position[2] - spawn[1]) < 2.2) {
        edge = (((edge + 1) % 4) as 0 | 1 | 2 | 3);
        spawn = sampleSpawnForEdge(edge);
        break;
      }
    }

    // Determine inward target first so the robot spawns already facing smoothly toward its destination
    let target: [number, number];
    if (forcedTarget) {
      target = [forcedTarget[0], forcedTarget[1]];
    } else {
      let tnx = (mulberry32.sample(rng) * 2 - 1) * 0.68;
      let tny = -0.64 + mulberry32.sample(rng) * 1.2;
      if (edge === 0) tnx = -0.45 + mulberry32.sample(rng) * 0.75;
      if (edge === 1) tnx = 0.45 - mulberry32.sample(rng) * 0.75;
      if (edge === 2) tny = -0.42 + mulberry32.sample(rng) * 0.75;
      if (edge === 3) tny = 0.35 - mulberry32.sample(rng) * 0.75;
      target = ndcToFloor(tnx, tny) ?? [0, 0];
    }

    const heading = Math.atan2(target[0] - spawn[0], target[1] - spawn[1]);
    const savedPalette = robot.palette;
    const savedPhase = robot.phase;
    placeRobot(robot, terrain, spawn[0], spawn[1], heading);
    robot.palette = savedPalette;
    robot.phase = savedPhase;

    robot.goal[0] = target[0];
    robot.goal[1] = target[1];
    robot.arrived = false;
    returning[index] = 1;
    offscreenTime[index] = 0;
    idleTimers[index] = 1.4 + mulberry32.sample(rng) * 2.2;
    respawnDelay[index] = (index === 0 ? 0.95 : 2.15) + mulberry32.sample(rng) * 1.1;
  }

  function spawnBots(): void {
    for (let i = 0; i < botCount; i++) {
      const robot = robots[i]!;
      const rng = randoms[i]!;
      robot.palette = i === 1 ? 1 : 0;
      robot.phase = i * 0.37;
      if (i === 0) {
        // Start Bot 0 visibly roaming lower-left of initial section
        const start = ndcToFloor(-0.68, -0.58) ?? [-4.2, 2.8];
        const wp = pickWaypoint(i);
        const heading = Math.atan2(wp[0] - start[0], wp[1] - start[1]);
        placeRobot(robot, terrain, start[0], start[1], heading);
        robot.palette = 0;
        robot.goal[0] = wp[0];
        robot.goal[1] = wp[1];
        robot.arrived = false;
        returning[i] = 0;
        idleTimers[i] = 1.3 + mulberry32.sample(rng) * 1.5;
        respawnDelay[i] = 0.95 + mulberry32.sample(rng) * 0.65;
      } else {
        // Bot 1 trots gracefully onto the screen from the right edge right after boot
        enterFromEdge(i, undefined, i % 2 === 1 ? 1 : 0);
        respawnDelay[i] = 2.0 + mulberry32.sample(rng) * 1.1;
      }
    }
  }

  function closestEdgeForClient(clientX: number, clientY: number): 0 | 1 | 2 | 3 {
    const rect = canvas.getBoundingClientRect();
    const nx = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ny = 1 - ((clientY - rect.top) / Math.max(1, rect.height)) * 2;
    const dLeft = nx + 1;
    const dRight = 1 - nx;
    const dBot = ny + 1;
    const dTop = 1 - ny;
    const min = Math.min(dLeft, dRight, dBot, dTop);
    if (min === dLeft) return 0;
    if (min === dRight) return 1;
    if (min === dBot) return 2;
    return 3;
  }

  function summonNearestBot(clientX: number, clientY: number): void {
    const hit = clientToFloor(clientX, clientY);
    if (!hit) return;

    // Prefer a bot currently visible (or right at the viewport edge)
    let nearest = -1;
    let bestDist = Infinity;
    for (let i = 0; i < botCount; i++) {
      const r = robots[i]!;
      if (offscreenNdcDistance(r) > 0.16) continue;
      const d = Math.hypot(r.position[0] - hit[0], r.position[2] - hit[1]);
      if (d < bestDist) {
        bestDist = d;
        nearest = i;
      }
    }

    if (nearest >= 0) {
      const chosen = robots[nearest]!;
      chosen.goal[0] = hit[0];
      chosen.goal[1] = hit[1];
      chosen.arrived = false;
      idleTimers[nearest] = 0;
      return;
    }

    // All bots were left behind off-screen -> immediately trot one in from the closest screen edge
    enterFromEdge(0, hit, closestEdgeForClient(clientX, clientY));
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
    if (
      lastPointerClient &&
      now - lastPointerTime > 0 &&
      now - lastPointerTime < 80
    ) {
      const speed =
        Math.hypot(
          event.clientX - lastPointerClient[0],
          event.clientY - lastPointerClient[1]
        ) / Math.max(8, now - lastPointerTime);
      // If pointer whips rapidly right past a visible robot, playfully dodge aside
      if (speed > 1.8) {
        const hit = clientToFloor(event.clientX, event.clientY);
        if (hit) {
          for (let i = 0; i < botCount; i++) {
            const r = robots[i]!;
            if (offscreenNdcDistance(r) > 0.05) continue;
            const dx = r.position[0] - hit[0];
            const dz = r.position[2] - hit[1];
            const d = Math.hypot(dx, dz);
            if (d < 1.35) {
              const nx = d > 0.01 ? dx / d : 1;
              const nz = d > 0.01 ? dz / d : 0;
              r.goal[0] = r.position[0] + nx * 2.2;
              r.goal[1] = r.position[2] + nz * 2.2;
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
      const offNdc = offscreenNdcDistance(robot);

      if (returning[i] === 1) {
        if (isInsideView(robot)) {
          returning[i] = 0;
          offscreenTime[i] = 0;
        } else if (offNdc > 0.55) {
          // User scrolled briskly away while bot was still entering -> queue fresh entry after settling
          returning[i] = 0;
        }
      }

      if (offNdc > 0 && returning[i] === 0) {
        // Left behind on another part of the webpage; accumulate off-screen wait
        const paceBoost = offNdc > 0.8 ? 1.35 : 1.0;
        offscreenTime[i] += FIXED_DT * paceBoost;
        // Re-enter organically from any screen edge once scroll slows down
        if (offscreenTime[i]! >= respawnDelay[i]! && scrollSpeedPx < 1600) {
          enterFromEdge(i);
          continue;
        }
      } else if (offNdc === 0) {
        offscreenTime[i] = 0;
      }

      let steerX = 0;
      let steerZ = 0;
      const dx = robot.goal[0] - robot.position[0];
      const dz = robot.goal[1] - robot.position[2];
      const dist = Math.hypot(dx, dz);

      if (dist < 0.24) {
        robot.arrived = true;
        // Only pick new visible waypoints when on-screen; left-behind bots wait naturally for edge re-entry
        if (offNdc === 0) {
          idleTimers[i] -= FIXED_DT;
          if (idleTimers[i]! <= 0) {
            const rng = randoms[i]!;
            const next =
              mulberry32.sample(rng) < 0.16
                ? pickExitPoint(i)
                : pickWaypoint(i);
            robot.goal[0] = next[0];
            robot.goal[1] = next[1];
            robot.arrived = false;
            idleTimers[i] = 1.4 + mulberry32.sample(rng) * 2.5;
          }
        }
      } else {
        const speedRamp = clamp(dist / 0.75, 0.35, 1.0);
        steerX = (dx / dist) * speedRamp;
        steerZ = (dz / dist) * speedRamp;
      }

      stepRobot(robot, {
        terrain,
        dt: FIXED_DT,
        pace: returning[i] === 1 ? 1.32 : 1.18,
        steerX,
        steerZ,
        pushX: push[i * 2]!,
        pushZ: push[i * 2 + 1]!,
        unbounded: true,
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
    orbit.distance = aspect < 1.15 ? 33.0 : 29.0;
    rigPose(orbit, pose);
    perspective(ROAM_LENS, aspect, projection);
    viewMatrices(pose, projection, matrices);
    cameraUniforms?.set(cameraValues);
    updateScrollCalibration();
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
    if (
      disposed ||
      document.hidden ||
      !gpu ||
      !output ||
      !rig ||
      !shadowGeo ||
      !shadowDraw
    ) {
      return;
    }
    const rawDt = lastFrameAt
      ? Math.min(0.08, (now - lastFrameAt) / 1000)
      : FIXED_DT;
    lastFrameAt = now;
    renderTime += rawDt;

    // Anchor robots directly to the webpage document scroll every frame (syncs 1:1 with Lenis & native scroll)
    const currentScrollY = window.scrollY;
    const deltaScrollY = currentScrollY - lastFrameScrollY;
    lastFrameScrollY = currentScrollY;
    scrollSpeedPx =
      scrollSpeedPx * 0.75 +
      (Math.abs(deltaScrollY) / Math.max(0.008, rawDt)) * 0.25;

    let scrolled = false;
    if (Math.abs(deltaScrollY) > 0.01) {
      const deltaZ = -deltaScrollY * worldZPerPixel;
      for (let i = 0; i < botCount; i++) {
        shiftRobotZ(robots[i]!, deltaZ);
      }
      scrolled = true;
    }

    accumulator += rawDt;
    let steps = 0;
    while (accumulator >= FIXED_DT && steps < MAX_CATCH_UP) {
      stepSimulation();
      accumulator -= FIXED_DT;
      steps++;
    }
    if (steps === MAX_CATCH_UP) accumulator = 0;

    if (steps > 0 || scrolled) {
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
      lastFrameScrollY = window.scrollY;
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
    lastFrameScrollY = window.scrollY;

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

    window.addEventListener("pointerdown", onWindowPointerDown, {
      passive: true,
    });
    window.addEventListener("pointermove", onWindowPointerMove, {
      passive: true,
    });
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
