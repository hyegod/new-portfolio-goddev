"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import type { ProjectItem } from "@/data/portfolio";
import { useNearViewport, usePerformanceProfile } from "@/lib/devicePerf";
import { generatePresetPointCloud } from "@/lib/pointCloudGenerator";
import { LazyGatherPointCloud } from "./LazyGatherPointCloud";

interface WorkCaseStudyClientProps {
  project: ProjectItem;
  prevProject: ProjectItem;
  nextProject: ProjectItem;
  totalProjects: number;
}

export function WorkCaseStudyClient({
  project,
  prevProject,
  nextProject,
  totalProjects,
}: WorkCaseStudyClientProps) {
  const [darkStage, setDarkStage] = useState(true);
  const [paused, setPaused] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const perf = usePerformanceProfile();
  const isNearStage = useNearViewport(stageRef, "300px 0px");

  const cloud = useMemo(() => {
    if (!isNearStage || !perf) return null;
    return generatePresetPointCloud(project.preset, perf.worksPoints);
  }, [isNearStage, perf, project.preset]);

  return (
    <article className="relative border-b border-black/15 px-3 pt-28 pb-16 min-[380px]:px-4 sm:px-8 sm:pt-32 sm:pb-24 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        {/* Top Breadcrumb Bar */}
        <div className="reveal-up mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/works"
              className="glass-pill-light group inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-[#0D0E12] uppercase transition-colors hover:border-[#0038FF] hover:text-[#0038FF]"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span className="text-trim">ALL WORKS</span>
            </Link>
            <Link
              href="/"
              className="glass-pill-light inline-flex items-center rounded-full px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] text-[#505562] uppercase transition-colors hover:border-[#0038FF] hover:text-[#0038FF]"
            >
              <span className="text-trim">HOME</span>
            </Link>
          </div>

          <span className="font-mono text-[10px] tracking-[0.18em] text-[#0038FF] uppercase">
            CASE STUDY {project.index} / {String(totalProjects).padStart(2, "0")} · {project.year}
          </span>
        </div>

        {/* Hero Title & Action Strip */}
        <div className="mb-10 border-b border-black/12 pb-8 sm:pb-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div data-anim="mask-group" className="min-w-0">
              <p className="reveal-up font-mono text-[10px] tracking-[0.2em] text-[#0038FF] uppercase sm:text-[11px] sm:tracking-[0.22em]">
                {project.category === project.discipline
                  ? `${project.index} // ${project.category} · ${project.client}`
                  : `${project.index} // ${project.category} · ${project.discipline}`}
              </p>
              <h1 className="mt-2.5 break-words font-display text-[clamp(1.7rem,6vw,4.5rem)] leading-[0.95] font-extrabold tracking-tight text-[#0D0E12] uppercase">
                <span className="mask-line block">{project.title}</span>
              </h1>
              <p className="reveal-up mt-4 max-w-2xl text-sm leading-relaxed text-[#454A57] sm:text-base">
                {project.subtitle} — {project.summary}
              </p>
            </div>

            <div className="reveal-up flex shrink-0 flex-wrap items-center gap-2.5">
              <Link
                href={
                  project.liveUrl.startsWith("/gallery?preset=")
                    ? `${project.liveUrl.replace("/gallery?preset=", "/works?preset=")}#lab`
                    : project.liveUrl
                }
                className="group inline-flex items-center gap-2 rounded-lg bg-[#0038FF] px-4 py-2.5 whitespace-nowrap font-mono text-[10.5px] font-semibold tracking-[0.16em] text-white uppercase transition-colors hover:bg-[#0D0E12] sm:text-[11px]"
              >
                <span className="text-trim">OPEN IN 3D LAB</span>
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <a
                href="#contact"
                className="glass-pill-light inline-flex items-center gap-2 rounded-lg px-4 py-2.5 whitespace-nowrap font-mono text-[10.5px] font-semibold tracking-[0.16em] text-[#0D0E12] uppercase transition-colors hover:border-[#0038FF] hover:text-[#0038FF] sm:text-[11px]"
              >
                <span className="text-trim">DISCUSS PROJECT</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Tech Stack Strip */}
          <div className="reveal-up mt-6 flex flex-wrap items-center gap-2">
            {project.stack.map((tech) => (
              <span
                key={tech}
                className="text-trim rounded-md border border-black/12 bg-white/80 px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.12em] text-[#0D0E12] uppercase"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Dedicated Interactive 3D Specimen Hero Stage */}
        <div ref={stageRef} className="anim-stage-reveal mb-10 sm:mb-12">
          <div
            className={`relative h-[380px] w-full overflow-hidden rounded-2xl border transition-colors duration-300 sm:h-[480px] lg:h-[540px] ${
              darkStage
                ? "gather-surface-dark border-black/25 shadow-[0_24px_56px_-16px_rgba(6,8,16,0.42)]"
                : "gather-surface-light border-black/20 shadow-[0_24px_56px_-16px_rgba(13,14,18,0.16)]"
            }`}
          >
            <div className="absolute inset-0">
              {cloud && perf && (
                <LazyGatherPointCloud
                  cloud={cloud}
                  pointCount={perf.worksPoints}
                  drift={60}
                  splash={68}
                  gather={44}
                  depth={84}
                  lightOn
                  lightHex={project.preset === "terrain" ? "#3de8a5" : "#5B86FF"}
                  paperLight={!darkStage}
                  whiteMode="negative"
                  travelMode={project.preset === "terrain" ? "melt" : "swarm"}
                  draw={{ track: true, links: true, scan: false, marks: true }}
                  paused={paused}
                  interactive
                  showHud
                  showGimbal
                  cameraDistance={3.6}
                  pointSizeScale={0.9 * perf.pointSizeBoost}
                  maxDpr={perf.maxDpr}
                  ariaLabel={`Interactive 3D structural point cloud for ${project.title}`}
                />
              )}
            </div>

            {/* Floating Top HUD */}
            <div
              className={`relative z-10 m-3 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 font-mono text-[9.5px] tracking-[0.16em] uppercase sm:m-4 sm:text-[10px] ${
                darkStage ? "glass-obsidian text-white" : "glass-vellum text-[#0D0E12]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
                <span>
                  INTERACTIVE 3D SPECIMEN // {project.preset.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[9px] transition-colors hover:border-[#0038FF] ${
                    darkStage ? "glass-pill-dark" : "glass-pill-light"
                  }`}
                >
                  {paused ? <Play className="h-2.5 w-2.5" /> : <Pause className="h-2.5 w-2.5" />}
                  <span className="text-trim">{paused ? "PLAY" : "PAUSE"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDarkStage((d) => !d)}
                  className={`rounded-md px-2.5 py-1 text-[9px] transition-colors hover:border-[#0038FF] ${
                    darkStage ? "glass-pill-dark" : "glass-pill-light"
                  }`}
                >
                  <span className="text-trim">{darkStage ? "BLUEPRINT" : "DARK"}</span>
                </button>
              </div>
            </div>

            {/* Floating Bottom Hint */}
            <div
              className={`pointer-events-none absolute inset-x-3 bottom-3 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3.5 py-2 font-mono text-[9px] tracking-[0.14em] uppercase sm:inset-x-4 sm:bottom-4 sm:text-[10px] ${
                darkStage
                  ? "glass-obsidian text-white/75"
                  : "glass-vellum text-[#0D0E12]/75"
              }`}
            >
              <span>DRAG TO ORBIT 360° · PINCH TO ZOOM · DOUBLE-TAP RESET</span>
              <span className="font-semibold text-[#5B86FF]">
                {(perf?.worksPoints ?? 20000).toLocaleString("en-US")} LIVE GPU PTS
              </span>
            </div>
          </div>
        </div>

        {/* Optional Uploaded Vercel Blob Cover Image */}
        {project.imageUrl && (
          <div className="reveal-up mb-10 overflow-hidden rounded-2xl border border-black/12 bg-white/85 shadow-[0_18px_40px_-18px_rgba(13,14,18,0.14)] sm:mb-12">
            <div className="aspect-[16/9] w-full overflow-hidden bg-[#ECEEF0]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.imageUrl}
                alt={`${project.title} visual documentation`}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        {/* 3 Key Telemetry Metrics */}
        <div
          data-anim="stagger-group"
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {project.metrics.map((metric) => (
            <div
              key={metric.label}
              className="stagger-item rounded-2xl border border-black/12 bg-white/85 p-5 shadow-[0_12px_30px_-16px_rgba(13,14,18,0.08)] sm:p-6"
            >
              <p className="font-mono text-[10px] tracking-[0.18em] text-[#505562] uppercase">
                {metric.label}
              </p>
              <p className="mt-2 font-display text-2xl font-extrabold text-[#0038FF] sm:text-3xl">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        {/* Project Spec Sheet Metadata Bar */}
        <div className="reveal-up mt-8 grid grid-cols-1 gap-6 border-y border-black/15 py-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-mono text-[9.5px] tracking-[0.2em] text-[#505562] uppercase">
              ROLE
            </p>
            <p className="mt-1.5 text-sm font-semibold text-[#0D0E12]">
              {project.role}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9.5px] tracking-[0.2em] text-[#505562] uppercase">
              CONTEXT / CLIENT
            </p>
            <p className="mt-1.5 text-sm font-semibold text-[#0D0E12]">
              {project.client}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9.5px] tracking-[0.2em] text-[#505562] uppercase">
              TIMELINE
            </p>
            <p className="mt-1.5 text-sm font-semibold text-[#0D0E12]">
              {project.duration} · {project.year}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9.5px] tracking-[0.2em] text-[#505562] uppercase">
              KEY DELIVERABLES
            </p>
            <ul className="mt-1.5 space-y-1 text-xs text-[#3D424F]">
              {project.deliverables.map((d) => (
                <li key={d}>· {d}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Challenge & Outcome Narrative */}
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <div className="reveal-up rounded-2xl border border-black/12 bg-white/80 p-6 sm:p-8">
            <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-[#0038FF] uppercase">
              01 // ENGINEERING CHALLENGE
            </p>
            <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight text-[#0D0E12] uppercase sm:text-2xl">
              THE STRUCTURAL &amp; WORKFLOW BOTTLENECK
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#3D424F] sm:text-[15px]">
              {project.challenge}
            </p>
          </div>

          <div className="reveal-up rounded-2xl border border-black/12 bg-white/80 p-6 sm:p-8">
            <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-[#0038FF] uppercase">
              02 // SOFTWARE &amp; STRUCTURAL OUTCOME
            </p>
            <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight text-[#0D0E12] uppercase sm:text-2xl">
              DELIVERED SYSTEM &amp; MEASURED IMPACT
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#3D424F] sm:text-[15px]">
              {project.outcome}
            </p>
          </div>
        </div>

        {/* Technical Architecture Breakdown */}
        <div className="mt-12">
          <p className="reveal-up mb-5 font-mono text-[10px] font-semibold tracking-[0.22em] text-[#0038FF] uppercase sm:text-[11px]">
            03 // TECHNICAL &amp; STRUCTURAL ARCHITECTURE
          </p>
          <div
            data-anim="stagger-group"
            className="grid grid-cols-1 gap-5 md:grid-cols-3"
          >
            {project.architectureHighlights.map((block) => (
              <div
                key={block.code}
                className="stagger-item rounded-2xl border border-black/12 bg-white/85 p-6 shadow-[0_12px_30px_-16px_rgba(13,14,18,0.08)]"
              >
                <p className="font-mono text-[9.5px] font-semibold tracking-[0.18em] text-[#0038FF] uppercase">
                  {block.code}
                </p>
                <h3 className="mt-2.5 font-display text-lg font-extrabold tracking-tight text-[#0D0E12]">
                  {block.title}
                </h3>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#454A57]">
                  {block.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Previous / Next Work Navigation */}
        <div className="reveal-up mt-14 grid grid-cols-1 gap-4 border-t border-black/15 pt-10 sm:grid-cols-2">
          <Link
            href={`/works/${prevProject.id}`}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-black/12 bg-white/75 p-5 transition-all hover:border-[#0038FF]/40 hover:bg-white"
          >
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] text-[#505562] uppercase">
                <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
                <span>PREVIOUS WORK · {prevProject.index}</span>
              </p>
              <p className="mt-1.5 truncate font-display text-lg font-extrabold tracking-tight text-[#0D0E12] uppercase transition-colors group-hover:text-[#0038FF] sm:text-xl">
                {prevProject.title}
              </p>
            </div>
          </Link>

          <Link
            href={`/works/${nextProject.id}`}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-black/12 bg-white/75 p-5 text-right transition-all hover:border-[#0038FF]/40 hover:bg-white"
          >
            <div className="ml-auto min-w-0">
              <p className="inline-flex items-center justify-end gap-1.5 font-mono text-[10px] tracking-[0.18em] text-[#505562] uppercase">
                <span>NEXT WORK · {nextProject.index}</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </p>
              <p className="mt-1.5 truncate font-display text-lg font-extrabold tracking-tight text-[#0D0E12] uppercase transition-colors group-hover:text-[#0038FF] sm:text-xl">
                {nextProject.title}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </article>
  );
}
