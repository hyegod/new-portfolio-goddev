"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import type { GalleryPlate } from "@/data/portfolio";
import { useNearViewport } from "@/lib/devicePerf";

const DynamicGitHubWorksPanel = dynamic(
  () => import("./GitHubWorksPanel").then((mod) => mod.GitHubWorksPanel),
  {
    ssr: false,
    loading: () => <GitHubPanelSkeleton />,
  }
);

const DynamicWorksLabSection = dynamic(
  () => import("./WorksLabSection").then((mod) => mod.WorksLabSection),
  {
    ssr: false,
    loading: () => <WorksLabSkeleton />,
  }
);

function GitHubPanelSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading live GitHub telemetry"
      className="mt-14 border-t border-black/12 pt-12 sm:mt-16 sm:pt-14"
    >
      <div className="min-h-[380px] rounded-2xl border border-black/10 bg-white/55 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 border-b border-black/8 pb-4">
          <div className="h-3 w-44 animate-pulse rounded bg-black/10" />
          <div className="h-3 w-24 animate-pulse rounded bg-[#0038FF]/15" />
        </div>
        <div className="mt-6 h-32 w-full animate-pulse rounded-xl bg-black/[0.05]" />
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="h-28 animate-pulse rounded-xl bg-black/[0.04]" />
          <div className="h-28 animate-pulse rounded-xl bg-black/[0.04]" />
          <div className="h-28 animate-pulse rounded-xl bg-black/[0.04]" />
        </div>
      </div>
    </div>
  );
}

function WorksLabSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading interactive 3D LiDAR and WebGPU lab"
      className="relative mt-14 border-t border-black/12 pt-12 sm:mt-16 sm:pt-14"
    >
      <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-10 md:flex-row md:items-end">
        <div className="space-y-2.5">
          <div className="h-3 w-56 animate-pulse rounded bg-[#0038FF]/15" />
          <div className="h-9 w-64 animate-pulse rounded bg-black/10" />
        </div>
        <div className="h-8 w-52 animate-pulse rounded-lg bg-black/[0.06]" />
      </div>
      <div className="min-h-[540px] w-full animate-pulse rounded-2xl border border-black/12 bg-[#08090C]/90" />
    </div>
  );
}

/**
 * Viewport-gated code-split wrapper for GitHubWorksPanel (26KB+).
 * Defers downloading and hydrating the GitHub contribution graph & repo cards
 * until the visitor scrolls within 850px.
 */
export function LazyGitHubWorksPanel({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isNear = useNearViewport(wrapperRef, "850px 0px");

  return (
    <div ref={wrapperRef}>
      {isNear ? (
        <DynamicGitHubWorksPanel embedded={embedded} />
      ) : (
        <GitHubPanelSkeleton />
      )}
    </div>
  );
}

/**
 * Viewport-gated code-split wrapper for WorksLabSection (64KB+ LiDAR + WebGPU studio).
 * Keeps `#lab` anchor permanently present in the DOM so direct `/works#lab` jumps
 * resolve instantly and trigger chunk loading on arrival.
 */
export function LazyWorksLabSection({
  showPlates = true,
  plates,
}: {
  showPlates?: boolean;
  plates?: GalleryPlate[];
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isNear = useNearViewport(wrapperRef, "900px 0px");

  return (
    <div id="lab" ref={wrapperRef} tabIndex={-1} className="scroll-mt-24 outline-none">
      {isNear ? (
        <DynamicWorksLabSection
          showPlates={showPlates}
          plates={plates}
          omitSectionId
        />
      ) : (
        <WorksLabSkeleton />
      )}
    </div>
  );
}
