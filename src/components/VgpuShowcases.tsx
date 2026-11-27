"use client";

import dynamic from "next/dynamic";
import type { BlackHoleShowcaseProps } from "@/vgpu-demos/optimized-black-hole";
import type { SpringChoreographyShowcaseProps } from "@/vgpu-demos/spring-choreography";
import type { MechanicalGardenShowcaseProps } from "@/vgpu-demos/mechanical-garden";
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

export const LazyMechanicalGardenShowcase =
  dynamic<MechanicalGardenShowcaseProps>(
    () => import("@/vgpu-demos/mechanical-garden"),
    { ssr: false }
  );

export const LazyInteractiveFluidShowcase =
  dynamic<InteractiveFluidShowcaseProps>(
    () => import("@/vgpu-demos/fluid"),
    { ssr: false }
  );
