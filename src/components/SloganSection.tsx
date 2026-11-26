"use client";

import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { SprayInfinity } from "./SprayArtworks";

export function SloganSection() {
  return (
    <section
      id="slogan"
      className="relative overflow-hidden border-b border-black/15 bg-gradient-to-b from-[#ECEEF0] via-[#F5F6F8] to-[#ECEEF0] px-3 py-20 min-[380px]:px-4 sm:px-8 sm:py-28 lg:px-12 lg:py-32"
      aria-labelledby="slogan-heading"
    >
      {/* Giant Electric Cobalt-Blue Spray Infinity Loop */}
      <div className="relative mx-auto max-w-[1440px]">
        <div className="relative flex min-h-[340px] flex-col justify-center py-6 sm:min-h-[500px] sm:py-8">
          <div className="manifesto-infinity pointer-events-none absolute inset-0 flex items-center justify-center">
            <SprayInfinity className="w-[108%] max-w-[1160px] opacity-95" />
          </div>

          <div className="relative z-10 grid min-w-0 items-end gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <div data-anim="mask-group" className="min-w-0">
              <p className="reveal-up mb-3 font-mono text-[10px] tracking-[0.2em] text-[#0038FF] uppercase sm:mb-4 sm:text-[11px] sm:tracking-[0.22em]">
                02 // SLOGAN · 無限の可能性
              </p>
              <h2
                id="slogan-heading"
                className="font-display text-[clamp(1.9rem,8.2vw,7.4rem)] leading-[0.9] font-extrabold tracking-[-0.04em] text-[#0D0E12] uppercase sm:leading-[0.88]"
              >
                <span className="block">
                  <span className="slogan-word-left mask-line inline-block">
                    ENDLESS
                  </span>
                </span>
                <span className="block">
                  <span className="slogan-word-right mask-line inline-block">
                    NO LIMIT
                  </span>
                </span>
              </h2>
            </div>

            {/* Frosted Drafting Vellum Glass Card Refracting Cobalt Infinity */}
            <div className="slogan-glass-float min-w-0 lg:mb-3">
              <div className="reveal-up glass-vellum space-y-3.5 rounded-2xl border-l-2 border-l-[#0038FF] p-4 sm:space-y-4 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[9.5px] font-semibold tracking-[0.18em] text-[#0038FF] uppercase sm:text-[10px] sm:tracking-[0.22em]">
                    SLOGAN // CONCRETE × CODE
                  </p>
                  <span className="font-mono text-[9px] tracking-[0.16em] text-[#505562] uppercase sm:tracking-[0.18em]">
                    GLASS PLATE 02
                  </span>
                </div>
                <p className="text-lg font-bold tracking-tight text-[#0D0E12] sm:text-xl">
                  構造とコードの無限の可能性
                </p>
                <p className="text-[13px] leading-relaxed text-[#242832] sm:text-sm">
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
                  className="glass-cobalt group inline-flex items-center gap-2 rounded-lg px-3.5 py-2 whitespace-nowrap font-mono text-[10px] font-semibold tracking-[0.16em] text-[#0038FF] uppercase transition-colors hover:bg-[#0038FF] hover:text-white sm:px-4 sm:py-2.5 sm:text-[11px] sm:tracking-[0.2em]"
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
