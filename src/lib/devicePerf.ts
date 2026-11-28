"use client";

import { useEffect, useState, type RefObject } from "react";

export type DevicePerfTier = "high" | "medium" | "low";

export interface PerformanceProfile {
  tier: DevicePerfTier;
  heroPoints: number;
  worksPoints: number;
  galleryPoints: number;
  maxDpr: number;
  pointSizeBoost: number;
  isTouchOnly: boolean;
}

const PROFILES: Record<DevicePerfTier, Omit<PerformanceProfile, "isTouchOnly">> = {
  high: {
    tier: "high",
    heroPoints: 16000,
    worksPoints: 30000,
    galleryPoints: 52000,
    maxDpr: 1.75,
    pointSizeBoost: 1,
  },
  medium: {
    tier: "medium",
    heroPoints: 10000,
    worksPoints: 18000,
    galleryPoints: 32000,
    maxDpr: 1.4,
    pointSizeBoost: 1.12,
  },
  low: {
    tier: "low",
    heroPoints: 6000,
    worksPoints: 12000,
    galleryPoints: 20000,
    maxDpr: 1.2,
    pointSizeBoost: 1.24,
  },
};

export const DEFAULT_PERF_PROFILE: PerformanceProfile = {
  ...PROFILES.medium,
  isTouchOnly: false,
};

export function detectPerformanceProfile(): PerformanceProfile {
  if (typeof window === "undefined") {
    return DEFAULT_PERF_PROFILE;
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };

  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const saveData = Boolean(nav.connection?.saveData);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouchOnly = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const narrowViewport = window.innerWidth < 768;

  let tier: DevicePerfTier = "high";

  if (
    saveData ||
    reducedMotion ||
    cores <= 4 ||
    memory <= 2 ||
    (isTouchOnly && narrowViewport && cores <= 6)
  ) {
    tier = "low";
  } else if (isTouchOnly || narrowViewport || cores <= 6 || memory <= 4) {
    tier = "medium";
  }

  return {
    ...PROFILES[tier],
    isTouchOnly,
  };
}

export function usePerformanceProfile(): PerformanceProfile | null {
  const [profile, setProfile] = useState<PerformanceProfile | null>(null);

  useEffect(() => {
    setProfile(detectPerformanceProfile());
  }, []);

  return profile;
}

/**
 * Fires once when an element approaches the viewport so heavy WebGL stages
 * and below-the-fold API requests never block initial Hero LCP / hydration.
 */
export function useNearViewport(
  ref: RefObject<Element | null>,
  rootMargin = "500px 0px"
): boolean {
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, near]);

  return near;
}

/**
 * Live viewport proximity tracker — mounts heavy multi-pass WebGPU showcases
 * only while near the viewport and cleanly disposes them when scrolled far away
 * so VRAM and GPU budgets stay low across long pages.
 */
export function useInViewport(
  ref: RefObject<Element | null>,
  rootMargin = "420px 0px"
): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) {
          setVisible(entry.isIntersecting);
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return visible;
}

type SchedulerLike = {
  yield?: () => Promise<void>;
  postTask?: <T>(
    cb: () => T | Promise<T>,
    options?: { priority?: "user-blocking" | "user-visible" | "background"; signal?: AbortSignal }
  ) => Promise<T>;
};

/**
 * Modern Web Guidance (`break-up-long-tasks`): yields control back to the browser
 * using `scheduler.yield()` when supported, falling back to a macrotask timer.
 */
export function yieldToMain(): Promise<void> {
  if (typeof window !== "undefined") {
    const sched = (window as Window & { scheduler?: SchedulerLike }).scheduler;
    if (sched && typeof sched.yield === "function") {
      return sched.yield();
    }
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Modern Web Guidance (`schedule-tasks-by-priority`): defers non-urgent heavy work
 * (like above-the-fold ambient GPU boot) behind critical first paint and user input.
 */
export function scheduleBackgroundTask(
  task: () => void,
  timeoutMs = 220
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  let cancelled = false;
  const run = () => {
    if (!cancelled) task();
  };

  const win = window as Window & {
    scheduler?: SchedulerLike;
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (win.scheduler && typeof win.scheduler.postTask === "function") {
    const controller = new AbortController();
    win.scheduler
      .postTask(run, { priority: "background", signal: controller.signal })
      .catch(() => {});
    return () => {
      cancelled = true;
      controller.abort();
    };
  }

  if (typeof win.requestIdleCallback === "function") {
    const id = win.requestIdleCallback(run, { timeout: timeoutMs });
    return () => {
      cancelled = true;
      win.cancelIdleCallback?.(id);
    };
  }

  const timer = window.setTimeout(run, 48);
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}

const SOFTWARE_RENDERER_RE =
  /swiftshader|llvmpipe|softpipe|mesa offscreen|microsoft basic render|subzero|virtualbox|vmware/i;

let cachedHardwareWebgl: boolean | null = null;

/**
 * Checks whether the browser has genuine hardware-accelerated WebGL rather than
 * a CPU software rasterizer (e.g. SwiftShader / llvmpipe / basic render driver).
 * Prevents full-screen ambient shaders from saturating the main thread on software GPUs.
 */
export function hasHardwareWebGL(): boolean {
  if (cachedHardwareWebgl !== null) return cachedHardwareWebgl;
  if (typeof document === "undefined") return false;

  try {
    const probe = document.createElement("canvas");
    probe.width = 2;
    probe.height = 2;
    const attrs: WebGLContextAttributes = {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    };
    const gl =
      (probe.getContext("webgl2", attrs) as WebGLRenderingContext | null) ??
      (probe.getContext("webgl", attrs) as WebGLRenderingContext | null);

    if (!gl) {
      cachedHardwareWebgl = false;
      return false;
    }

    let rendererName = "";
    try {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) {
        rendererName = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? "");
      } else {
        rendererName = String(gl.getParameter(gl.RENDERER) ?? "");
      }
    } catch {
      rendererName = "";
    }

    gl.getExtension("WEBGL_lose_context")?.loseContext();
    cachedHardwareWebgl = !SOFTWARE_RENDERER_RE.test(rendererName);
    return cachedHardwareWebgl;
  } catch {
    cachedHardwareWebgl = false;
    return false;
  }
}

let cachedHardwareWebgpuPromise: Promise<boolean> | null = null;

/**
 * Verifies that WebGPU resolves a genuine hardware adapter (not a CPU fallback adapter).
 */
export function hasHardwareWebGPU(): Promise<boolean> {
  if (cachedHardwareWebgpuPromise) return cachedHardwareWebgpuPromise;

  cachedHardwareWebgpuPromise = (async () => {
    if (
      typeof navigator === "undefined" ||
      !("gpu" in navigator) ||
      !navigator.gpu
    ) {
      return false;
    }
    try {
      const gpuNav = navigator.gpu as {
        requestAdapter: (opts?: {
          powerPreference?: "low-power" | "high-performance";
          forceFallbackAdapter?: boolean;
        }) => Promise<
          | ({
              isFallbackAdapter?: boolean;
              info?: {
                isFallbackAdapter?: boolean;
                vendor?: string;
                architecture?: string;
                description?: string;
                device?: string;
              };
            } & object)
          | null
        >;
      };
      const adapter = await gpuNav.requestAdapter({
        powerPreference: "low-power",
        forceFallbackAdapter: false,
      });
      if (!adapter) return false;
      if (adapter.isFallbackAdapter || adapter.info?.isFallbackAdapter) {
        return false;
      }
      const desc = [
        adapter.info?.vendor,
        adapter.info?.architecture,
        adapter.info?.description,
        adapter.info?.device,
      ]
        .filter(Boolean)
        .join(" ");
      if (desc && SOFTWARE_RENDERER_RE.test(desc)) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  })();

  return cachedHardwareWebgpuPromise;
}
