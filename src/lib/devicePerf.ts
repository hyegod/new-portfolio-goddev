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
    heroPoints: 24000,
    worksPoints: 34000,
    galleryPoints: 64000,
    maxDpr: 2,
    pointSizeBoost: 1,
  },
  medium: {
    tier: "medium",
    heroPoints: 14000,
    worksPoints: 20000,
    galleryPoints: 36000,
    maxDpr: 1.5,
    pointSizeBoost: 1.12,
  },
  low: {
    tier: "low",
    heroPoints: 9000,
    worksPoints: 14000,
    galleryPoints: 24000,
    maxDpr: 1.25,
    pointSizeBoost: 1.22,
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
