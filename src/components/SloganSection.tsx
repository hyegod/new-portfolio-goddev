"use client";

import { useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { useInViewport } from "@/lib/devicePerf";
import { LazySpringChoreographyShowcase } from "./VgpuShowcases";

export function SloganSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const showSpring = useInViewport(sectionRef, "120px 0px");

  return (
    <section
      id="slogan"
      ref={sectionRef}
      className="deferred-slogan relative overflow-hidden border-b border-black/25 bg-[#06070C] px-3 py-20 text-white min-[380px]:px-4 sm:px-8 sm:py-28 lg:px-12 lg:py-32"
      aria-labelledby="slogan-heading"
    >
      {/* Live 500K GPU Particle Spring Choreography Backdrop (auto-mounts near viewport + WebGL2 fallback) */}
      <div className="absolute inset-0 z-0">
        {showSpring && <LazySpringChoreographyShowcase showControls />}
      </div>

      {/* Subtle Edge Contrast Vignette so Typography & Card Stay Crisp Without Blocking Pointer Interaction */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_20%_50%,rgba(6,7,12,0.74)_0%,rgba(6,7,12,0.18)_52%,rgba(6,7,12,0.52)_100%)]"
      />

      <div className="pointer-events-none relative z-10 mx-auto max-w-[1440px]">
        <div className="relative flex min-h-[380px] flex-col justify-center py-6 sm:min-h-[520px] sm:py-8">
          <div className="grid min-w-0 items-end gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <div data-anim="mask-group" className="min-w-0">
              <p className="reveal-up mb-3 font-mono text-[10px] tracking-[0.2em] text-[#6EA6FF] uppercase sm:mb-4 sm:text-[11px] sm:tracking-[0.22em]">
                02 // SLOGAN · 無限の可能性 · MOTION × VGPU SPRING
              </p>
              <h2
                id="slogan-heading"
                className="font-display text-[clamp(1.9rem,8.2vw,7.4rem)] leading-[0.9] font-extrabold tracking-[-0.04em] text-white uppercase drop-shadow-[0_10px_32px_rgba(0,0,0,0.65)] sm:leading-[0.88]"
              >
                <span className="block">
                  <span className="slogan-word-left mask-line inline-block">
                    ENDLESS
                  </span>
                </span>
                <span className="block">
                  <span className="slogan-word-right mask-line inline-block text-white/95">
                    NO LIMIT
                  </span>
                </span>
              </h2>
              <p className="mt-4 max-w-md font-mono text-[10px] tracking-[0.16em] text-white/60 uppercase">
                MOVE POINTER TO PART GPU PARTICLES · CLICK CANVAS FOR SPRING BURST
              </p>
            </div>

            {/* Frosted Obsidian Glass Card Refracting Live Particle Choreography */}
            <div className="slogan-glass-float pointer-events-auto min-w-0 lg:mb-4">
              <div className="reveal-up glass-obsidian space-y-3.5 rounded-2xl border-l-2 border-l-[#3B82F6] p-4 text-white sm:space-y-4 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[9.5px] font-semibold tracking-[0.18em] text-[#78A6FF] uppercase sm:text-[10px] sm:tracking-[0.22em]">
                    SLOGAN // CONCRETE × CODE
                  </p>
                  <span className="font-mono text-[9px] tracking-[0.16em] text-white/50 uppercase sm:tracking-[0.18em]">
                    SPRING · VGPU
                  </span>
                </div>
                <p className="text-lg font-bold tracking-tight text-white sm:text-xl">
                  構造とコードの無限の可能性
                </p>
                <p className="text-[13px] leading-relaxed text-white/75 sm:text-sm">
                  Steel and concrete follow physics; software multiplies human
                  scale. By uniting structural engineering discipline with modern
                  code, there are no boundaries between what can be calculated,
                  visualized, and built.
                </p>
                <motion.a
                  href="#skill"
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                  className="group inline-flex items-center gap-2 rounded-lg border border-[#4E7CFF]/60 bg-[#0038FF]/30 px-3.5 py-2 whitespace-nowrap font-mono text-[10px] font-semibold tracking-[0.16em] text-white uppercase backdrop-blur-md transition-colors hover:bg-[#0038FF] sm:px-4 sm:py-2.5 sm:text-[11px] sm:tracking-[0.2em]"
                >
                  <span className="text-trim">EXPLORE SKILLS</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:h-4 sm:w-4" />
                </motion.a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
