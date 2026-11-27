"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { SKILL_PILLARS, type SkillTier } from "@/data/portfolio";
import { useInViewport } from "@/lib/devicePerf";
import { LazyInteractiveFluidShowcase } from "./VgpuShowcases";

const STANDARDS = [
  "SNI 1726 & 2847",
  "ACI 318",
  "AISC 360",
  "ISO 19650 OPENBIM",
  "WGS84 / GIS",
  "WEBGPU & WGSL",
  "REST / GRAPHQL",
];

function tierBadgeClass(tier: SkillTier) {
  if (tier === "CORE") {
    return "border-[#0038FF]/30 bg-[#0038FF]/10 text-[#0038FF]";
  }
  if (tier === "DAILY") {
    return "border-[#0D0E12] bg-[#0D0E12] text-white";
  }
  return "border-black/15 bg-[#ECEEF0] text-[#4A505E]";
}

export function SkillSection() {
  const fluidRef = useRef<HTMLDivElement>(null);
  const showFluid = useInViewport(fluidRef, "420px 0px");

  return (
    <section
      id="skill"
      className="relative border-b border-black/15 px-3 py-16 min-[380px]:px-4 sm:px-8 sm:py-20 lg:px-12 lg:py-28"
      aria-labelledby="skill-heading"
    >
      <div className="mx-auto max-w-[1440px]">
        {/* Header + Tier Legend */}
        <div className="mb-8 border-b border-black/12 pb-6 sm:mb-10">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div data-anim="mask-group" className="min-w-0">
              <p className="reveal-up font-mono text-[10px] tracking-[0.2em] text-[#0038FF] uppercase sm:text-[11px] sm:tracking-[0.22em]">
                03 // TECHNICAL SPEC SHEET · DUAL-TRACK STACK
              </p>
              <h2
                id="skill-heading"
                className="mt-2 font-display text-[clamp(1.45rem,6vw,3.75rem)] leading-[0.98] font-extrabold tracking-tight text-[#0D0E12] uppercase"
              >
                <span className="mask-line block">
                  ENGINEERING <span className="text-[#0038FF]">SKILLS</span>
                </span>
              </h2>
            </div>

            <div className="reveal-up flex min-w-0 flex-col gap-2 md:items-end">
              <p className="max-w-sm font-mono text-[11px] leading-relaxed text-[#505562] sm:text-xs md:text-right">
                Capability breakdown organized by engineering output, real
                production tools, and daily usage tier — no arbitrary percentages.
              </p>
              {/* Subtle Tier Legend */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[9px] tracking-[0.14em] text-[#505562] uppercase sm:tracking-[0.16em]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#0038FF]" />
                  CORE SPECIALTY
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#0D0E12]" />
                  DAILY DRIVER
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-black/25" />
                  SPECIALIZED
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Spec Sheet 3-Column Grid */}
        <div
          data-anim="stagger-group"
          className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {SKILL_PILLARS.map((pillar) => (
            <div key={pillar.id} className="stagger-item flex min-w-0">
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25 }}
                className="flex w-full min-w-0 flex-col justify-between rounded-2xl border border-black/12 bg-white/85 p-4 shadow-[0_12px_32px_-16px_rgba(13,14,18,0.1)] transition-shadow hover:shadow-[0_20px_42px_-16px_rgba(0,56,255,0.14)] min-[380px]:p-5 sm:p-6 lg:p-7"
              >
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2 font-mono text-[10px] tracking-[0.16em] sm:text-[11px] sm:tracking-[0.18em]">
                  <span className="font-bold text-[#0038FF]">
                    SPEC {pillar.num}
                  </span>
                  <span className="text-[#505562]">{pillar.jp}</span>
                </div>
                <h3 className="mt-3 break-words font-display text-[1.05rem] leading-tight font-extrabold tracking-tight text-[#0D0E12] uppercase min-[380px]:text-lg md:text-[1.15rem] lg:text-[1.08rem] xl:text-2xl">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#4B505E] sm:text-sm">
                  {pillar.tagline}
                </p>

                {/* Crisp Spec Sheet Rows */}
                <ul className="mt-5 divide-y divide-black/10 border-t border-black/12 sm:mt-6">
                  {pillar.skills.map((skill) => (
                    <li
                      key={skill.name}
                      className="group py-3.5 first:pt-4 last:pb-1 sm:py-4 sm:first:pt-5"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <span className="min-w-0 text-[13px] font-bold tracking-tight text-[#0D0E12] transition-colors group-hover:text-[#0038FF] sm:text-sm">
                          {skill.name}
                        </span>
                        <span
                          className={`text-trim shrink-0 rounded border px-1.5 py-0.5 font-mono text-[8.5px] font-semibold tracking-[0.14em] uppercase sm:px-2 sm:text-[9px] sm:tracking-[0.16em] ${tierBadgeClass(
                            skill.tier
                          )}`}
                        >
                          {skill.tier}
                        </span>
                      </div>

                      <p className="mt-1.5 text-xs leading-relaxed text-[#525765]">
                        {skill.detail}
                      </p>

                      {/* Clean Monospace Tool Tag Strip */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {skill.tools.map((tool) => (
                          <span
                            key={tool}
                            className="text-trim rounded bg-[#ECEEF0] px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.05em] text-[#1D212B]"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                  </ul>
                </div>
              </motion.div>
            </div>
          ))}
        </div>

        {/* Interactive Navier-Stokes Fluid Stage & Engineering Standards Strip */}
        <div
          ref={fluidRef}
          className="anim-stage-reveal relative mt-8 flex min-h-[280px] flex-col justify-between overflow-hidden rounded-2xl border border-black/20 bg-[#06080F] shadow-[0_24px_54px_-18px_rgba(6,8,16,0.4)] sm:mt-10 sm:min-h-[340px]"
        >
          {/* Live Interactive Fluid Canvas (vgpu compute solver + WebGL2 mobile fallback) */}
          <div className="absolute inset-0 z-0">
            {showFluid && <LazyInteractiveFluidShowcase />}
          </div>

          {/* Floating Minimal Top Telemetry (pointer-events-none so mouse stirs fluid freely) */}
          <div className="pointer-events-none relative z-10 flex flex-wrap items-center justify-between gap-2 p-3.5 sm:p-5">
            <span className="glass-obsidian inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-[9.5px] font-semibold tracking-[0.16em] text-white uppercase sm:text-[10px] sm:tracking-[0.2em]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5B86FF]" />
              <span>FLUID MECHANICS × GPU // INTERACTIVE NAVIER-STOKES</span>
            </span>
            <span className="glass-obsidian rounded-lg px-3 py-1.5 font-mono text-[9px] tracking-[0.16em] text-white/75 uppercase sm:text-[9.5px]">
              MOVE OR DRAG TO STIR
            </span>
          </div>

          {/* Floating Bottom Codes & Protocols Glass Strip */}
          <div className="pointer-events-none relative z-10 p-3.5 sm:p-5">
            <div className="glass-obsidian flex flex-wrap items-center gap-1.5 rounded-xl px-3.5 py-3 sm:gap-2 sm:px-5 sm:py-3.5">
              <span className="mr-1 font-mono text-[9.5px] font-bold tracking-[0.18em] text-[#78A6FF] uppercase sm:mr-2 sm:text-[10px] sm:tracking-[0.2em]">
                CODES &amp; PROTOCOLS //
              </span>
              {STANDARDS.map((std) => (
                <span
                  key={std}
                  className="text-trim rounded-md border border-white/15 bg-white/10 px-2 py-1 font-mono text-[9px] tracking-[0.12em] text-white uppercase sm:px-2.5 sm:text-[10px] sm:tracking-[0.14em]"
                >
                  {std}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
