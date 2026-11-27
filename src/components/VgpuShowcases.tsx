"use client";

import dynamic from "next/dynamic";
import type { BlackHoleShowcaseProps } from "@/vgpu-demos/optimized-black-hole";
import type { SpringChoreographyShowcaseProps } from "@/vgpu-demos/spring-choreography";
import type { InteractiveFluidShowcaseProps } from "@/vgpu-demos/fluid";

export const LazyBlackHoleShowcase = dynamic<BlackHoleShowcaseProps>(
  () => import("@/vgpu-demos/optimized-black-hole"),
  { ssr: false }
);

export const LazySpringChoreographyShowcase =
  dynamic<SpringChoreographyShowcaseProps>(
    () => import("@/vgpu-demos/spring-choreography"),
    { ssr: false }
  );

export const LazyInteractiveFluidShowcase =
  dynamic<InteractiveFluidShowcaseProps>(
    () => import("@/vgpu-demos/fluid"),
    { ssr: false }
  );

export const LazyRoamingBotsOverlay = dynamic(
  () => import("./RoamingBotsOverlay"),
  { ssr: false }
);
