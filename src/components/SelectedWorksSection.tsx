"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { motion } from "motion/react";
import { PROJECTS, type ProjectItem } from "@/data/portfolio";
import { useNearViewport, usePerformanceProfile } from "@/lib/devicePerf";
import type { PointCloudData } from "@/lib/pointCloudGenerator";
import { LazyGatherPointCloud } from "./LazyGatherPointCloud";
import {
  LazyGitHubWorksPanel,
  LazyWorksLabSection,
} from "./LazyHeavyModules";
import { TouchInteractPill, useTouchInteractGate } from "./TouchInteractGate";

export function SelectedWorksSection({
  projects = PROJECTS,
}: {
  projects?: ProjectItem[];
}) {
  const list = projects.length > 0 ? projects : PROJECTS;
  const [activeId, setActiveId] = useState<string>(list[0].id);
  const [previewDark, setPreviewDark] = useState<boolean>(true);
  const [previewPaused, setPreviewPaused] = useState<boolean>(false);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const cloudCacheRef = useRef<Map<string, PointCloudData>>(new Map());

  const perf = usePerformanceProfile();
  const isNearPreview = useNearViewport(previewStageRef, "550px 0px");
  const touchGate = useTouchInteractGate(previewStageRef);

  const activeProject =
    list.find((p) => p.id === activeId) ?? list[0];

  const [activeCloud, setActiveCloud] = useState<PointCloudData | null>(null);

  // Dynamically load point-cloud generator & build ONLY the active preset once #works nears viewport
  useEffect(() => {
    if (!isNearPreview || !perf) return;
    const key = `${activeProject.preset}-${perf.worksPoints}`;
    const cached = cloudCacheRef.current.get(key);
    if (cached) {
      setActiveCloud(cached);
      return;
    }

    let cancelled = false;
    import("@/lib/pointCloudGenerator")
      .then(({ generatePresetPointCloud }) => {
        if (cancelled) return;
        const generated = generatePresetPointCloud(
          activeProject.preset,
          perf.worksPoints
        );
        cloudCacheRef.current.set(key, generated);
        setActiveCloud(generated);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [activeProject.preset, isNearPreview, perf]);

  return (
    <section
      id="works"
      className="deferred-works relative border-b border-black/15 px-3 py-16 min-[380px]:px-4 sm:px-8 sm:py-20 lg:px-12 lg:py-28"
      aria-labelledby="works-heading"
    >
      <div className="mx-auto max-w-[1440px]">
        {/* Section Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-black/12 pb-6 sm:mb-12 sm:gap-6 sm:pb-8 md:flex-row md:items-end">
          <div data-anim="mask-group" className="min-w-0">
            <p className="reveal-up font-mono text-[10px] tracking-[0.2em] text-[#0038FF] uppercase sm:text-[11px] sm:tracking-[0.22em]">
              04 // SELECTED WORKS · CIVIL × SOFTWARE
            </p>
            <h2
              id="works-heading"
              className="mt-2 font-display text-[clamp(1.55rem,6vw,3.75rem)] leading-[0.98] font-extrabold tracking-tight text-[#0D0E12] uppercase"
            >
              <span className="mask-line block">
                FEATURED <span className="text-[#0038FF]">WORKS</span>
              </span>
            </h2>
          </div>

          <div className="reveal-up flex flex-col gap-3 md:items-end">
            <p className="max-w-sm font-mono text-[11px] leading-relaxed text-[#505562] sm:text-xs md:text-right">
              Hover or tap any card to preview its 3D structural specimen. Press{" "}
              <span className="font-semibold text-[#0D0E12]">↗</span> to open
              the full engineering case study page.
            </p>
            <Link
              href="/works"
              className="group inline-flex w-fit items-center gap-2 rounded-lg border border-black/15 bg-white/80 px-3.5 py-2 font-mono text-[10px] font-semibold tracking-[0.16em] text-[#0D0E12] uppercase transition-colors hover:border-[#0038FF] hover:bg-[#0038FF] hover:text-white sm:text-[11px]"
            >
              <span className="text-trim">VIEW OTHER PROJECTS</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>

        {/* Two-Column Clean Project Cards + Sticky Live 3D Structural Preview */}
        <div className="grid min-w-0 gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
          <div data-anim="stagger-group" className="min-w-0 space-y-3.5 sm:space-y-4">
            {list.map((project) => {
              const isActive = project.id === activeProject.id;

              return (
                <div key={project.id} className="stagger-item min-w-0">
                  <motion.article
                    onMouseEnter={() => setActiveId(project.id)}
                    onClick={() => setActiveId(project.id)}
                    initial={false}
                    animate={{ x: isActive ? 4 : 0 }}
                    transition={{ type: "spring", stiffness: 360, damping: 30 }}
                    className={`group relative min-w-0 cursor-pointer rounded-2xl border p-4 transition-all duration-200 sm:p-6 ${
                      isActive
                        ? "border-[#0038FF]/35 bg-white shadow-[0_14px_34px_-14px_rgba(0,56,255,0.18)]"
                        : "border-black/12 bg-white/60 hover:bg-white/90"
                    }`}
                  >
                    <div className="flex w-full min-w-0 flex-col gap-3 text-left sm:gap-3.5">
                      <div className="flex w-full flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase sm:gap-3 sm:text-[11px] sm:tracking-[0.18em]">
                          <span className="shrink-0 font-bold text-[#0038FF]">
                            {project.index}
                          </span>
                          <span className="truncate text-[#505562]">
                            {project.category}
                          </span>
                        </div>
                        <span className="shrink-0 font-mono text-[10px] tracking-[0.14em] text-[#505562] sm:text-[11px] sm:tracking-[0.16em]">
                          {project.year}
                        </span>
                      </div>

                      <div className="flex w-full items-start justify-between gap-3 sm:gap-4">
                        <h3
                          className={`min-w-0 break-words font-display text-[1.1rem] leading-tight font-extrabold tracking-tight uppercase transition-colors min-[380px]:text-xl sm:text-3xl ${
                            isActive
                              ? "text-[#0038FF]"
                              : "text-[#0D0E12] group-hover:text-[#0038FF]"
                          }`}
                        >
                          {project.title}
                        </h3>

                        <Link
                          href={`/works/${project.id}`}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Open case study page for ${project.title}`}
                          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-black/15 bg-white/80 text-[#0D0E12] transition-all duration-200 hover:scale-105 hover:border-[#0038FF] hover:bg-[#0038FF] hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038FF] sm:h-10 sm:w-10"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Link>
                      </div>

                      <p className="max-w-xl text-[13px] leading-relaxed text-[#464B57] sm:text-sm">
                        {project.summary}
                      </p>

                      <div className="flex w-full flex-wrap items-center gap-1.5 pt-1 sm:gap-2">
                        {project.stack.map((tag) => (
                          <span
                            key={tag}
                            className="text-trim rounded-md border border-black/10 bg-[#ECEEF0]/80 px-2 py-1 font-mono text-[9.5px] tracking-[0.1em] text-[#0D0E12] uppercase sm:px-2.5 sm:text-[10px] sm:tracking-[0.12em]"
                          >
                            {tag}
                          </span>
                        ))}
                        <Link
                          href={`/works/${project.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="ml-auto whitespace-nowrap font-mono text-[9.5px] font-semibold tracking-[0.14em] text-[#0038FF] uppercase transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038FF] sm:text-[10px] sm:tracking-[0.18em]"
                        >
                          CASE STUDY ↗
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                </div>
              );
            })}

            {/* Editorial Archive Link Bar */}
            <div className="reveal-up pt-2">
              <Link
                href="/works"
                className="glass-vellum group flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-4 transition-all hover:border-[#0038FF]/45 hover:bg-white sm:px-6"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[9.5px] tracking-[0.18em] text-[#0038FF] uppercase sm:text-[10px]">
                    ARCHIVE // ALL SHIPPED ENGINEERING &amp; SOFTWARE WORKS
                  </p>
                  <p className="mt-1 font-display text-sm font-extrabold tracking-tight text-[#0D0E12] uppercase transition-colors group-hover:text-[#0038FF] sm:text-base">
                    VIEW OTHER PROJECTS &amp; FULL ARCHIVE
                  </p>
                </div>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#0D0E12] text-white transition-colors group-hover:bg-[#0038FF]">
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            </div>
          </div>

          {/* Right: Sticky Live 3D Specimen Preview with Floating Smoked Glass Overlays */}
          <div ref={previewStageRef} className="anim-stage-reveal min-w-0 lg:sticky lg:top-24">
            <div
              className={`relative aspect-[4/4.6] w-full overflow-hidden rounded-2xl border transition-all duration-300 sm:aspect-[4/4.3] ${
                previewDark
                  ? "gather-surface-dark border-black/25 shadow-[0_24px_54px_-16px_rgba(6,8,16,0.42)]"
                  : "gather-surface-light border-black/20 shadow-[0_24px_54px_-16px_rgba(13,14,18,0.18)]"
              } ${
                touchGate.isTouchDevice && touchGate.active
                  ? "ring-2 ring-[#0038FF]/70"
                  : ""
              }`}
            >
              <div className="absolute inset-0">
                {activeCloud && perf && (
                  <LazyGatherPointCloud
                    cloud={activeCloud}
                    pointCount={perf.worksPoints}
                    drift={62}
                    splash={72}
                    gather={46}
                    depth={82}
                    lightOn
                    lightHex={
                      activeProject.preset === "terrain" ? "#3de8a5" : "#5B86FF"
                    }
                    paperLight={!previewDark}
                    whiteMode="negative"
                    travelMode={activeProject.preset === "terrain" ? "melt" : "swarm"}
                    draw={{ track: true, links: true, scan: false, marks: true }}
                    paused={previewPaused}
                    interactive={touchGate.interactive}
                    showHud
                    showGimbal
                    cameraDistance={3.9}
                    pointSizeScale={0.86 * perf.pointSizeBoost}
                    maxDpr={perf.maxDpr}
                    ariaLabel={`3D structural point cloud preview for ${activeProject.title}`}
                  />
                )}
              </div>

              {/* Floating Top Glass Telemetry Bar */}
              <div
                className={`relative z-10 m-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl px-2.5 py-2 font-mono text-[9px] tracking-[0.12em] uppercase sm:m-3 sm:px-3.5 sm:py-2.5 sm:text-[10px] sm:tracking-[0.18em] ${
                  previewDark ? "glass-obsidian text-white" : "glass-vellum text-[#0D0E12]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B82F6]" />
                  <span className="truncate">
                    SPECIMEN {activeProject.index} // {activeProject.preset.toUpperCase()}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewPaused((p) => !p)}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[8.5px] transition-colors hover:border-[#0038FF] sm:text-[9px] ${
                      previewDark ? "glass-pill-dark" : "glass-pill-light"
                    }`}
                    aria-label={previewPaused ? "Play specimen rotation" : "Pause specimen rotation"}
                  >
                    {previewPaused ? (
                      <Play className="h-2.5 w-2.5" />
                    ) : (
                      <Pause className="h-2.5 w-2.5" />
                    )}
                    <span className="text-trim">{previewPaused ? "PLAY" : "PAUSE"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewDark((d) => !d)}
                    className={`rounded-md px-2 py-1 text-[8.5px] transition-colors hover:border-[#0038FF] sm:text-[9px] ${
                      previewDark ? "glass-pill-dark" : "glass-pill-light"
                    }`}
                  >
                    <span className="text-trim">{previewDark ? "BLUEPRINT" : "DARK"}</span>
                  </button>
                </div>
              </div>

              {/* Floating Bottom Touch-Friendly Specimen Switcher + Caption Bar */}
              <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 z-10 flex flex-col gap-1.5 sm:inset-x-3 sm:bottom-3 sm:gap-2">
                <div className="flex justify-end">
                  <TouchInteractPill
                    visible={touchGate.isTouchDevice}
                    active={touchGate.active}
                    lightSurface={!previewDark}
                    onToggle={touchGate.toggle}
                  />
                </div>

                {/* Direct 1-Tap Specimen Selector (2x2 on 320px, 4-col bar on >=380px) */}
                <div
                  role="tablist"
                  aria-label="Switch 3D structural specimen"
                  className={`pointer-events-auto grid grid-cols-2 gap-1 rounded-lg p-1 font-mono text-[8.5px] tracking-[0.1em] uppercase min-[380px]:grid-cols-4 sm:text-[9px] sm:tracking-[0.12em] ${
                    previewDark ? "glass-obsidian" : "glass-vellum"
                  }`}
                >
                  {list.map((proj) => {
                    const selected = proj.id === activeProject.id;
                    return (
                      <button
                        key={proj.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setActiveId(proj.id)}
                        className={`rounded-md px-1.5 py-1.5 text-center whitespace-nowrap font-semibold transition-colors sm:px-2 sm:py-1 ${
                          selected
                            ? "bg-[#0038FF] text-white"
                            : previewDark
                              ? "text-white/65 hover:text-white"
                              : "text-[#4A505E] hover:text-[#0038FF]"
                        }`}
                      >
                        <span className="text-trim">
                          {proj.index} {proj.preset}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div
                  className={`pointer-events-auto flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 font-mono text-[9px] tracking-[0.12em] uppercase sm:px-3.5 sm:py-2.5 sm:text-[10px] sm:tracking-[0.16em] ${
                    previewDark
                      ? "glass-obsidian text-white/80"
                      : "glass-vellum text-[#0D0E12]/80"
                  }`}
                >
                  <span className="min-w-0 truncate pr-2">
                    {activeProject.subtitle}
                  </span>
                  <Link
                    href={`/works/${activeProject.id}`}
                    className="shrink-0 whitespace-nowrap font-semibold text-[#5B86FF] hover:underline"
                  >
                    INSPECT ↗
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live GitHub Contribution Heatmap & Auto-Synced Public Repositories (lazy-loaded near viewport) */}
        <LazyGitHubWorksPanel />

        {/* Interactive 3D LiDAR & WebGPU (vgpu) Engineering Lab (lazy-loaded near viewport) */}
        <LazyWorksLabSection showPlates={false} />
      </div>
    </section>
  );
}
