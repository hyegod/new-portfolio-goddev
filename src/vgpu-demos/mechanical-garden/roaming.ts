// Document-anchored free-roaming quadruped companions powered by vgpu/scene + FABRIK IK.
// - Scroll-anchored 1:1 on the webpage surface; left behind when scrolling and re-enters from any edge.
// - Hover reveals each bot's callsign HUD badge (`AXIS-01`, `DATUM-02`).
// - Click triggers 4 physical FABRIK IK tricks (`SALUTE BOW`, `HAPPY WIGGLE`, `SPRING HOP!`, `LIDAR SCAN · ZOOM`).
// - Click & drag lifts the robot into mid-air with frantically paddling legs & pendulum inertia;
//   releasing drops it under gravity with a suspension-squash + shake-it-off landing reaction & shockwave ring.

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
import {
  createRobot,
  placeRobot,
  poseAirborneRobot,
  RIDE_HEIGHT,
  stepRobot,
  type Robot,
  type RobotEmote,
} from "./robot";
import { createTerrain, type Terrain } from "./terrain";
import roamingPartsShader from "./roaming-parts.wgsl";
import roamingShadowShader from "./roaming-shadow.wgsl";

export type BotTrickKind = "bow" | "wiggle" | "hop" | "scan" | "land";

export interface RoamingBotMeta {
  readonly id: number;
  readonly name: string;
  readonly role: string;
}

export const ROAMING_BOTS: readonly RoamingBotMeta[] = [
  { id: 0, name: "AXIS-01", role: "STRUCTURAL SCOUT" },
  { id: 1, name: "DATUM-02", role: "LIDAR SURVEYOR" },
];

export interface BotScreenTelemetry {
  readonly index: number;
  readonly name: string;
  readonly role: string;
  /** True when the floating HUD tag should render (hovered, carried, falling, or performing a trick). */
  readonly visible: boolean;
  /** True while pointer is actively hovering this robot. */
  readonly hovered: boolean;
  /** Active trick kind when performing an interactive reaction, else null. */
  readonly trick: BotTrickKind | null;
  /** Short HUD callout text for the active trick or airlift state, else null. */
  readonly trickLabel: string | null;
  /** Viewport CSS px coordinates directly above the robot's chassis for its floating tag. */
  readonly labelX: number;
  readonly labelY: number;
  /** Viewport CSS px center of the robot's body. */
  readonly centerX: number;
  readonly centerY: number;
}

export interface BotTrickTrigger {
  readonly botIndex: number;
  readonly name: string;
  readonly trick: BotTrickKind;
  readonly label: string;
  readonly x: number;
  readonly y: number;
}

export interface RoamingRendererOptions {
  readonly canvas: HTMLCanvasElement;
  readonly count?: number;
  readonly onTelemetry?: (bots: readonly BotScreenTelemetry[]) => void;
  readonly onTrick?: (event: BotTrickTrigger) => void;
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

const HOVER_HIT_RADIUS_PX = 58;
const TOUCH_HIT_RADIUS_PX = 66;
const DRAG_THRESHOLD_PX = 7;
/** World height when lifted by the user (~70px clear floating air gap above the floor shadow). */
const LIFT_HEIGHT = 1.68;
const GRAVITY = 15.8;

const UI_INTERACTIVE_SELECTOR =
  "a, button, input, textarea, select, dialog[open], canvas.touch-none, [role='tab'], [role='button']";

const CLICK_TRICKS: readonly ("bow" | "wiggle" | "hop" | "scan")[] = [
  "bow",
  "wiggle",
  "hop",
  "scan",
];

const TRICK_CONFIG: Record<
  BotTrickKind,
  { readonly duration: number; readonly label: string }
> = {
  bow: { duration: 1.65, label: "SALUTE BOW" },
  wiggle: { duration: 1.75, label: "HAPPY WIGGLE" },
  hop: { duration: 1.25, label: "SPRING HOP!" },
  scan: { duration: 2.05, label: "LIDAR SCAN · ZOOM" },
  land: { duration: 1.35, label: "TOUCHDOWN · RECOVERING" },
};

interface ActiveTrick {
  kind: BotTrickKind;
  elapsed: number;
  duration: number;
  label: string;
  zoomStarted: boolean;
}

interface AirborneState {
  mode: "carried" | "falling";
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  heading: number;
  tiltRight: number;
  tiltForward: number;
  kickTime: number;
  targetX: number;
  targetZ: number;
}

interface PendingGrab {
  readonly botIndex: number;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  dragging: boolean;
}

function smoothstep01(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / Math.max(1e-5, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

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

/** Evaluate smooth kinematic emote offsets for an active trick (all solved through real 4-leg FABRIK IK). */
function evaluateTrickEmote(
  trick: ActiveTrick,
  out: {
    heightOffset: number;
    pitchOffset: number;
    rollOffset: number;
    footLift: number;
  }
): void {
  const u = clamp(trick.elapsed / Math.max(0.01, trick.duration), 0, 1);
  out.heightOffset = 0;
  out.pitchOffset = 0;
  out.rollOffset = 0;
  out.footLift = 0;

  if (trick.kind === "bow") {
    const enter = smoothstep01(0, 0.24, u);
    const exit = 1 - smoothstep01(0.72, 1.0, u);
    const env = enter * exit;
    const breath = Math.sin(trick.elapsed * 5.2) * 0.015 * env;
    out.heightOffset = -0.11 * env + breath;
    out.pitchOffset = -0.34 * env;
    return;
  }

  if (trick.kind === "wiggle") {
    const env = smoothstep01(0, 0.14, u) * (1 - smoothstep01(0.82, 1.0, u));
    const wave = Math.sin(trick.elapsed * 22.0);
    out.rollOffset = wave * 0.25 * env;
    out.heightOffset = (-0.055 + Math.abs(wave) * 0.025) * env;
    out.pitchOffset = (0.12 + Math.cos(trick.elapsed * 11.0) * 0.05) * env;
    return;
  }

  if (trick.kind === "hop") {
    if (u < 0.24) {
      const p = Math.sin((u / 0.24) * (Math.PI * 0.5));
      out.heightOffset = -0.13 * p;
      out.pitchOffset = -0.12 * p;
    } else if (u < 0.72) {
      const p = (u - 0.24) / 0.48;
      const arc = Math.sin(p * Math.PI);
      const crouchRelease = Math.max(0, 1 - p * 4.0);
      out.heightOffset = -0.13 * crouchRelease + 0.24 * arc;
      out.footLift = 0.19 * arc;
      out.pitchOffset = Math.sin(p * Math.PI * 2) * 0.14;
      out.rollOffset = arc * 0.12;
    } else {
      const p = (u - 0.72) / 0.28;
      const land = Math.sin(p * Math.PI);
      out.heightOffset = -0.075 * land;
      out.pitchOffset = -0.07 * land;
    }
    return;
  }

  if (trick.kind === "land") {
    // Impact touchdown: heavy 4-leg suspension squash -> elastic rebound -> rapid shake-it-off shiver
    if (u < 0.3) {
      const p = u / 0.3;
      const squash = Math.sin(p * Math.PI);
      out.heightOffset = -0.16 * squash;
      out.pitchOffset = -0.14 * squash;
    } else {
      const su = (u - 0.3) / 0.7;
      const env = smoothstep01(0, 0.16, su) * (1 - smoothstep01(0.75, 1.0, su));
      const rebound = su < 0.18 ? Math.sin((su / 0.18) * Math.PI) * 0.045 : 0;
      out.heightOffset = rebound - 0.03 * env;
      out.rollOffset = Math.sin(trick.elapsed * 30.0) * 0.23 * env;
      out.pitchOffset = 0.08 * env;
    }
    return;
  }

  // "scan": brief LiDAR head-up sweep followed by an energetic turbo sprint
  if (u < 0.45) {
    const su = u / 0.45;
    const env = smoothstep01(0, 0.2, su) * (1 - smoothstep01(0.8, 1.0, su));
    out.heightOffset = -0.06 * env;
    out.pitchOffset = 0.22 * env;
    out.rollOffset = Math.sin(trick.elapsed * 10.5) * 0.11 * env;
  } else {
    const zu = (u - 0.45) / 0.55;
    const env = smoothstep01(0, 0.15, zu) * (1 - smoothstep01(0.8, 1.0, zu));
    out.heightOffset = -0.03 * env;
    out.pitchOffset = -0.08 * env;
  }
}

export function createRoamingRenderer({
  canvas,
  count = 2,
  onTelemetry,
  onTrick,
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
  const nextTrickCursor = new Uint8Array(botCount);
  const activeTricks: (ActiveTrick | null)[] = Array.from(
    { length: botCount },
    () => null
  );
  const airborne: (AirborneState | null)[] = Array.from(
    { length: botCount },
    () => null
  );
  const push = new Float32Array(botCount * 2);
  const shadowData = new Float32Array(botCount * 4);
  const shadowScale = new Float32Array(botCount).fill(1);

  const botMetas: RoamingBotMeta[] = Array.from({ length: botCount }, (_, i) => {
    const preset = ROAMING_BOTS[i];
    return preset ?? { id: i, name: `UNIT-0${i + 1}`, role: "FIELD DRONE" };
  });

  // Pre-allocated mutable telemetry objects reused every frame (zero GC pressure)
  const telemetry: {
    index: number;
    name: string;
    role: string;
    visible: boolean;
    hovered: boolean;
    trick: BotTrickKind | null;
    trickLabel: string | null;
    labelX: number;
    labelY: number;
    centerX: number;
    centerY: number;
  }[] = botMetas.map((meta, index) => ({
    index,
    name: meta.name,
    role: meta.role,
    visible: false,
    hovered: false,
    trick: null,
    trickLabel: null,
    labelX: -200,
    labelY: -200,
    centerX: -200,
    centerY: -200,
  }));

  let worldZPerPixel = 0.012;
  let hoveredBot = -1;
  let pendingGrab: PendingGrab | null = null;
  let suppressClickUntil = 0;
  let prevBodyUserSelect: string | null = null;
  let pointerClientX = -9999;
  let pointerClientY = -9999;
  let pointerActive = false;
  let pointerOverUi = false;

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
  const screenOut: [number, number] = [0, 0];
  const scratchEmote = {
    heightOffset: 0,
    pitchOffset: 0,
    rollOffset: 0,
    footLift: 0,
  };

  function setBotCursorFlags(isHovering: boolean, isGrabbing: boolean): void {
    if (typeof document === "undefined") return;
    const nextHover = isHovering ? "true" : "false";
    const nextGrab = isGrabbing ? "true" : "false";
    if (
      document.documentElement.dataset.botHover !== nextHover ||
      document.documentElement.dataset.botGrab !== nextGrab
    ) {
      document.documentElement.dataset.botHover = nextHover;
      document.documentElement.dataset.botGrab = nextGrab;
      window.dispatchEvent(new Event("goddev:bot-hover"));
    }
  }

  function setBodyNoSelect(active: boolean): void {
    if (typeof document === "undefined") return;
    if (active) {
      if (prevBodyUserSelect === null) {
        prevBodyUserSelect = document.body.style.userSelect;
      }
      document.body.style.userSelect = "none";
    } else if (prevBodyUserSelect !== null) {
      document.body.style.userSelect = prevBodyUserSelect;
      prevBodyUserSelect = null;
    }
  }

  function ndcToPlane(
    ndcX: number,
    ndcY: number,
    planeY = 0
  ): [number, number] | null {
    const aspect = outputWidth / Math.max(1, outputHeight);
    cameraRay(pose, lens, aspect, ndcX, ndcY, rayOrigin, rayDir);
    if (Math.abs(rayDir[1]) < 1e-4) return null;
    const t = (planeY - rayOrigin[1]) / rayDir[1];
    if (t <= 0) return null;
    return [rayOrigin[0] + rayDir[0] * t, rayOrigin[2] + rayDir[2] * t];
  }

  function ndcToFloor(ndcX: number, ndcY: number): [number, number] | null {
    return ndcToPlane(ndcX, ndcY, 0);
  }

  /** Project a 3D world point (x, y, z) into exact screen NDC [-1, 1]^2. */
  function projectWorldToNdc(x: number, y: number, z: number): [number, number] {
    const m = matrices.viewProjection;
    const cx = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
    const cy = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
    const cw = m[3]! * x + m[7]! * y + m[11]! * z + m[15]!;
    if (cw <= 1e-4) {
      ndcOut[0] = 0;
      ndcOut[1] = -99;
      return ndcOut;
    }
    ndcOut[0] = cx / cw;
    ndcOut[1] = cy / cw;
    return ndcOut;
  }

  /** Project a 3D world point (x, y, z) into CSS viewport pixels. */
  function projectWorldToCss(
    x: number,
    y: number,
    z: number,
    rect: DOMRect
  ): [number, number] {
    const [nx, ny] = projectWorldToNdc(x, y, z);
    screenOut[0] = rect.left + (nx * 0.5 + 0.5) * rect.width;
    screenOut[1] = rect.top + (0.5 - ny * 0.5) * rect.height;
    return screenOut;
  }

  /** How far outside the padded screen border a robot sits in NDC units (0 when visible or partially visible). */
  function offscreenNdcDistance(robot: Robot): number {
    const [nx, ny] = projectWorldToNdc(robot.position[0], 0, robot.position[2]);
    const dx = Math.max(0, Math.abs(nx) - OFF_NDC_X);
    const dy = Math.max(0, Math.abs(ny) - OFF_NDC_Y);
    return Math.hypot(dx, dy);
  }

  function isInsideView(robot: Robot): boolean {
    const [nx, ny] = projectWorldToNdc(robot.position[0], 0, robot.position[2]);
    return Math.abs(nx) <= 0.88 && Math.abs(ny) <= 0.86;
  }

  function clientToPlane(
    clientX: number,
    clientY: number,
    planeY = 0,
    clampX = 0.84,
    clampY = 0.82
  ): [number, number] | null {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const ndcX = clamp(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -clampX,
      clampX
    );
    const ndcY = clamp(
      1 - ((clientY - rect.top) / rect.height) * 2,
      -clampY,
      clampY - 0.04
    );
    return ndcToPlane(ndcX, ndcY, planeY);
  }

  function clientToFloor(
    clientX: number,
    clientY: number
  ): [number, number] | null {
    return clientToPlane(clientX, clientY, 0, 0.84, 0.82);
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

  /** Find which visible robot (if any) sits under a CSS client coordinate (works grounded & mid-air). */
  function hitTestBotAt(
    clientX: number,
    clientY: number,
    radiusPx: number
  ): number {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return -1;
    let best = -1;
    let bestDist = radiusPx;
    for (let i = 0; i < botCount; i++) {
      const r = robots[i]!;
      const isAir = Boolean(airborne[i]);
      if (!isAir && offscreenNdcDistance(r) > 0.05) continue;
      const [sx, sy] = projectWorldToCss(
        r.position[0],
        isAir ? r.position[1] : r.position[1] * 0.65,
        r.position[2],
        rect
      );
      const d = Math.hypot(clientX - sx, clientY - sy);
      if (d <= bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  /** Pick an organic visible floor waypoint directly in NDC space so margins are uniform at every aspect ratio. */
  function pickWaypoint(index: number): [number, number] {
    const rng = randoms[index]!;
    let nx = (mulberry32.sample(rng) * 2 - 1) * 0.78;
    let ny = -0.76 + mulberry32.sample(rng) * 1.44;

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
      const roll = mulberry32.sample(rng);
      edge = roll < 0.32 ? 0 : roll < 0.64 ? 1 : roll < 0.84 ? 2 : 3;
    }

    const sampleSpawnForEdge = (e: 0 | 1 | 2 | 3): [number, number] => {
      if (e === 0) {
        const ny = -0.68 + mulberry32.sample(rng) * 1.28;
        return ndcToFloor(-SPAWN_NDC_X, ny) ?? [-7.2, 0];
      }
      if (e === 1) {
        const ny = -0.68 + mulberry32.sample(rng) * 1.28;
        return ndcToFloor(SPAWN_NDC_X, ny) ?? [7.2, 0];
      }
      if (e === 2) {
        const nx = (mulberry32.sample(rng) * 2 - 1) * 0.72;
        return ndcToFloor(nx, -SPAWN_NDC_Y) ?? [0, 5.4];
      }
      const nx = (mulberry32.sample(rng) * 2 - 1) * 0.72;
      return ndcToFloor(nx, SPAWN_NDC_Y) ?? [0, -6.6];
    };

    let spawn = sampleSpawnForEdge(edge);

    for (let other = 0; other < botCount; other++) {
      if (other === index) continue;
      const r = robots[other]!;
      if (Math.hypot(r.position[0] - spawn[0], r.position[2] - spawn[1]) < 2.2) {
        edge = (((edge + 1) % 4) as 0 | 1 | 2 | 3);
        spawn = sampleSpawnForEdge(edge);
        break;
      }
    }

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

    activeTricks[index] = null;
    airborne[index] = null;
    robot.goal[0] = target[0];
    robot.goal[1] = target[1];
    robot.arrived = false;
    returning[index] = 1;
    offscreenTime[index] = 0;
    idleTimers[index] = 1.4 + mulberry32.sample(rng) * 2.2;
    respawnDelay[index] =
      (index === 0 ? 0.95 : 2.15) + mulberry32.sample(rng) * 1.1;
  }

  function spawnBots(): void {
    for (let i = 0; i < botCount; i++) {
      const robot = robots[i]!;
      const rng = randoms[i]!;
      robot.palette = i === 1 ? 1 : 0;
      robot.phase = i * 0.37;
      nextTrickCursor[i] = i % CLICK_TRICKS.length;
      if (i === 0) {
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
        enterFromEdge(i, undefined, i % 2 === 1 ? 1 : 0);
        respawnDelay[i] = 2.0 + mulberry32.sample(rng) * 1.1;
      }
    }
  }

  function triggerBotTrick(botIndex: number, forcedKind?: BotTrickKind): void {
    const robot = robots[botIndex]!;
    const meta = botMetas[botIndex]!;
    let kind: BotTrickKind;
    if (forcedKind) {
      kind = forcedKind;
    } else {
      const cursor = nextTrickCursor[botIndex]!;
      kind = CLICK_TRICKS[cursor % CLICK_TRICKS.length]!;
      nextTrickCursor[botIndex] = (cursor + 1) % CLICK_TRICKS.length;
    }

    const cfg = TRICK_CONFIG[kind];
    activeTricks[botIndex] = {
      kind,
      elapsed: 0,
      duration: cfg.duration,
      label: cfg.label,
      zoomStarted: false,
    };

    if (kind !== "scan") {
      robot.goal[0] = robot.position[0];
      robot.goal[1] = robot.position[2];
      robot.arrived = true;
      idleTimers[botIndex] = kind === "land" ? 2.2 : 0.7;
    } else {
      robot.goal[0] = robot.position[0];
      robot.goal[1] = robot.position[2];
      robot.arrived = true;
    }

    const rect = canvas.getBoundingClientRect();
    const [sx, sy] = projectWorldToCss(
      robot.position[0],
      0.06,
      robot.position[2],
      rect
    );
    onTrick?.({
      botIndex,
      name: meta.name,
      trick: kind,
      label: cfg.label,
      x: sx,
      y: sy,
    });
  }

  function startCarry(botIndex: number, clientX: number, clientY: number): void {
    const robot = robots[botIndex]!;
    const hit = clientToPlane(clientX, clientY, LIFT_HEIGHT, 0.92, 0.88);
    const tx = hit ? hit[0] : robot.position[0];
    const tz = hit ? hit[1] : robot.position[2];

    activeTricks[botIndex] = null;
    returning[botIndex] = 0;
    offscreenTime[botIndex] = 0;

    const existing = airborne[botIndex];
    airborne[botIndex] = {
      mode: "carried",
      x: existing ? existing.x : robot.position[0],
      y: Math.max(RIDE_HEIGHT + 0.08, existing ? existing.y : robot.position[1]),
      z: existing ? existing.z : robot.position[2],
      vx: 0,
      vy: 0,
      vz: 0,
      heading: existing ? existing.heading : robot.heading.value,
      tiltRight: existing ? existing.tiltRight : 0,
      tiltForward: existing ? existing.tiltForward : 0.12,
      kickTime: existing ? existing.kickTime : 0,
      targetX: tx,
      targetZ: tz,
    };

    setBodyNoSelect(true);
    try {
      window.getSelection()?.removeAllRanges();
    } catch {
      // Ignore selection clear errors
    }
    setBotCursorFlags(true, true);
  }

  function releaseCarry(botIndex: number): void {
    const air = airborne[botIndex];
    if (air && air.mode === "carried") {
      air.mode = "falling";
      // Carry over gentle, bounded horizontal toss momentum so dropping or flicking feels physical
      air.vx = clamp(air.vx * 0.3, -3.2, 3.2);
      air.vz = clamp(air.vz * 0.3, -3.2, 3.2);
      air.vy = Math.min(0.6, Math.max(-0.5, 0.35));
    }
    setBodyNoSelect(false);
    setBotCursorFlags(hoveredBot >= 0, false);
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

    let nearest = -1;
    let bestDist = Infinity;
    for (let i = 0; i < botCount; i++) {
      const r = robots[i]!;
      if (airborne[i] || activeTricks[i]) continue;
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

    for (let i = 0; i < botCount; i++) {
      if (!airborne[i] && offscreenNdcDistance(robots[i]!) > 0.16) {
        enterFromEdge(i, hit, closestEdgeForClient(clientX, clientY));
        return;
      }
    }
  }

  const onWindowPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(UI_INTERACTIVE_SELECTOR)) {
      return;
    }

    // 1. Direct press on a robot arms click-vs-lift disambiguation
    const hitRadius =
      event.pointerType === "touch" ? TOUCH_HIT_RADIUS_PX : HOVER_HIT_RADIUS_PX;
    const hitBot = hitTestBotAt(event.clientX, event.clientY, hitRadius);
    if (hitBot >= 0) {
      pendingGrab = {
        botIndex: hitBot,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        dragging: false,
      };
      // Prevent native text highlight from starting during the first few pixels of a bot drag
      setBodyNoSelect(true);
      return;
    }

    // 2. Empty page space click summons the nearest available robot
    summonNearestBot(event.clientX, event.clientY);
  };

  const onWindowPointerMove = (event: PointerEvent) => {
    if (!event.isPrimary) return;
    pointerClientX = event.clientX;
    pointerClientY = event.clientY;
    pointerActive = event.pointerType === "mouse";

    // Handle armed press -> lift transition and active mid-air dragging
    if (pendingGrab && event.pointerId === pendingGrab.pointerId) {
      if (!pendingGrab.dragging) {
        const moved = Math.hypot(
          event.clientX - pendingGrab.startX,
          event.clientY - pendingGrab.startY
        );
        if (moved >= DRAG_THRESHOLD_PX) {
          pendingGrab.dragging = true;
          startCarry(pendingGrab.botIndex, event.clientX, event.clientY);
        }
      }
      if (pendingGrab.dragging) {
        const air = airborne[pendingGrab.botIndex];
        if (air && air.mode === "carried") {
          const hit = clientToPlane(
            event.clientX,
            event.clientY,
            LIFT_HEIGHT,
            0.92,
            0.88
          );
          if (hit) {
            air.targetX = hit[0];
            air.targetZ = hit[1];
          }
        }
        return;
      }
    }

    const target = event.target instanceof Element ? event.target : null;
    pointerOverUi = Boolean(target?.closest(UI_INTERACTIVE_SELECTOR));

    if (event.pointerType !== "mouse") return;
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
      if (speed > 2.35 && hoveredBot < 0) {
        const hit = clientToFloor(event.clientX, event.clientY);
        if (hit) {
          for (let i = 0; i < botCount; i++) {
            const r = robots[i]!;
            if (airborne[i] || activeTricks[i] || offscreenNdcDistance(r) > 0.05) {
              continue;
            }
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

  const finishPendingGrab = (pointerId?: number, cancelled = false) => {
    if (!pendingGrab) return;
    if (pointerId !== undefined && pendingGrab.pointerId !== pointerId) return;
    const { botIndex, dragging } = pendingGrab;
    pendingGrab = null;

    if (dragging) {
      suppressClickUntil = performance.now() + 90;
      releaseCarry(botIndex);
    } else {
      setBodyNoSelect(false);
      if (!cancelled && !airborne[botIndex]) {
        // Short press-and-release without dragging -> run interactive click trick!
        triggerBotTrick(botIndex);
      }
    }
  };

  const onWindowTouchMove = (event: TouchEvent) => {
    if (pendingGrab?.dragging && event.cancelable) {
      event.preventDefault();
    }
  };

  const onWindowPointerUp = (event: PointerEvent) => {
    finishPendingGrab(event.pointerId, false);
  };

  const onWindowPointerCancel = (event: PointerEvent) => {
    finishPendingGrab(event.pointerId, true);
  };

  const onWindowBlur = () => {
    finishPendingGrab(undefined, true);
  };

  const onWindowClickCapture = (event: MouseEvent) => {
    // Prevent accidental link/button clicks right when releasing a dragged robot over UI
    if (performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const onDocumentMouseLeave = () => {
    pointerActive = false;
    pointerOverUi = false;
    if (!pendingGrab?.dragging && hoveredBot !== -1) {
      hoveredBot = -1;
      setBotCursorFlags(false, false);
    }
  };

  function stepSimulation(): void {
    push.fill(0);
    for (let a = 0; a < botCount; a++) {
      if (airborne[a]) continue;
      for (let b = a + 1; b < botCount; b++) {
        if (airborne[b]) continue;
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
      const air = airborne[i];

      // --- Airborne state: lifted in mid-air OR falling under gravity ---
      if (air) {
        air.kickTime += FIXED_DT;

        if (air.mode === "carried") {
          const follow = 1 - Math.exp(-FIXED_DT * 18);
          const dx = (air.targetX - air.x) * follow;
          const dz = (air.targetZ - air.z) * follow;
          air.vx = air.vx * 0.7 + (dx / FIXED_DT) * 0.3;
          air.vz = air.vz * 0.7 + (dz / FIXED_DT) * 0.3;
          air.x += dx;
          air.z += dz;

          const hoverBob = Math.sin(air.kickTime * 6.4) * 0.045;
          const targetY = LIFT_HEIGHT + hoverBob;
          air.y += (targetY - air.y) * (1 - Math.exp(-FIXED_DT * 14));

          // Pendulum inertia tilt in the robot's heading frame
          const c = Math.cos(air.heading);
          const s = Math.sin(air.heading);
          const localRightVel = air.vx * c - air.vz * s;
          const localFwdVel = air.vx * s + air.vz * c;
          const desiredRight =
            clamp(-localRightVel * 0.085, -0.34, 0.34) +
            Math.sin(air.kickTime * 10.5) * 0.045;
          const desiredFwd = clamp(-localFwdVel * 0.085, -0.28, 0.28) + 0.13;
          air.tiltRight += (desiredRight - air.tiltRight) * 0.22;
          air.tiltForward += (desiredFwd - air.tiltForward) * 0.22;
          air.heading += clamp(localRightVel * 0.007, -0.024, 0.024);

          poseAirborneRobot(
            robot,
            air.x,
            air.y,
            air.z,
            air.heading,
            air.tiltRight,
            air.tiltForward,
            air.kickTime,
            "dangle"
          );
          shadowScale[i] = clamp(
            1.0 - (air.y - RIDE_HEIGHT) * 0.38,
            0.52,
            1.0
          );
          continue;
        }

        // Falling under gravity
        air.vy -= GRAVITY * FIXED_DT;
        air.x += air.vx * FIXED_DT;
        air.z += air.vz * FIXED_DT;
        air.vx *= 0.965;
        air.vz *= 0.965;
        air.y += air.vy * FIXED_DT;
        air.tiltRight *= 0.88;
        air.tiltForward += (-0.09 - air.tiltForward) * 0.14;

        if (air.y <= RIDE_HEIGHT) {
          // Touchdown! Re-plant all 4 feet cleanly onto the concrete page & trigger squash+shake recovery
          airborne[i] = null;
          const savedPalette = robot.palette;
          const savedPhase = robot.phase;
          placeRobot(robot, terrain, air.x, air.z, air.heading);
          robot.palette = savedPalette;
          robot.phase = savedPhase;
          shadowScale[i] = 1.15;
          triggerBotTrick(i, "land");
          continue;
        }

        poseAirborneRobot(
          robot,
          air.x,
          air.y,
          air.z,
          air.heading,
          air.tiltRight,
          air.tiltForward,
          air.kickTime,
          "brace"
        );
        shadowScale[i] = clamp(1.0 - (air.y - RIDE_HEIGHT) * 0.38, 0.52, 1.0);
        continue;
      }

      // --- Grounded state ---
      const offNdc = offscreenNdcDistance(robot);

      if (returning[i] === 1) {
        if (isInsideView(robot)) {
          returning[i] = 0;
          offscreenTime[i] = 0;
        } else if (offNdc > 0.55) {
          returning[i] = 0;
        }
      }

      if (offNdc > 0 && returning[i] === 0) {
        activeTricks[i] = null;
        const paceBoost = offNdc > 0.8 ? 1.35 : 1.0;
        offscreenTime[i] += FIXED_DT * paceBoost;
        if (offscreenTime[i]! >= respawnDelay[i]! && scrollSpeedPx < 1600) {
          enterFromEdge(i);
          continue;
        }
      } else if (offNdc === 0) {
        offscreenTime[i] = 0;
      }

      let trick = activeTricks[i];
      let emoteArg: RobotEmote | undefined;
      let pace = returning[i] === 1 ? 1.32 : 1.18;
      let holdStationary = false;

      if (trick) {
        trick.elapsed += FIXED_DT;
        if (trick.elapsed >= trick.duration) {
          const wasLanding = trick.kind === "land";
          activeTricks[i] = null;
          trick = null;
          shadowScale[i] = 1;
          if (wasLanding) {
            // Stay calmly near the newly dropped spot for a moment so it doesn't rush back over text
            robot.goal[0] = robot.position[0];
            robot.goal[1] = robot.position[2];
            robot.arrived = true;
            idleTimers[i] = 2.0;
          } else {
            const next = pickWaypoint(i);
            robot.goal[0] = next[0];
            robot.goal[1] = next[1];
            robot.arrived = false;
            idleTimers[i] = 1.4;
          }
        } else {
          evaluateTrickEmote(trick, scratchEmote);
          emoteArg = scratchEmote;
          shadowScale[i] = clamp(
            1.0 - scratchEmote.heightOffset * 1.45,
            0.65,
            1.18
          );

          if (trick.kind === "scan") {
            const u = trick.elapsed / trick.duration;
            if (u < 0.45) {
              holdStationary = true;
            } else {
              if (!trick.zoomStarted) {
                trick.zoomStarted = true;
                const zoomTarget = pickWaypoint(i);
                robot.goal[0] = zoomTarget[0];
                robot.goal[1] = zoomTarget[1];
                robot.arrived = false;
              }
              pace = 1.62;
            }
          } else {
            holdStationary = true;
          }
        }
      } else if (hoveredBot === i && offNdc === 0) {
        scratchEmote.heightOffset = -0.025;
        scratchEmote.pitchOffset = 0.11;
        scratchEmote.rollOffset = 0;
        scratchEmote.footLift = 0;
        emoteArg = scratchEmote;
        shadowScale[i] = 1.03;
        pace = 0.28;
      } else {
        shadowScale[i] = 1;
      }

      let steerX = 0;
      let steerZ = 0;

      if (!holdStationary) {
        const dx = robot.goal[0] - robot.position[0];
        const dz = robot.goal[1] - robot.position[2];
        const dist = Math.hypot(dx, dz);

        if (dist < 0.24) {
          robot.arrived = true;
          if (offNdc === 0 && !trick) {
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
      }

      stepRobot(robot, {
        terrain,
        dt: FIXED_DT,
        pace,
        steerX,
        steerZ,
        pushX: holdStationary ? 0 : push[i * 2]!,
        pushZ: holdStationary ? 0 : push[i * 2 + 1]!,
        unbounded: true,
        emote: emoteArg,
      });
    }
  }

  function updateHoverAndTelemetry(): void {
    const rect = canvas.getBoundingClientRect();
    const validRect = rect.width > 0 && rect.height > 0;
    const isCarrying = Boolean(pendingGrab?.dragging);

    const nextHover = isCarrying
      ? pendingGrab!.botIndex
      : validRect && pointerActive && !pointerOverUi
        ? hitTestBotAt(pointerClientX, pointerClientY, HOVER_HIT_RADIUS_PX)
        : -1;

    if (nextHover !== hoveredBot) {
      hoveredBot = nextHover;
      setBotCursorFlags(hoveredBot >= 0, isCarrying);
    }

    if (!onTelemetry) return;

    for (let i = 0; i < botCount; i++) {
      const r = robots[i]!;
      const item = telemetry[i]!;
      const air = airborne[i];
      const trick = activeTricks[i];
      const isHovered = hoveredBot === i;
      const isVisibleOnScreen =
        validRect && (Boolean(air) || offscreenNdcDistance(r) <= 0.04);
      const showBadge =
        isVisibleOnScreen && (isHovered || Boolean(trick) || Boolean(air));

      item.hovered = isHovered;
      item.trick = trick ? trick.kind : null;
      item.trickLabel = air
        ? air.mode === "carried"
          ? "AIRLIFT · WHOA!"
          : "FREEFALL · BRACING!"
        : trick
          ? trick.label
          : null;
      item.visible = showBadge;

      if (showBadge) {
        const [cx, cy] = projectWorldToCss(
          r.position[0],
          air ? r.position[1] : r.position[1] * 0.5,
          r.position[2],
          rect
        );
        const [lx, ly] = projectWorldToCss(
          r.position[0],
          r.position[1] + 0.42,
          r.position[2],
          rect
        );
        item.centerX = cx;
        item.centerY = cy;
        item.labelX = clamp(lx, 96, Math.max(96, rect.width - 96));
        item.labelY = clamp(ly - 14, 78, Math.max(78, rect.height - 44));
      }
    }

    onTelemetry(telemetry);
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

    // Anchor grounded & falling robots directly to webpage scroll (carried robot stays under cursor)
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
        const air = airborne[i];
        if (air?.mode === "carried") continue;
        if (air?.mode === "falling") {
          air.z += deltaZ;
        }
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
      shadowData[i * 4 + 3] = shadowScale[i]!;
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

    updateHoverAndTelemetry();
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
    setBodyNoSelect(false);
    setBotCursorFlags(false, false);
    unsubscribeResize?.();
    if (typeof window !== "undefined") {
      window.removeEventListener("pointerdown", onWindowPointerDown);
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerCancel);
      window.removeEventListener("touchmove", onWindowTouchMove);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("click", onWindowClickCapture, true);
      document.removeEventListener("mouseleave", onDocumentMouseLeave);
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
    window.addEventListener("pointerup", onWindowPointerUp, { passive: true });
    window.addEventListener("pointercancel", onWindowPointerCancel, {
      passive: true,
    });
    window.addEventListener("touchmove", onWindowTouchMove, { passive: false });
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("click", onWindowClickCapture, true);
    document.addEventListener("mouseleave", onDocumentMouseLeave);
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
