"use client";

import { useRef } from "react";
import {
  ABOUT_STATS,
  EXPERIENCE,
  PORTFOLIO_PROFILE,
} from "@/data/portfolio";
import { useInViewport } from "@/lib/devicePerf";
import { SpraySignature } from "./SprayArtworks";
import { LazyMechanicalGardenShowcase } from "./VgpuShowcases";

export function AboutSection() {
  const kinematicsRef = useRef<HTMLDivElement>(null);
  const showKinematics = useInViewport(kinematicsRef, "420px 0px");
  return (
    <section
      id="about"
      className="relative overflow-hidden border-b border-black/15 px-3 py-16 min-[380px]:px-4 sm:px-8 sm:py-20 lg:px-12 lg:py-28"
      aria-labelledby="about-heading"
    >
      <div className="mx-auto max-w-[1440px]">
        <p className="mb-6 font-mono text-[10px] tracking-[0.2em] text-[#0038FF] uppercase sm:mb-8 sm:text-[11px] sm:tracking-[0.22em]">
          01 // ABOUT ME · {PORTFOLIO_PROFILE.jpMark}
        </p>

        {/* Bold Oversized Statement + Top-Right Frosted Profile Card + Cobalt Spray Signature */}
        <div className="relative pb-10 sm:pb-14">
          <div className="grid min-w-0 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
            <div
              data-anim="mask-group"
              className="min-w-0 font-display text-[clamp(1.38rem,5.7vw,5.4rem)] leading-[0.96] font-extrabold tracking-[-0.035em] text-[#0D0E12] uppercase sm:leading-[0.94]"
            >
              <h2 id="about-heading" className="break-words">
                <span className="mask-line block">ENGINEER</span>
                <span className="mask-line block">REAL STRUCTURES</span>
              </h2>
            </div>

            <div className="reveal-up glass-vellum min-w-0 space-y-3 rounded-2xl border-l-2 border-l-[#0038FF] p-4 sm:p-6 lg:mt-2">
              <p className="font-mono text-[9.5px] font-semibold tracking-[0.18em] text-[#0038FF] uppercase sm:text-[10px] sm:tracking-[0.22em]">
                PERSONAL PROFILE // CIVIL × CODE × CRAFT
              </p>
              <p className="text-[15px] font-semibold leading-snug text-[#0D0E12] sm:text-base">
                {PORTFOLIO_PROFILE.fullName} — Civil Engineering student at
                Bosowa University &amp; Full-Stack Software Developer.
              </p>
              <p className="text-[13px] leading-relaxed text-[#363B47] sm:text-sm">
                I combine civil engineering logic with software craftsmanship —
                designing buildings, seismic frames, and BIM workflows alongside
                full-stack web, mobile, and 3D interactive apps. Off the clock,
                music is my creative escape through playing bass, while
                photography and videography let me capture everyday stories
                through a lens.
              </p>
            </div>
          </div>

          <div
            data-anim="mask-group"
            className="relative mt-4 min-w-0 font-display text-[clamp(1.38rem,5.7vw,5.4rem)] leading-[0.96] font-extrabold tracking-[-0.035em] text-[#0D0E12] uppercase sm:mt-2 sm:leading-[0.94]"
          >
            <p className="relative z-10 break-words">
              <span className="mask-line block">AND WRITE SOFTWARE</span>
              <span className="mask-line block">FULL OF</span>
              <span className="mask-line block">
                &ldquo;PRECISION&rdquo; AND &ldquo;DEPTH&rdquo;.
              </span>
            </p>

            {/* Sweeping Electric Cobalt Spray Signature — draws across on scroll */}
            <div className="anim-spray-draw pointer-events-none absolute right-0 -bottom-5 z-0 w-[85%] max-w-[640px] opacity-95 sm:-bottom-10">
              <SpraySignature className="w-full" />
            </div>
          </div>
        </div>

        {/* Open Cardless Architectural Telemetry Strip */}
        <div
          data-anim="stagger-group"
          className="mt-10 grid grid-cols-1 border-y border-black/15 min-[420px]:grid-cols-2 sm:mt-12 lg:grid-cols-4"
        >
          {ABOUT_STATS.map((stat, idx) => (
            <div
              key={stat.label}
              className={`stagger-item min-w-0 py-4 sm:py-7 ${
                idx < ABOUT_STATS.length - 1 ? "border-b border-black/12" : ""
              } ${idx >= 2 ? "min-[420px]:border-b-0" : ""} ${
                idx % 2 === 1
                  ? "min-[420px]:border-l min-[420px]:border-black/12 min-[420px]:pl-5"
                  : "min-[420px]:pr-5"
              } lg:border-b-0 ${
                idx === 0
                  ? "lg:border-l-0 lg:pl-0 lg:pr-8"
                  : idx === ABOUT_STATS.length - 1
                    ? "lg:border-l lg:border-black/12 lg:pl-8 lg:pr-0"
                    : "lg:border-l lg:border-black/12 lg:px-8"
              }`}
            >
              <p className="font-mono text-[10px] tracking-[0.18em] text-[#505562] uppercase sm:tracking-[0.2em]">
                {stat.label}
              </p>
              <p className="mt-1.5 font-display text-base font-extrabold tracking-tight text-[#0038FF] min-[420px]:mt-2 min-[420px]:text-lg sm:text-xl lg:whitespace-nowrap xl:text-[1.45rem]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Interactive Computational Kinematics Stage (Mechanical Garden — FABRIK IK on Exposed Concrete) */}
        <div ref={kinematicsRef} className="mt-12 sm:mt-14">
          <div className="reveal-up mb-3.5 flex flex-wrap items-baseline justify-between gap-2 font-mono text-[10px] tracking-[0.18em] uppercase sm:text-[11px] sm:tracking-[0.22em]">
            <span className="font-semibold text-[#0038FF]">
              COMPUTATIONAL KINEMATICS // MECHANICAL GARDEN · FABRIK IK
            </span>
            <span className="text-[#505562]">
              ORBIT · SCULPT CONCRETE · CLICK DESTINATION (VGPU/SCENE)
            </span>
          </div>

          <div className="anim-stage-reveal relative h-[440px] w-full overflow-hidden rounded-2xl border border-black/18 bg-[#8D9096] shadow-[0_24px_54px_-18px_rgba(13,14,18,0.22)] sm:h-[520px]">
            {showKinematics && <LazyMechanicalGardenShowcase />}
          </div>
        </div>

        {/* Personal Experience & Engineering Track Record */}
        <div className="mt-12 sm:mt-14">
          <div className="reveal-up mb-5 flex items-center justify-between font-mono text-[11px] tracking-[0.22em] text-[#505562] uppercase">
            <span>MY TIMELINE // EDUCATION &amp; EXPERIENCE</span>
            <span className="hidden sm:inline">BOSOWA × SOFTWARE DEV</span>
          </div>
          <div
            data-anim="slide-group"
            className="divide-y divide-black/12 border-y border-black/12"
          >
            {EXPERIENCE.map((exp) => (
              <div
                key={exp.period}
                className="slide-row grid min-w-0 gap-2.5 py-4 transition-colors hover:bg-white/40 sm:gap-3 sm:py-5 md:grid-cols-[180px_minmax(0,1fr)_minmax(0,1.2fr)] md:items-baseline"
              >
                <span className="font-mono text-xs font-semibold tracking-[0.16em] text-[#0038FF]">
                  {exp.period}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-base font-extrabold tracking-tight text-[#0D0E12] uppercase sm:text-lg">
                    {exp.role}
                  </p>
                  <p className="font-mono text-[10.5px] tracking-[0.14em] text-[#505562] uppercase sm:text-[11px]">
                    {exp.company}
                  </p>
                </div>
                <p className="text-[13px] leading-relaxed text-[#454A57] sm:text-sm">
                  {exp.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
