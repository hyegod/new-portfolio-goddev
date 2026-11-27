// Motion is the conductor. An `animate()` sequence plays the timeline (one
// labelled segment per shape) into a playhead motion value, and Motion's
// frameloop calls this renderer in `render` every frame.

import {
  animate,
  cancelFrame,
  frame as motionFrame,
  frameData,
  motionValue,
  springValue,
  type AnimationPlaybackControls,
  type AnimationSequence,
  type MotionValue,
} from "motion";
import { clock, frame, init, surface, type Gpu, type Surface } from "vgpu";

import {
  BURST_SPREAD,
  DEFAULT_SPRING,
  DEFAULT_STAGGER,
  LOOP,
  SEGMENT,
  SHAPES,
  activeSegments,
  arrivalCue,
  bakeSpring,
  bakeStagger,
  baseShape,
  cameraAt,
  criticallyDamped,
  currentShape,
  morphWindow,
  wrapTime,
  type PatternChoice,
  type SpringTable,
  type StaggerEase,
} from "./choreography";
import { detectPerformanceProfile } from "@/lib/devicePerf";
import {
  DEFAULT_COUNT,
  DEFAULT_LOOK,
  MAX_BURSTS,
  PARTICLE_COUNTS,
  createPipeline,
  type Burst,
  type ColorMode,
  type Pipeline,
} from "./pipeline";

interface RendererOptions {
  readonly canvas: HTMLCanvasElement;
  readonly container?: HTMLElement;
  readonly onShapeChange?: (shapeIndex: number) => void;
}

interface Settings {
  speed: number;
  shape: number;
  stiffness: number;
  damping: number;
  mass: number;
  pattern: PatternChoice;
  spread: number;
  ease: StaggerEase;
  count: number;
  colorMode: ColorMode;
  streaks: number;
  trails: boolean;
  bloom: boolean;
  exposure: number;
  calm: boolean;
}

interface LiveBurst extends Burst {
  age: number;
  readonly born: number;
}

const MAX_DPR = 1.5;
const TRAIL_KEEP = 0.8;
const TRAIL_CUT = 0.25;
const BURST_AMPLITUDE = 0.2;
const CALM = { speed: 0.6, push: 0.4, burst: 0.35 } as const;

function bestEffort(cleanup: () => void): void {
  try {
    cleanup();
  } catch {
    // Teardown must run to completion even when one step throws.
  }
}

export function timelineSequence(
  playhead: MotionValue<number>
): AnimationSequence {
  return SHAPES.flatMap((shape, k) => [
    shape.id,
    [
      playhead,
      [k * SEGMENT, (k + 1) * SEGMENT],
      { duration: SEGMENT, ease: "linear" },
    ],
  ]) as AnimationSequence;
}

export function jumpDelta(from: number, to: number): number {
  const delta = wrapTime(to - from);
  return delta > LOOP / 2 ? delta - LOOP : delta;
}

export function createRenderer({
  canvas,
  container = canvas.parentElement ?? undefined,
  onShapeChange,
}: RendererOptions) {
  let disposed = false;
  let gpu: Gpu | undefined;
  let output: Surface | undefined;
  let pipeline: Pipeline | undefined;
  let motion: MediaQueryList | undefined;
  let intersection: IntersectionObserver | undefined;
  let cvTarget: Element | undefined;
  let unsubscribeResize: (() => void) | undefined;
  let ticking = false;
  let isVisible = true;
  let cvSkipped = false;
  let started = false;

  const perfTier = detectPerformanceProfile().tier;
  const adaptiveCount =
    perfTier === "low"
      ? PARTICLE_COUNTS["65k"]
      : perfTier === "medium"
        ? PARTICLE_COUNTS["131k"]
        : DEFAULT_COUNT;

  const settings: Settings = {
    speed: 1,
    shape: 0,
    ...DEFAULT_SPRING,
    pattern: "auto",
    ...DEFAULT_STAGGER,
    count: adaptiveCount,
    colorMode: DEFAULT_LOOK.colorMode,
    streaks: DEFAULT_LOOK.streak,
    trails: true,
    bloom: DEFAULT_LOOK.bloom,
    exposure: DEFAULT_LOOK.exposure,
    calm: false,
  };

  const playhead = motionValue(0);
  const pointerX = motionValue(0);
  const pointerY = motionValue(0);
  const pushTarget = motionValue(0);
  const sprungX = springValue(pointerX, { stiffness: 260, damping: 24 });
  const sprungY = springValue(pointerY, { stiffness: 260, damping: 24 });
  const push = springValue(pushTarget, { stiffness: 170, damping: 9 });
  let controls: AnimationPlaybackControls | undefined;
  let jump: AnimationPlaybackControls | undefined;
  let playing = true;

  let spring: SpringTable = bakeSpring(DEFAULT_SPRING);
  let inFlight = 0;
  let wall = 0;
  let lastTime = 0;
  let size: readonly [number, number] = [1, 1];
  let pointerRadius = 1;
  const bursts: LiveBurst[] = [];
  const origins = new Map<number, readonly [number, number]>();
  let lastPointer: readonly [number, number] = [0, 0];
  let hovering = false;
  let pressed: { x: number; y: number } | undefined;

  const rebake = () => {
    const base = {
      stiffness: settings.stiffness,
      damping: settings.damping,
      mass: settings.mass,
    };
    spring = bakeSpring(settings.calm ? criticallyDamped(base) : base);
    pipeline?.setSpring(
      spring,
      bakeStagger(settings.spread, settings.ease),
      settings.spread
    );
    inFlight = morphWindow(settings.spread, spring.duration);
  };

  const applyLook = () => {
    pipeline?.setLook({
      colorMode: settings.colorMode,
      streak: settings.calm ? 0 : settings.streaks,
      bloom: settings.bloom,
      exposure: settings.exposure,
    });
  };

  const applySpeed = () => {
    if (controls)
      controls.speed = settings.speed * (settings.calm ? CALM.speed : 1);
  };

  const setPlaying = (next: boolean) => {
    playing = next;
    if (next) controls?.play();
    else controls?.pause();
  };

  const stopJump = () => {
    jump?.stop();
    jump = undefined;
  };

  const jumpTo = (shape: number) => {
    if (!controls) return;
    stopJump();
    let from = controls.time;
    const delta = jumpDelta(from, arrivalCue(shape));
    const settle = playing
      ? 0
      : Math.min(settings.spread + spring.duration * 0.7, SEGMENT - 0.2);
    if (from + delta + settle < 0) from += LOOP;
    const to = from + delta + settle;
    const timeline = controls;
    const resume = playing;
    timeline.pause();
    jump = animate(from, to, {
      duration: Math.min(Math.max(0.6 + Math.abs(to - from) * 0.09, 0.7), 2.2),
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (time) => {
        timeline.time = time;
      },
      onComplete: () => {
        jump = undefined;
        if (resume && playing) timeline.play();
      },
    });
  };

  const toNdc = (event: PointerEvent): [number, number] => {
    const rect = canvas.getBoundingClientRect();
    return [
      ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
      1 - ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2,
    ];
  };

  const fireBurst = (origin: readonly [number, number] = [0, 0]) => {
    if (bursts.length >= MAX_BURSTS) bursts.shift();
    bursts.push({
      origin,
      age: 0,
      amplitude: BURST_AMPLITUDE * (settings.calm ? CALM.burst : 1),
      born: wall,
    });
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.target !== canvas) {
      if (event.pointerType === "mouse" && hovering) leave();
      return;
    }
    const [x, y] = toNdc(event);
    lastPointer = [x, y];
    if (!hovering && event.pointerType === "mouse") {
      pointerX.jump(x);
      pointerY.jump(y);
      sprungX.jump(x);
      sprungY.jump(y);
    }
    pointerX.set(x);
    pointerY.set(y);
    if (event.pointerType === "mouse" || pressed) {
      hovering = true;
      pushTarget.set(1);
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.target !== canvas) return;
    const [x, y] = toNdc(event);
    pressed = { x: event.clientX, y: event.clientY };
    lastPointer = [x, y];
    if (event.pointerType !== "mouse") {
      pointerX.jump(x);
      pointerY.jump(y);
      sprungX.jump(x);
      sprungY.jump(y);
    }
    hovering = true;
    pushTarget.set(1);
  };

  const onPointerUp = (event: PointerEvent) => {
    const start = pressed;
    pressed = undefined;
    if (
      start &&
      event.target === canvas &&
      Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8
    ) {
      fireBurst(toNdc(event));
    }
    if (event.pointerType !== "mouse") leave();
  };

  const leave = () => {
    hovering = false;
    pushTarget.set(0);
  };

  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType === "mouse") leave();
  };

  const applyCalm = () => {
    rebake();
    applyLook();
    applySpeed();
  };

  const onMotionPreference = () => {
    settings.calm = motion?.matches ?? false;
    applyCalm();
  };

  const tick = () => {
    if (!isVisible || cvSkipped || document.hidden) return;
    try {
      render();
    } catch {
      dispose();
    }
  };

  const reconcileLoop = () => {
    if (!started || disposed) return;
    const shouldRun = isVisible && !cvSkipped && !document.hidden;
    if (shouldRun) {
      if (!ticking) {
        motionFrame.render(tick, true);
        ticking = true;
      }
      if (playing) controls?.play();
    } else {
      if (ticking) {
        cancelFrame(tick);
        ticking = false;
      }
      controls?.pause();
    }
  };

  const onVisibilityChange = () => reconcileLoop();
  const onCvChange = (event: Event) => {
    cvSkipped = Boolean((event as Event & { skipped?: boolean }).skipped);
    reconcileLoop();
  };

  const render = () => {
    if (disposed || !gpu || !output || !pipeline) return;
    const dt = Math.min(Math.max(frameData.delta, 0), 50) / 1000;
    clock(gpu).advance(dt);
    wall += dt;

    const time = wrapTime(playhead.get());
    const step = Math.abs(time - lastTime);
    const cut = Math.min(step, LOOP - step) > TRAIL_CUT;
    lastTime = time;
    const calm = settings.calm;
    const aspect = size[0] / Math.max(1, size[1]);
    const camera = cameraAt(time, aspect, calm ? 0 : 1);
    const segments = activeSegments(time, inFlight);

    for (const index of origins.keys()) {
      if (!segments.some((segment) => segment.index === index))
        origins.delete(index);
    }
    for (const segment of segments) {
      if (!origins.has(segment.index)) origins.set(segment.index, lastPointer);
    }

    for (let i = bursts.length - 1; i >= 0; i--) {
      const burst = bursts[i]!;
      burst.age = wall - burst.born;
      if (burst.age > BURST_SPREAD + spring.duration) bursts.splice(i, 1);
    }

    const shape = currentShape(time);
    if (shape !== settings.shape) {
      settings.shape = shape;
      onShapeChange?.(shape);
    }

    const state = {
      time,
      viewProjection: camera.viewProjection,
      baseShape: baseShape(time, segments),
      segments,
      pattern: settings.pattern,
      origins,
      bursts,
      pointer: {
        position: [sprungX.get(), sprungY.get()] as const,
        velocity: [
          sprungX.getVelocity() * aspect,
          sprungY.getVelocity(),
        ] as const,
        strength: push.get() * (calm ? CALM.push : 1),
        radius: pointerRadius,
      },
      keep:
        settings.trails && !calm && !cut && !jump
          ? Math.pow(TRAIL_KEEP, dt * 60)
          : 0,
    };
    const target = output;
    const chain = pipeline;
    frame(gpu, (currentFrame) => chain.encode(currentFrame, target, state));
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const cleanup of [
      () => {
        if (ticking) cancelFrame(tick);
      },
      () => stopJump(),
      () => controls?.stop(),
      () => unsubscribeResize?.(),
      () => intersection?.disconnect(),
      () => cvTarget?.removeEventListener("contentvisibilityautostatechange", onCvChange),
      () => {
        if (typeof document !== "undefined") {
          document.removeEventListener("visibilitychange", onVisibilityChange);
        }
      },
      () => motion?.removeEventListener("change", onMotionPreference),
      () => {
        container?.removeEventListener("pointermove", onPointerMove);
        container?.removeEventListener("pointerdown", onPointerDown);
        container?.removeEventListener("pointerleave", onPointerLeave);
      },
      () => {
        if (typeof window !== "undefined") {
          window.removeEventListener("pointerup", onPointerUp);
          window.removeEventListener("pointercancel", onPointerUp);
        }
      },
      () => {
        for (const value of [
          sprungX,
          sprungY,
          push,
          pointerX,
          pointerY,
          pushTarget,
          playhead,
        ])
          value.destroy();
      },
      () => gpu?.dispose(),
    ]) {
      bestEffort(cleanup);
    }
  };

  const initialize = async () => {
    if (disposed) return;
    const nextGpu = await init({
      requiredLimits: { maxStorageBuffersInVertexStage: 1 },
    });
    if (disposed) {
      nextGpu.dispose();
      return;
    }
    gpu = nextGpu;
    output = surface(gpu, canvas, { dpr: [1, MAX_DPR] });
    motion =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : undefined;
    settings.calm = motion?.matches ?? false;
    pipeline = createPipeline(gpu, { count: settings.count });
    rebake();
    applyLook();
    await pipeline.prewarm(output);
    if (disposed) return;

    const chain = pipeline;
    unsubscribeResize = output.onResize(({ width, height, dpr }) => {
      size = [width, height];
      pointerRadius = Math.min(
        Math.max((Math.min(width, height) / dpr) * 0.17, 56),
        150
      );
      chain.resize([width, height], dpr);
    });
    motion?.addEventListener("change", onMotionPreference);
    container?.addEventListener("pointermove", onPointerMove);
    container?.addEventListener("pointerdown", onPointerDown);
    container?.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    cvTarget =
      canvas.closest(
        ".deferred-slogan, .deferred-section, .deferred-works, .deferred-gallery, .deferred-footer, .deferred-lab"
      ) ?? canvas;
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
      intersection.observe(canvas);
    }

    controls = animate(timelineSequence(playhead), { repeat: Infinity });
    applySpeed();
    started = true;
    reconcileLoop();
  };

  const ready = initialize().catch((error: unknown) => {
    if (!disposed) {
      dispose();
      throw error;
    }
  });

  return {
    ready,
    dispose,
    jumpTo,
    burst: () => fireBurst([0, 0]),
    setPlaying,
  };
}
