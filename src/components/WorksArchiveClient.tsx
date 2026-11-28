"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import {
  GALLERY_PLATES,
  PROJECTS,
  type GalleryPlate,
  type ProjectItem,
} from "@/data/portfolio";
import { LazyWorksLabSection } from "./LazyHeavyModules";
import { OptimizedImage } from "./OptimizedImage";

type DisciplineFilter = "ALL" | ProjectItem["discipline"];

const DISCIPLINE_FILTERS: DisciplineFilter[] = [
  "ALL",
  "STRUCTURAL / WEBGL",
  "CIVIL × SOFTWARE",
  "COMPUTATIONAL BIM",
  "SOFTWARE / GIS",
];

export function WorksArchiveClient({
  projects = PROJECTS,
  plates = GALLERY_PLATES,
}: {
  projects?: ProjectItem[];
  plates?: GalleryPlate[];
}) {
  const list = projects.length > 0 ? projects : PROJECTS;
  const [activeFilter, setActiveFilter] = useState<DisciplineFilter>("ALL");

  const filteredProjects =
    activeFilter === "ALL"
      ? list
      : list.filter((p) => p.discipline === activeFilter);

  return (
    <section className="relative border-b border-black/15 px-3 pt-28 pb-16 min-[380px]:px-4 sm:px-8 sm:pt-32 sm:pb-24 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        {/* Breadcrumb */}
        <div className="reveal-up mb-8 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="glass-pill-light group inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-[#0D0E12] uppercase transition-colors hover:border-[#0038FF] hover:text-[#0038FF]"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span className="text-trim">BACK TO HOME</span>
          </Link>

          <span className="font-mono text-[10px] tracking-[0.18em] text-[#505562] uppercase">
            {String(list.length).padStart(2, "0")} CASE STUDIES · 3D LIDAR &amp; WEBGPU LAB
          </span>
        </div>

        {/* Page Header */}
        <div className="mb-10 flex flex-col justify-between gap-6 border-b border-black/12 pb-8 md:flex-row md:items-end">
          <div data-anim="mask-group" className="min-w-0">
            <p className="reveal-up font-mono text-[10px] tracking-[0.2em] text-[#0038FF] uppercase sm:text-[11px] sm:tracking-[0.22em]">
              04 // WORKS ARCHIVE · CIVIL × SOFTWARE ENGINEERING
            </p>
            <h1 className="mt-2 font-display text-[clamp(1.75rem,6.4vw,4.6rem)] leading-[0.95] font-extrabold tracking-tight text-[#0D0E12] uppercase">
              <span className="mask-line block">
                ALL <span className="text-[#0038FF]">PROJECTS</span>
              </span>
            </h1>
          </div>

          <p className="reveal-up max-w-md font-mono text-[11px] leading-relaxed text-[#505562] sm:text-xs md:text-right">
            Complete catalog of structural engineering tools, BIM pipelines,
            geospatial engines, and full-stack software systems — each with a
            dedicated technical breakdown page.
          </p>
        </div>

        {/* Scalable Discipline Filter Bar */}
        <div className="reveal-up mb-8 flex flex-wrap items-center gap-1.5 sm:gap-2">
          {DISCIPLINE_FILTERS.map((disc) => {
            const active = activeFilter === disc;
            return (
              <button
                key={disc}
                type="button"
                onClick={() => setActiveFilter(disc)}
                aria-pressed={active}
                className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase transition-colors sm:px-3.5 sm:py-2 ${
                  active
                    ? "border-[#0038FF] bg-[#0038FF] text-white"
                    : "border-black/12 bg-white/75 text-[#3A3F4B] hover:border-[#0038FF] hover:text-[#0038FF]"
                }`}
              >
                <span className="text-trim">{disc}</span>
              </button>
            );
          })}
        </div>

        {/* Scalable 2-Column Project Archive Grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filteredProjects.map((project, idx) => (
            <motion.article
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: Math.min(idx * 0.08, 0.32),
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group flex min-w-0 flex-col justify-between rounded-2xl border border-black/12 bg-white/85 p-5 shadow-[0_12px_32px_-16px_rgba(13,14,18,0.1)] transition-all hover:border-[#0038FF]/40 hover:bg-white hover:shadow-[0_22px_44px_-16px_rgba(0,56,255,0.16)] sm:p-7"
            >
              <div>
                {/* Top Metadata */}
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] tracking-[0.16em] uppercase">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-[#0038FF]">
                      {project.index}
                    </span>
                    <span className="text-[#505562]">{project.category}</span>
                  </div>
                  <span className="text-[#505562]">
                    {project.year} · {project.duration}
                  </span>
                </div>

                {/* Title + Independent Arrow Link */}
                <div className="mt-3.5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="break-words font-display text-xl leading-tight font-extrabold tracking-tight text-[#0D0E12] uppercase transition-colors group-hover:text-[#0038FF] sm:text-3xl">
                      {project.title}
                    </h2>
                    <p className="mt-1.5 font-mono text-[10px] tracking-[0.12em] text-[#505562] uppercase">
                      {project.subtitle}
                    </p>
                  </div>

                  <Link
                    href={`/works/${project.id}`}
                    aria-label={`Read full case study for ${project.title}`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-black/15 bg-white text-[#0D0E12] transition-all duration-200 hover:scale-105 hover:border-[#0038FF] hover:bg-[#0038FF] hover:text-white active:scale-95"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>

                {project.imageUrl && (
                  <div className="relative mt-4 aspect-[16/9] w-full overflow-hidden rounded-xl border border-black/10 bg-[#ECEEF0]">
                    <OptimizedImage
                      src={project.imageUrl}
                      alt={project.title}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                )}

                <p className="mt-4 text-[13.5px] leading-relaxed text-[#454A57] sm:text-sm">
                  {project.summary}
                </p>

                {/* Key Metrics Preview Strip */}
                <div className="mt-5 grid grid-cols-3 gap-2 border-y border-black/10 py-3.5">
                  {project.metrics.map((m) => (
                    <div key={m.label} className="min-w-0">
                      <p className="truncate font-mono text-[8.5px] tracking-[0.14em] text-[#505562] uppercase sm:text-[9px]">
                        {m.label}
                      </p>
                      <p className="mt-1 truncate font-display text-xs font-extrabold text-[#0038FF] sm:text-sm">
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stack + Dedicated Page CTA */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {project.stack.map((tag) => (
                    <span
                      key={tag}
                      className="text-trim rounded-md border border-black/10 bg-[#ECEEF0]/80 px-2 py-1 font-mono text-[9.5px] tracking-[0.1em] text-[#0D0E12] uppercase"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/works/${project.id}`}
                  className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-[#0038FF] uppercase hover:underline"
                >
                  <span>OPEN CASE STUDY</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Interactive 3D LiDAR Studio, WebGPU Lab (vgpu), & Technical Blueprint Plates (lazy-loaded) */}
        <LazyWorksLabSection showPlates plates={plates} />
      </div>
    </section>
  );
}
