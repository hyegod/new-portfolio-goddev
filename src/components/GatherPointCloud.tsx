"use client";

import { useEffect, useRef, useState } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import type { PointCloudData } from "@/lib/pointCloudGenerator";

export type TravelMode = "swarm" | "melt";
export type WhitePaperMode = "negative" | "true";

export interface GatherDrawOptions {
  track: boolean;
  links: boolean;
  scan: boolean;
  marks: boolean;
}

export interface GatherPointCloudProps {
  cloud: PointCloudData;
  pointCount: number;
  drift?: number; // 0..100
  splash?: number; // 0..100
  gather?: number; // 0..100 (transition speed)
  depth?: number; // 0..100
  lightOn?: boolean;
  lightHex?: string;
  paperLight?: boolean;
  whiteMode?: WhitePaperMode;
  travelMode?: TravelMode;
  draw?: GatherDrawOptions;
  denseTrackers?: boolean;
  paused?: boolean;
  interactive?: boolean;
  ambientInteractive?: boolean;
  pulseTrigger?: number;
  showHud?: boolean;
  showGimbal?: boolean;
  cameraDistance?: number;
  pointSizeScale?: number;
  maxDpr?: number;
  className?: string;
  ariaLabel?: string;
}

const VERTEX_SHADER = /* glsl */ `
  attribute vec3 aTargetPosition;
  attribute vec3 aFromColor;
  attribute vec3 aToColor;
  attribute vec4 aSeed;

  uniform float uTime;
  uniform float uMorph;
  uniform float uDrift;
  uniform float uSplash;
  uniform float uDepth;
  uniform float uTravelMode;
  uniform float uPointScale;
  uniform float uPixelRatio;
  uniform vec2 uPointer;

  varying vec3 vColor;
  varying float vDepth;
  varying float vBurst;
  varying float vSeed;

  float smoothstep01(float x) {
    float c = clamp(x, 0.0, 1.0);
    return c * c * (3.0 - 2.0 * c);
  }

  void main() {
    // Staggered per-particle morph curve so particles sweep like living sand
    float delay = aSeed.w * 0.28;
    float localMorph = smoothstep01((uMorph - delay) / (1.0 - delay));

    vec3 pFrom = vec3(position.x, position.y, position.z * uDepth);
    vec3 pTo = vec3(aTargetPosition.x, aTargetPosition.y, aTargetPosition.z * uDepth);

    vec3 pos = mix(pFrom, pTo, localMorph);

    // Mid-transition scatter / splash burst
    float burst = sin(localMorph * 3.14159265);
    vBurst = burst;

    vec3 randDir = normalize(aSeed.xyz + vec3(0.0001));
    if (uTravelMode < 0.5) {
      // SWARM mode: swirling 3D vortex dispersion
      float swirlAngle = burst * (1.8 + aSeed.w * 2.4) * uSplash;
      float s = sin(swirlAngle);
      float c = cos(swirlAngle);
      vec2 rotated = mat2(c, -s, s, c) * pos.xy;
      pos.xy = mix(pos.xy, rotated, burst * 0.85);
      pos += randDir * burst * (0.55 + aSeed.w * 0.95) * uSplash;
    } else {
      // MELT mode: fluid radial + vertical drip dissolution
      float wave = sin(pos.x * 5.0 + uTime * 2.5 + aSeed.w * 6.2831);
      pos.y -= burst * (0.45 + aSeed.w * 0.75) * uSplash;
      pos.x += wave * burst * 0.38 * uSplash;
      pos.z += (aSeed.z * 0.85) * burst * uSplash;
    }

    // Continuous organic breathing drift
    float t = uTime * 0.55;
    vec3 driftVec = vec3(
      sin(t + pos.y * 2.4 + aSeed.x * 6.2831),
      cos(t * 0.85 + pos.x * 2.4 + aSeed.y * 6.2831),
      sin(t * 1.1 + (pos.x + pos.y) * 1.9 + aSeed.z * 6.2831)
    );
    pos += driftVec * (0.012 + uDrift * 0.052) * (0.45 + aSeed.w * 0.7);

    // Subtle magnetic ripple around cursor pointer
    vec2 toPointer = pos.xy - uPointer * 1.35;
    float pDist = length(toPointer);
    float ripple = exp(-pDist * pDist * 4.5) * 0.14;
    pos.xy += normalize(toPointer + vec2(0.0001)) * ripple * (0.4 + uDrift * 0.6);
    pos.z += ripple * 1.1;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float depthAtten = clamp(3.4 / max(0.8, -mvPosition.z), 0.55, 2.4);
    float baseSize = (1.35 + aSeed.w * 1.65) * uPointScale * uPixelRatio;
    gl_PointSize = clamp(baseSize * depthAtten * (1.0 + burst * 0.35), 1.0, 9.0);

    vColor = mix(aFromColor, aToColor, localMorph);
    vDepth = clamp((pos.z + 1.1) * 0.5, 0.0, 1.0);
    vSeed = aSeed.w;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uLightOn;
  uniform vec3 uLightColor;
  uniform float uPaperLight;
  uniform float uWhiteTrue;

  varying vec3 vColor;
  varying float vDepth;
  varying float vBurst;
  varying float vSeed;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv);
    if (dist > 0.5) discard;

    float softDot = smoothstep(0.5, 0.08, dist);
    float luma = dot(vColor, vec3(0.299, 0.587, 0.114));

    vec3 col;
    float alpha;

    if (uPaperLight > 0.5) {
      // ON WHITE PAPER: dark architectural ink + cobalt-blue highlights
      vec3 inkColor = vec3(0.05, 0.06, 0.09);
      vec3 cobaltTint = mix(vec3(0.0, 0.22, 1.0), uLightColor, 0.35);
      if (uWhiteTrue > 0.5) {
        // TRUE mode preserves tinted photographic color darkened for light paper
        col = mix(vColor * 0.78, cobaltTint, uLightOn * 0.28 + vBurst * 0.22);
      } else {
        // NEGATIVE mode: high-contrast ink stipple with cobalt luminous edge
        float inv = clamp(luma * 1.15, 0.08, 1.0);
        col = mix(inkColor, cobaltTint, clamp(uLightOn * 0.62 + vBurst * 0.45 + (1.0 - vDepth) * 0.2, 0.0, 1.0));
        col = mix(col, inkColor, 1.0 - inv);
      }
      alpha = softDot * clamp(0.16 + luma * 0.78 + uLightOn * 0.12, 0.08, 0.92);
    } else {
      // DARK MATTE BLACK CANVAS (authentic Gather aesthetic)
      vec3 baseTone = mix(vec3(luma), vColor, 0.42);
      vec3 illuminated = baseTone * mix(vec3(1.0), uLightColor * 1.38, 0.48 + uLightOn * 0.52);
      col = mix(baseTone * (0.72 + vDepth * 0.38), illuminated * (0.85 + vDepth * 0.45), 0.35 + uLightOn * 0.65);
      col += uLightColor * vBurst * 0.18;
      alpha = softDot * clamp(0.18 + luma * 0.72 + uLightOn * 0.2, 0.1, 0.96);
    }

    gl_FragColor = vec4(col, alpha);
  }
`;

export function GatherPointCloud({
  cloud,
  pointCount,
  drift = 72,
  splash = 70,
  gather = 38,
  depth = 80,
  lightOn = true,
  lightHex = "#ffe9c4",
  paperLight = false,
  whiteMode = "negative",
  travelMode = "swarm",
  draw = { track: true, links: true, scan: false, marks: true },
  denseTrackers = false,
  paused = false,
  interactive = true,
  ambientInteractive = false,
  pulseTrigger = 0,
  showHud = true,
  showGimbal = true,
  cameraDistance = 3.55,
  pointSizeScale = 1.0,
  maxDpr = 2,
  className = "",
  ariaLabel = "Interactive 3D point cloud visualization",
}: GatherPointCloudProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  // Live reactive uniforms/config stored in ref so animation loop never re-mounts WebGL
  const configRef = useRef({
    drift,
    splash,
    gather,
    depth,
    lightOn,
    lightHex,
    paperLight,
    whiteMode,
    travelMode,
    draw,
    denseTrackers,
    paused,
    interactive,
    ambientInteractive,
    showHud,
    showGimbal,
    cameraDistance,
    pointSizeScale,
    maxDpr,
  });

  const dirtyRef = useRef(true);
  dirtyRef.current = true;

  configRef.current = {
    drift,
    splash,
    gather,
    depth,
    lightOn,
    lightHex,
    paperLight,
    whiteMode,
    travelMode,
    draw,
    denseTrackers,
    paused,
    interactive,
    ambientInteractive,
    showHud,
    showGimbal,
    cameraDistance,
    pointSizeScale,
    maxDpr,
  };

  // State shared between cloud-change effect and Three.js loop
  const engineRef = useRef<{
    geometry: BufferGeometry | null;
    material: ShaderMaterial | null;
    morphProgress: number;
    currentAnchors: [number, number, number][];
    targetAnchors: [number, number, number][];
    label: string;
    isSeeking: boolean;
    reducedMotion: boolean;
    isVisible: boolean;
    setNextCloud: ((next: PointCloudData) => void) | null;
    triggerBurst: (() => void) | null;
  }>({
    geometry: null,
    material: null,
    morphProgress: 1,
    currentAnchors: cloud.anchors,
    targetAnchors: cloud.anchors,
    label: cloud.label,
    isSeeking: false,
    reducedMotion: false,
    isVisible: true,
    setNextCloud: null,
    triggerBurst: null,
  });

  // Trigger scatter -> gather morph when `cloud` changes
  useEffect(() => {
    engineRef.current.setNextCloud?.(cloud);
  }, [cloud]);

  // Trigger particle scatter -> re-gather shockwave pulse on external click/tap
  useEffect(() => {
    if (pulseTrigger > 0) {
      engineRef.current.triggerBurst?.();
    }
  }, [pulseTrigger]);

  useEffect(() => {
    const container = containerRef.current;
    const glCanvas = webglCanvasRef.current;
    const hudCanvas = hudCanvasRef.current;
    if (!container || !glCanvas || !hudCanvas) return;

    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    engineRef.current.reducedMotion = motionMq.matches;
    const onMotionChange = (e: MediaQueryListEvent) => {
      engineRef.current.reducedMotion = e.matches;
      dirtyRef.current = true;
    };
    motionMq.addEventListener("change", onMotionChange);

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        canvas: glCanvas,
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglFailed(true);
      motionMq.removeEventListener("change", onMotionChange);
      return;
    }

    const scene = new Scene();
    const camera = new PerspectiveCamera(42, 1, 0.1, 30);
    camera.position.set(0, 0, configRef.current.cameraDistance);

    const geometry = new BufferGeometry();
    const fromPos = new Float32Array(cloud.positions);
    const toPos = new Float32Array(cloud.positions);
    const fromCol = new Float32Array(cloud.colors);
    const toCol = new Float32Array(cloud.colors);
    const seeds = new Float32Array(pointCount * 4);

    // Deterministic per-particle random seeds
    let s = 133791;
    const nextRand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let i = 0; i < pointCount; i++) {
      const i4 = i * 4;
      seeds[i4] = nextRand() * 2 - 1;
      seeds[i4 + 1] = nextRand() * 2 - 1;
      seeds[i4 + 2] = nextRand() * 2 - 1;
      seeds[i4 + 3] = nextRand();
    }

    const posAttr = new BufferAttribute(fromPos, 3);
    const targetPosAttr = new BufferAttribute(toPos, 3);
    const fromColAttr = new BufferAttribute(fromCol, 3);
    const toColAttr = new BufferAttribute(toCol, 3);
    const seedAttr = new BufferAttribute(seeds, 4);

    geometry.setAttribute("position", posAttr);
    geometry.setAttribute("aTargetPosition", targetPosAttr);
    geometry.setAttribute("aFromColor", fromColAttr);
    geometry.setAttribute("aToColor", toColAttr);
    geometry.setAttribute("aSeed", seedAttr);

    let lastLightHex = configRef.current.lightHex;
    const initialColor = new Color(lastLightHex);
    const uniforms = {
      uTime: { value: 0 },
      uMorph: { value: 1 },
      uDrift: { value: configRef.current.drift / 100 },
      uSplash: { value: configRef.current.splash / 100 },
      uDepth: { value: 0.4 + (configRef.current.depth / 100) * 1.15 },
      uTravelMode: { value: configRef.current.travelMode === "melt" ? 1 : 0 },
      uLightOn: { value: configRef.current.lightOn ? 1 : 0 },
      uLightColor: { value: initialColor },
      uPaperLight: { value: configRef.current.paperLight ? 1 : 0 },
      uWhiteTrue: { value: configRef.current.whiteMode === "true" ? 1 : 0 },
      uPointer: { value: new Vector2(99, 99) },
      uPixelRatio: {
        value: Math.min(window.devicePixelRatio || 1, configRef.current.maxDpr),
      },
      uPointScale: { value: configRef.current.pointSizeScale },
    };

    const material = new ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: configRef.current.paperLight
        ? NormalBlending
        : AdditiveBlending,
    });

    const points = new Points(geometry, material);
    scene.add(points);

    engineRef.current.geometry = geometry;
    engineRef.current.material = material;
    engineRef.current.currentAnchors = cloud.anchors;
    engineRef.current.targetAnchors = cloud.anchors;
    engineRef.current.label = cloud.label;

    engineRef.current.setNextCloud = (next: PointCloudData) => {
      // Snapshot current target as the new start position
      const pArr = posAttr.array as Float32Array;
      const tArr = targetPosAttr.array as Float32Array;
      const fcArr = fromColAttr.array as Float32Array;
      const tcArr = toColAttr.array as Float32Array;

      pArr.set(tArr);
      fcArr.set(tcArr);

      const copyLen = Math.min(tArr.length, next.positions.length);
      tArr.set(next.positions.subarray(0, copyLen));
      tcArr.set(next.colors.subarray(0, copyLen));

      posAttr.needsUpdate = true;
      targetPosAttr.needsUpdate = true;
      fromColAttr.needsUpdate = true;
      toColAttr.needsUpdate = true;

      engineRef.current.currentAnchors = engineRef.current.targetAnchors;
      engineRef.current.targetAnchors = next.anchors;
      engineRef.current.label = next.label;
      engineRef.current.morphProgress = engineRef.current.reducedMotion ? 0.85 : 0;
      engineRef.current.isSeeking = true;
      dirtyRef.current = true;
    };

    engineRef.current.triggerBurst = () => {
      if (engineRef.current.reducedMotion) return;
      engineRef.current.morphProgress = 0;
      engineRef.current.isSeeking = true;
      dirtyRef.current = true;
    };

    // Orbit rotation, momentum inertia, pinch-to-zoom, and touch-ripple state
    let rotY = -0.22;
    let rotX = 0.14;
    let targetRotY = -0.22;
    let targetRotX = 0.14;
    let velY = 0;
    let velX = 0;

    let currentZoom = 1.0;
    let targetZoom = 1.0;
    const MIN_ZOOM = 0.46; // zoom in close (~2.15x)
    const MAX_ZOOM = 1.85; // zoom out wide (~0.54x)

    const activePointers = new Map<number, { x: number; y: number; type: string }>();
    let lastSingleX = 0;
    let lastSingleY = 0;
    let downX = 0;
    let downY = 0;
    let downTime = 0;
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;
    let prevPinchDist = 0;
    let prevPinchMidX = 0;
    let prevPinchMidY = 0;
    let touchRippleTimer = 0;

    const pointerTarget = new Vector2(99, 99);
    const pointerSmooth = new Vector2(99, 99);

    const updateNormalizedPointer = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const nx = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const ny = -(((clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
      pointerTarget.set(nx, ny);
      dirtyRef.current = true;
    };

    const getTwoPointers = () => {
      const iter = activePointers.values();
      const a = iter.next().value;
      const b = iter.next().value;
      return a && b ? ([a, b] as const) : null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!configRef.current.interactive) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      window.clearTimeout(touchRippleTimer);
      activePointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        type: e.pointerType,
      });

      try {
        glCanvas.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if capture is unsupported
      }

      if (activePointers.size === 1) {
        lastSingleX = e.clientX;
        lastSingleY = e.clientY;
        downX = e.clientX;
        downY = e.clientY;
        downTime = performance.now();
        velX = 0;
        velY = 0;
        updateNormalizedPointer(e.clientX, e.clientY);
      } else if (activePointers.size === 2) {
        const pair = getTwoPointers();
        if (pair) {
          const [p1, p2] = pair;
          prevPinchDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          prevPinchMidX = (p1.x + p2.x) * 0.5;
          prevPinchMidY = (p1.y + p2.y) * 0.5;
          updateNormalizedPointer(prevPinchMidX, prevPinchMidY);
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!configRef.current.interactive) return;

      if (!activePointers.has(e.pointerId)) {
        // Desktop mouse hover (no active button drag) drives live magnetic particle ripple
        if (e.pointerType === "mouse") {
          updateNormalizedPointer(e.clientX, e.clientY);
        }
        return;
      }

      activePointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        type: e.pointerType,
      });

      if (activePointers.size === 1) {
        const dx = e.clientX - lastSingleX;
        const dy = e.clientY - lastSingleY;
        lastSingleX = e.clientX;
        lastSingleY = e.clientY;

        const sensitivity = e.pointerType === "touch" ? 0.0085 : 0.0075;
        targetRotY += dx * sensitivity;
        targetRotX = Math.max(-1.15, Math.min(1.15, targetRotX + dy * sensitivity));
        velY = dx * sensitivity * 0.42;
        velX = dy * sensitivity * 0.35;
        updateNormalizedPointer(e.clientX, e.clientY);
      } else if (activePointers.size >= 2) {
        const pair = getTwoPointers();
        if (pair) {
          const [p1, p2] = pair;
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const midX = (p1.x + p2.x) * 0.5;
          const midY = (p1.y + p2.y) * 0.5;

          if (prevPinchDist > 8 && dist > 8) {
            const ratio = prevPinchDist / dist;
            targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom * ratio));
          }

          // Allow gentle orbit adjustment while pinching with two fingers
          const mdx = midX - prevPinchMidX;
          const mdy = midY - prevPinchMidY;
          targetRotY += mdx * 0.0045;
          targetRotX = Math.max(-1.15, Math.min(1.15, targetRotX + mdy * 0.0045));

          prevPinchDist = dist;
          prevPinchMidX = midX;
          prevPinchMidY = midY;
          updateNormalizedPointer(midX, midY);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const hadPointer = activePointers.delete(e.pointerId);
      if (hadPointer) {
        try {
          if (glCanvas.hasPointerCapture(e.pointerId)) {
            glCanvas.releasePointerCapture(e.pointerId);
          }
        } catch {
          // Ignore release errors
        }
      }

      if (activePointers.size === 1) {
        // Transition smoothly from 2-finger pinch back to 1-finger orbit without jump
        const remaining = activePointers.values().next().value;
        if (remaining) {
          lastSingleX = remaining.x;
          lastSingleY = remaining.y;
        }
        prevPinchDist = 0;
      } else if (activePointers.size === 0) {
        prevPinchDist = 0;

        // Detect quick tap / double-tap on touch & mouse
        const moveDist = Math.hypot(e.clientX - downX, e.clientY - downY);
        const elapsed = performance.now() - downTime;
        if (hadPointer && moveDist < 12 && elapsed < 280) {
          const now = performance.now();
          const tapGap = now - lastTapTime;
          const tapDist = Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY);

          if (tapGap < 320 && tapDist < 34) {
            // Double-tap resets zoom & pitch cleanly
            targetZoom = 1.0;
            targetRotX = 0.14;
            velX = 0;
            velY = 0;
            lastTapTime = 0;
          } else {
            // Single tap emits a tactile magnetic particle pulse at touch coordinates
            lastTapTime = now;
            lastTapX = e.clientX;
            lastTapY = e.clientY;
            updateNormalizedPointer(e.clientX, e.clientY);
          }
        }

        if (e.pointerType !== "mouse") {
          window.clearTimeout(touchRippleTimer);
          touchRippleTimer = window.setTimeout(() => {
            if (activePointers.size === 0) {
              pointerTarget.set(99, 99);
            }
          }, 420);
        }
      }
    };

    const onPointerLeave = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && activePointers.size === 0) {
        pointerTarget.set(99, 99);
      }
    };

    // Laptop trackpad pinch-to-zoom (fires wheel with ctrlKey=true) without blocking normal vertical scroll
    const onWheel = (e: WheelEvent) => {
      if (!configRef.current.interactive) return;
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const factor = Math.exp(e.deltaY * 0.0045);
      targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom * factor));
    };

    // Ambient passive pointer tracking for non-blocking Hero interactivity (never hijacks mobile scroll)
    let ambientTargetTiltY = 0;
    let ambientTargetTiltX = 0;
    let ambientTiltY = 0;
    let ambientTiltX = 0;
    let ambientResetTimer = 0;

    const onWindowPointerMove = (e: PointerEvent) => {
      if (!configRef.current.ambientInteractive || configRef.current.interactive) return;
      const rect = container.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        if (e.pointerType === "mouse") {
          pointerTarget.set(99, 99);
          ambientTargetTiltY = 0;
          ambientTargetTiltX = 0;
        }
        return;
      }

      const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
      pointerTarget.set(nx, ny);
      ambientTargetTiltY = nx * 0.28;
      ambientTargetTiltX = -ny * 0.16;
      dirtyRef.current = true;

      if (e.pointerType !== "mouse") {
        window.clearTimeout(ambientResetTimer);
        ambientResetTimer = window.setTimeout(() => {
          pointerTarget.set(99, 99);
          ambientTargetTiltY = 0;
          ambientTargetTiltX = 0;
        }, 650);
      }
    };

    const onWindowPointerDown = (e: PointerEvent) => {
      if (!configRef.current.ambientInteractive || configRef.current.interactive) return;
      const rect = container.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        return;
      }
      const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
      pointerTarget.set(nx, ny);
      ambientTargetTiltY = nx * 0.3;
      ambientTargetTiltX = -ny * 0.18;
      dirtyRef.current = true;

      window.clearTimeout(ambientResetTimer);
      ambientResetTimer = window.setTimeout(() => {
        if (e.pointerType !== "mouse") {
          pointerTarget.set(99, 99);
          ambientTargetTiltY = 0;
          ambientTargetTiltX = 0;
        }
      }, 650);
    };

    glCanvas.addEventListener("pointerdown", onPointerDown);
    glCanvas.addEventListener("pointermove", onPointerMove);
    glCanvas.addEventListener("pointerup", onPointerUp);
    glCanvas.addEventListener("pointercancel", onPointerUp);
    glCanvas.addEventListener("pointerleave", onPointerLeave);
    glCanvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointermove", onWindowPointerMove, { passive: true });
    window.addEventListener("pointerdown", onWindowPointerDown, { passive: true });

    // Sizing with ResizeObserver
    let width = 1;
    let height = 1;
    const hudCtx = hudCanvas.getContext("2d");

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, configRef.current.maxDpr);

      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      uniforms.uPixelRatio.value = dpr;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      hudCanvas.width = Math.floor(width * dpr);
      hudCanvas.height = Math.floor(height * dpr);
      if (hudCtx) {
        hudCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      dirtyRef.current = true;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // Modern Web Guidance: Pause WebGL rendering off-screen via contentvisibilityautostatechange
    // with IntersectionObserver + Page Visibility fallback
    let rafId = 0;
    let lastTimestamp = performance.now();
    const tempVec = new Vector3();
    const scratchAnchorVec = new Vector3();
    const scratchAxisA = new Vector3();
    const scratchAxisB = new Vector3();
    const cornerVecs = [
      new Vector3(-1.32, 1.32, 0),
      new Vector3(1.32, 1.32, 0),
      new Vector3(1.32, -1.32, 0),
      new Vector3(-1.32, -1.32, 0),
    ];

    const project3D = (v: Vector3): [number, number, number] => {
      tempVec.copy(v).applyEuler(points.rotation);
      tempVec.project(camera);
      return [
        (tempVec.x * 0.5 + 0.5) * width,
        (-tempVec.y * 0.5 + 0.5) * height,
        tempVec.z,
      ];
    };

    const drawHudOverlay = (timeSec: number) => {
      if (!hudCtx) return;
      hudCtx.clearRect(0, 0, width, height);

      const cfg = configRef.current;
      if (!cfg.showHud) return;

      const isLight = cfg.paperLight;
      const lineStroke = isLight
        ? "rgba(13, 14, 18, 0.22)"
        : "rgba(255, 255, 255, 0.22)";
      const strongStroke = isLight
        ? "rgba(0, 56, 255, 0.72)"
        : "rgba(255, 240, 214, 0.72)";
      const labelColor = isLight
        ? "rgba(13, 14, 18, 0.68)"
        : "rgba(255, 255, 255, 0.68)";
      const dimLabel = isLight
        ? "rgba(13, 14, 18, 0.40)"
        : "rgba(255, 255, 255, 0.38)";

      hudCtx.save();
      const compactHud = width < 400;
      hudCtx.font = compactHud
        ? '500 8.5px "JetBrains Mono", ui-monospace, monospace'
        : '500 10px "JetBrains Mono", ui-monospace, monospace';

      // 1. 3D Technical Viewfinder Frame + ruler ticks (MARKS)
      if (cfg.draw.marks) {
        const pts = cornerVecs.map((c) => project3D(c));
        hudCtx.strokeStyle = lineStroke;
        hudCtx.lineWidth = 1;

        for (let edge = 0; edge < 4; edge++) {
          const [x1, y1] = pts[edge];
          const [x2, y2] = pts[(edge + 1) % 4];

          hudCtx.beginPath();
          hudCtx.moveTo(x1, y1);
          hudCtx.lineTo(x2, y2);
          hudCtx.stroke();

          // Tick ruler notches along each 3D frame edge
          const ticks = 18;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;

          for (let t = 1; t < ticks; t++) {
            const frac = t / ticks;
            const tx = x1 + dx * frac;
            const ty = y1 + dy * frac;
            const tickLen = t % 6 === 0 ? 7 : 3.5;
            hudCtx.beginPath();
            hudCtx.moveTo(tx, ty);
            hudCtx.lineTo(tx + nx * tickLen, ty + ny * tickLen);
            hudCtx.stroke();
          }

          // Corner '+' crosshairs
          hudCtx.beginPath();
          hudCtx.moveTo(x1 - 7, y1);
          hudCtx.lineTo(x1 + 7, y1);
          hudCtx.moveTo(x1, y1 - 7);
          hudCtx.lineTo(x1, y1 + 7);
          hudCtx.stroke();
        }

        // Frame edge telemetry captions (skip on ambient non-interactive Hero or ultra-narrow screens)
        if (cfg.interactive && width >= 360) {
          hudCtx.fillStyle = dimLabel;
          const capX = Math.max(12, Math.min(width - 140, pts[3][0] + 6));
          const capY = Math.max(24, Math.min(height - 14, pts[3][1] + 16));
          const zoomPct = (1 / currentZoom).toFixed(1);
          const zoomSuffix = Math.abs(currentZoom - 1) > 0.04 ? ` · ${zoomPct}×` : "";
          hudCtx.fillText(
            `${pointCount.toLocaleString("en-US")} PTS · ${engineRef.current.label}${zoomSuffix}`,
            capX,
            capY
          );
          const driftX = Math.max(12, Math.min(width - 66, pts[1][0] - 58));
          const driftY = Math.max(20, Math.min(height - 20, pts[1][1] - 8));
          hudCtx.fillText(
            `DRIFT ${String(Math.round(cfg.drift)).padStart(2, "0")}`,
            driftX,
            driftY
          );
        }
      }

      // 2. Projected 3D Trackers & Constellation Links
      const m = engineRef.current.morphProgress;
      const seeking = m < 0.92;
      const anchorsA = engineRef.current.currentAnchors;
      const anchorsB = engineRef.current.targetAnchors;
      const count = cfg.denseTrackers
        ? Math.min(8, anchorsB.length)
        : Math.min(5, anchorsB.length);

      const projectedTrackers: { x: number; y: number; wx: number; wy: number; wz: number; idx: number }[] = [];
      const depthScale = 0.4 + (cfg.depth / 100) * 1.15;

      for (let i = 0; i < count; i++) {
        const a = anchorsA[i % anchorsA.length];
        const b = anchorsB[i % anchorsB.length];
        const ease = m * m * (3 - 2 * m);
        const wx = a[0] + (b[0] - a[0]) * ease;
        const wy = a[1] + (b[1] - a[1]) * ease;
        const wz = (a[2] + (b[2] - a[2]) * ease) * depthScale;

        scratchAnchorVec.set(wx, wy, wz);
        const [sx, sy] = project3D(scratchAnchorVec);
        projectedTrackers.push({ x: sx, y: sy, wx, wy, wz, idx: i + 1 });
      }

      if (cfg.draw.links && projectedTrackers.length > 1) {
        hudCtx.strokeStyle = isLight
          ? "rgba(0, 56, 255, 0.25)"
          : "rgba(255, 255, 255, 0.24)";
        hudCtx.lineWidth = 0.8;
        hudCtx.beginPath();
        for (let i = 0; i < projectedTrackers.length - 1; i++) {
          const p1 = projectedTrackers[i];
          const p2 = projectedTrackers[i + 1];
          hudCtx.moveTo(p1.x, p1.y);
          hudCtx.lineTo(p2.x, p2.y);
        }
        hudCtx.stroke();
      }

      if (cfg.draw.track) {
        for (const tr of projectedTrackers) {
          const box = 11;
          const arm = 4;
          hudCtx.strokeStyle = seeking ? strongStroke : labelColor;
          hudCtx.lineWidth = 1;

          // Four corner brackets
          hudCtx.beginPath();
          // TL
          hudCtx.moveTo(tr.x - box, tr.y - box + arm);
          hudCtx.lineTo(tr.x - box, tr.y - box);
          hudCtx.lineTo(tr.x - box + arm, tr.y - box);
          // TR
          hudCtx.moveTo(tr.x + box - arm, tr.y - box);
          hudCtx.lineTo(tr.x + box, tr.y - box);
          hudCtx.lineTo(tr.x + box, tr.y - box + arm);
          // BR
          hudCtx.moveTo(tr.x + box, tr.y + box - arm);
          hudCtx.lineTo(tr.x + box, tr.y + box);
          hudCtx.lineTo(tr.x + box - arm, tr.y + box);
          // BL
          hudCtx.moveTo(tr.x - box + arm, tr.y + box);
          hudCtx.lineTo(tr.x - box, tr.y + box);
          hudCtx.lineTo(tr.x - box, tr.y + box - arm);
          // Center crosshair
          hudCtx.moveTo(tr.x - 2.5, tr.y);
          hudCtx.lineTo(tr.x + 2.5, tr.y);
          hudCtx.moveTo(tr.x, tr.y - 2.5);
          hudCtx.lineTo(tr.x, tr.y + 2.5);
          hudCtx.stroke();

          const idStr = String(tr.idx).padStart(2, "0");
          const fmt = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
          const txt = compactHud
            ? seeking
              ? `${idStr}·S`
              : idStr
            : seeking
              ? `${idStr} SEEK`
              : `${idStr} ${fmt(tr.wx)} ${fmt(tr.wy)} ${fmt(tr.wz)}`;

          hudCtx.fillStyle = labelColor;
          const labelX = Math.min(width - (compactHud ? 26 : 118), Math.max(8, tr.x + box + 6));
          hudCtx.fillText(txt, labelX, tr.y + 3);
        }
      }

      // 3. Sweeping Optical Scan Line (SCAN)
      if (cfg.draw.scan) {
        const scanY = ((timeSec * 0.22) % 1) * height;
        const grad = hudCtx.createLinearGradient(0, scanY - 26, 0, scanY + 2);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(
          1,
          isLight ? "rgba(0, 56, 255, 0.25)" : "rgba(255, 233, 196, 0.28)"
        );
        hudCtx.fillStyle = grad;
        hudCtx.fillRect(0, scanY - 26, width, 28);

        hudCtx.strokeStyle = strongStroke;
        hudCtx.lineWidth = 1;
        hudCtx.beginPath();
        hudCtx.moveTo(0, scanY);
        hudCtx.lineTo(width, scanY);
        hudCtx.stroke();
      }

      // 4. Bottom-Right 3D LINE Orientation Gimbal (signature Gather widget)
      if (cfg.showGimbal && width > 420) {
        const gx = width - 48;
        const gy = height - 48;
        const size = 24;

        hudCtx.strokeStyle = lineStroke;
        hudCtx.lineWidth = 1;
        hudCtx.strokeRect(gx - size, gy - size, size * 2, size * 2);

        hudCtx.fillStyle = dimLabel;
        hudCtx.fillText("LINE", gx - 13, gy - size - 8);

        // Project a 3D vertical axis vector through the current rotation (zero-allocation scratch vectors)
        scratchAxisA.set(0, 1, 0).applyEuler(points.rotation);
        scratchAxisB.set(0.42, 0, 0).applyEuler(points.rotation);

        hudCtx.strokeStyle = strongStroke;
        hudCtx.lineWidth = 1.25;
        hudCtx.beginPath();
        hudCtx.moveTo(gx - scratchAxisA.x * 18, gy + scratchAxisA.y * 18);
        hudCtx.lineTo(gx + scratchAxisA.x * 18, gy - scratchAxisA.y * 18);
        hudCtx.stroke();

        // Cross tick
        hudCtx.beginPath();
        hudCtx.moveTo(gx, gy);
        hudCtx.lineTo(gx + scratchAxisB.x * 18, gy - scratchAxisB.y * 18);
        hudCtx.stroke();

        // End nodes
        hudCtx.fillStyle = isLight ? "#0038ff" : "#ffe9c4";
        hudCtx.beginPath();
        hudCtx.arc(gx + scratchAxisA.x * 18, gy - scratchAxisA.y * 18, 2.3, 0, Math.PI * 2);
        hudCtx.arc(gx - scratchAxisA.x * 18, gy + scratchAxisA.y * 18, 2.3, 0, Math.PI * 2);
        hudCtx.fill();
      }

      hudCtx.restore();
    };

    const renderFrame = (now: number) => {
      rafId = 0;
      if (!engineRef.current.isVisible || document.hidden) return;

      const dt = Math.min(0.05, (now - lastTimestamp) / 1000);
      lastTimestamp = now;

      const cfg = configRef.current;
      const isPaused = cfg.paused;

      if (!isPaused) {
        const motionFactor = engineRef.current.reducedMotion ? 0.25 : 1.0;
        uniforms.uTime.value += dt * motionFactor;

        // Advance scatter -> gather transition smoothly
        if (engineRef.current.morphProgress < 1) {
          const speed = 0.42 + (cfg.gather / 100) * 1.15;
          engineRef.current.morphProgress = Math.min(
            1,
            engineRef.current.morphProgress + dt * speed
          );
        } else {
          engineRef.current.isSeeking = false;
        }

        // Gentle autonomous orbit when not touching/dragging + smooth release inertia
        const isInteracting = activePointers.size > 0;
        if (!isInteracting) {
          if (Math.abs(velY) > 0.0001 || Math.abs(velX) > 0.0001) {
            targetRotY += velY;
            targetRotX = Math.max(-1.15, Math.min(1.15, targetRotX + velX));
            const damp = Math.pow(0.06, dt);
            velY *= damp;
            velX *= damp;
          } else if (!engineRef.current.reducedMotion) {
            targetRotY += dt * (0.06 + (cfg.drift / 100) * 0.08);
            targetRotX = Math.sin(uniforms.uTime.value * 0.35) * 0.14;
          }
        }
      }

      const isInteracting = activePointers.size > 0;
      const isEasing =
        Math.abs(targetRotY - rotY) > 0.0005 ||
        Math.abs(targetRotX - rotX) > 0.0005 ||
        Math.abs(targetZoom - currentZoom) > 0.0005 ||
        pointerSmooth.distanceToSquared(pointerTarget) > 0.0004 ||
        engineRef.current.morphProgress < 1;

      if (isPaused && !isInteracting && !isEasing && !dirtyRef.current) {
        rafId = requestAnimationFrame(renderFrame);
        return;
      }
      dirtyRef.current = false;

      rotY += (targetRotY - rotY) * Math.min(1, dt * 8);
      rotX += (targetRotX - rotX) * Math.min(1, dt * 8);
      ambientTiltY += (ambientTargetTiltY - ambientTiltY) * Math.min(1, dt * 5);
      ambientTiltX += (ambientTargetTiltX - ambientTiltX) * Math.min(1, dt * 5);
      currentZoom += (targetZoom - currentZoom) * Math.min(1, dt * 9);

      points.rotation.set(rotX + ambientTiltX, rotY + ambientTiltY, 0);
      const aspect = width / Math.max(1, height);
      const aspectBoost = aspect < 1 ? Math.min(1.6, 1 / Math.max(0.62, aspect)) : 1;
      camera.position.z = cfg.cameraDistance * aspectBoost * currentZoom;

      // Sync uniforms (only parse hex color when it actually changed)
      uniforms.uMorph.value = engineRef.current.morphProgress;
      uniforms.uDrift.value = engineRef.current.reducedMotion
        ? (cfg.drift / 100) * 0.2
        : cfg.drift / 100;
      uniforms.uSplash.value = engineRef.current.reducedMotion
        ? (cfg.splash / 100) * 0.25
        : cfg.splash / 100;
      uniforms.uDepth.value = 0.38 + (cfg.depth / 100) * 1.18;
      uniforms.uTravelMode.value = cfg.travelMode === "melt" ? 1 : 0;
      uniforms.uLightOn.value = cfg.lightOn ? 1 : 0;
      if (cfg.lightHex !== lastLightHex) {
        lastLightHex = cfg.lightHex;
        uniforms.uLightColor.value.set(cfg.lightHex);
      }
      uniforms.uPaperLight.value = cfg.paperLight ? 1 : 0;
      uniforms.uWhiteTrue.value = cfg.whiteMode === "true" ? 1 : 0;
      uniforms.uPointScale.value =
        cfg.pointSizeScale * (0.86 + 0.14 / Math.max(0.5, currentZoom));

      const targetBlend = cfg.paperLight ? NormalBlending : AdditiveBlending;
      if (material.blending !== targetBlend) {
        material.blending = targetBlend;
        material.needsUpdate = true;
      }

      pointerSmooth.lerp(pointerTarget, Math.min(1, dt * 8));
      uniforms.uPointer.value.copy(pointerSmooth);

      renderer.render(scene, camera);
      drawHudOverlay(uniforms.uTime.value);

      rafId = requestAnimationFrame(renderFrame);
    };

    const startLoop = () => {
      if (!rafId && engineRef.current.isVisible && !document.hidden) {
        dirtyRef.current = true;
        lastTimestamp = performance.now();
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    const stopLoop = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    // Listen to contentvisibilityautostatechange (direct listener on closest deferred ancestor OR container)
    const onCvChange = (event: Event) => {
      const skipped = (event as Event & { skipped?: boolean }).skipped;
      engineRef.current.isVisible = !skipped;
      if (skipped) stopLoop();
      else startLoop();
    };

    const cvTarget =
      container.closest(".deferred-lab, .deferred-works, .deferred-section") ??
      container;
    cvTarget.addEventListener("contentvisibilityautostatechange", onCvChange);

    // IntersectionObserver fallback + additional off-screen safeguard
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        engineRef.current.isVisible = visible;
        if (visible) startLoop();
        else stopLoop();
      },
      { rootMargin: "180px" }
    );
    io.observe(container);

    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    startLoop();

    return () => {
      stopLoop();
      window.clearTimeout(touchRippleTimer);
      window.clearTimeout(ambientResetTimer);
      ro.disconnect();
      io.disconnect();
      cvTarget.removeEventListener("contentvisibilityautostatechange", onCvChange);
      document.removeEventListener("visibilitychange", onVisibility);
      motionMq.removeEventListener("change", onMotionChange);
      glCanvas.removeEventListener("pointerdown", onPointerDown);
      glCanvas.removeEventListener("pointermove", onPointerMove);
      glCanvas.removeEventListener("pointerup", onPointerUp);
      glCanvas.removeEventListener("pointercancel", onPointerUp);
      glCanvas.removeEventListener("pointerleave", onPointerLeave);
      glCanvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerdown", onWindowPointerDown);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      engineRef.current.setNextCloud = null;
      engineRef.current.triggerBurst = null;
    };
    // Intentionally mounted once per pointCount; live updates flow through refs & setNextCloud
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointCount]);

  if (webglFailed) {
    return (
      <div
        className={`flex items-center justify-center border border-current/20 p-6 font-mono text-xs ${className}`}
        role="img"
        aria-label={ariaLabel}
      >
        WEBGL POINT-CLOUD FALLBACK // {cloud.label}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full select-none overflow-hidden ${className}`}
      role="img"
      aria-label={ariaLabel}
    >
      <canvas
        ref={webglCanvasRef}
        className={`block h-full w-full ${interactive ? "touch-none cursor-grab active:cursor-grabbing" : "pointer-events-none"}`}
      />
      <canvas
        ref={hudCanvasRef}
        className="pointer-events-none absolute inset-0 block h-full w-full"
        aria-hidden="true"
      />
    </div>
  );
}
