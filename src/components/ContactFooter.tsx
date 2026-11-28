"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowUpRight, Check, Copy, X } from "lucide-react";
import { motion } from "motion/react";
import { PORTFOLIO_PROFILE } from "@/data/portfolio";
import { useInViewport } from "@/lib/devicePerf";
import { LazyBlackHoleShowcase } from "./VgpuShowcases";

export function ContactFooter() {
  const [copied, setCopied] = useState(false);
  const [localClock, setLocalClock] = useState("LOCAL");
  const footerRef = useRef<HTMLElement>(null);
  const creditsDialogRef = useRef<HTMLDialogElement>(null);
  const isNearFooter = useInViewport(footerRef, "120px 0px");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const time = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setLocalClock(`${time} LOCAL`);
    };
    updateClock();
    const id = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(PORTFOLIO_PROFILE.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.location.href = `mailto:${PORTFOLIO_PROFILE.email}`;
    }
  };

  useEffect(() => {
    const dialog = creditsDialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      dialog.returnValue = "";
    };
    dialog.addEventListener("close", onClose);

    let cleanupFallback: (() => void) | undefined;
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      let pressedOutside = false;
      const onDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e) && dialog.open) dialog.close();
      };
      dialog.addEventListener("pointerdown", onDown);
      dialog.addEventListener("pointerup", onUp);
      cleanupFallback = () => {
        dialog.removeEventListener("pointerdown", onDown);
        dialog.removeEventListener("pointerup", onUp);
      };
    }

    return () => {
      dialog.removeEventListener("close", onClose);
      cleanupFallback?.();
    };
  }, []);

  return (
    <footer
      ref={footerRef}
      id="contact"
      className="deferred-footer relative overflow-hidden bg-[#08090D] px-3 pt-16 pb-10 text-[#F2F4F7] min-[380px]:px-4 sm:px-8 sm:pt-24 lg:px-12 lg:pt-28"
    >
      {/* Official Multi-Pass Baked Optimized Black Hole (vgpu · viewport-mounted + WebGL2 mobile fallback) */}
      {isNearFooter && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 opacity-85"
        >
          <LazyBlackHoleShowcase ambient />
          <div className="absolute inset-0 bg-gradient-to-r from-[#08090D]/90 via-[#08090D]/50 to-transparent" />
        </div>
      )}

      {/* Pure Electric Cobalt Ambient Halo behind Smoked Glass Contact Panel (zero GPU blur filter) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 right-4 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(0,56,255,0.26)_0%,transparent_68%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 left-[18%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.14)_0%,transparent_68%)]"
      />

      <div className="relative z-10 mx-auto max-w-[1440px]">
        <div className="grid min-w-0 gap-10 border-b border-white/12 pb-14 sm:gap-12 sm:pb-16 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:items-end">
          {/* Left: Minimalist Display Statement + Quiet Availability Metadata */}
          <div data-anim="mask-group" className="min-w-0">
            <p className="reveal-up inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-[#5B86FF] uppercase sm:text-[11px] sm:tracking-[0.22em]">
              <span
                className="status-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B82F6]"
                aria-hidden="true"
              />
              <span>05 // CONTACT · START A CONVERSATION</span>
            </p>

            <h2 className="mt-3.5 font-display text-[clamp(1.5rem,4.4vw,4rem)] leading-[0.95] font-extrabold tracking-[-0.03em] text-white uppercase">
              <span className="mask-line block">LET&apos;S ENGINEER</span>
              <span className="mask-line block">
                SOMETHING <span className="text-[#3B82F6]">SOLID.</span>
              </span>
            </h2>

            <p className="reveal-up mt-5 font-mono text-[10px] tracking-[0.16em] text-white/45 uppercase tabular-nums sm:text-[11px]">
              {PORTFOLIO_PROFILE.location} · {localClock} · REPLY &lt; 24H
            </p>
          </div>

          {/* Right: Single Restrained Smoked Obsidian Glass Contact Card */}
          <div className="reveal-up glass-obsidian min-w-0 w-full space-y-5 rounded-2xl p-5 sm:p-7 lg:max-w-[460px] lg:justify-self-end">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[9.5px] tracking-[0.18em] text-[#7D9BFF] uppercase sm:text-[10px] sm:tracking-[0.2em]">
                DIRECT TRANSMISSION
              </p>
              <span className="font-mono text-[9px] tracking-[0.16em] text-white/45 uppercase">
                OPEN FOR WORK
              </span>
            </div>

            <p className="text-[13.5px] leading-relaxed text-white/75 sm:text-sm">
              Open to full-stack web &amp; mobile projects, civil &amp; BIM
              collaborations, and interactive 3D builds — or a casual chat about
              engineering, music, and photography.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <motion.a
                href={`mailto:${PORTFOLIO_PROFILE.email}`}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 24 }}
                className="group inline-flex max-w-full items-center gap-2 rounded-lg bg-white px-4 py-3 font-mono text-[11px] font-semibold tracking-[0.14em] text-[#08090D] uppercase transition-colors hover:bg-[#0038FF] hover:text-white sm:px-5 sm:py-3.5 sm:text-xs sm:tracking-[0.16em]"
              >
                <span className="text-trim truncate">{PORTFOLIO_PROFILE.email}</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:h-4 sm:w-4" />
              </motion.a>

              <motion.button
                type="button"
                onClick={() => void handleCopyEmail()}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 24 }}
                className="glass-pill-dark inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-3 font-mono text-[11px] tracking-[0.14em] text-white uppercase transition-colors hover:border-[#5878FF] hover:text-[#89A2FF] sm:px-4 sm:py-3.5 sm:text-xs sm:tracking-[0.16em]"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-[#3de8a5]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span className="text-trim">{copied ? "COPIED" : "COPY"}</span>
              </motion.button>
            </div>

            <p className="border-t border-white/10 pt-3.5 font-mono text-[9.5px] tracking-[0.14em] text-white/45 uppercase">
              CIVIL × BIM · FULL-STACK WEB &amp; MOBILE · 3D &amp; WEBGPU
            </p>
          </div>
        </div>

        {/* Minimalist Bottom Links & Colophon */}
        <div
          data-anim="stagger-group"
          className="mt-7 flex flex-col justify-between gap-5 font-mono text-[10px] tracking-[0.14em] text-white/55 uppercase sm:flex-row sm:items-center sm:gap-6 sm:text-[11px] sm:tracking-[0.16em]"
        >
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            {PORTFOLIO_PROFILE.socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="stagger-item group inline-flex items-center gap-1 transition-colors hover:text-white"
              >
                <span className="decoration-[#3B82F6] underline-offset-4 group-hover:underline">
                  {s.label}
                </span>
                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <button
              type="button"
              onClick={() => creditsDialogRef.current?.showModal()}
              className="underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
            >
              CREDITS &amp; TECH STACK
            </button>
            <span className="text-white/45">
              © 2026 {PORTFOLIO_PROFILE.fullName.toUpperCase()}
            </span>
            <a
              href="#top"
              className="inline-flex items-center gap-1 text-white/75 transition-colors hover:text-[#7D9BFF]"
            >
              <span>TOP</span>
              <ArrowUp className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Native Light Frosted-Glass <dialog> Credits Modal */}
      <dialog
        ref={creditsDialogRef}
        id="credits-dialog"
        closedby="any"
        aria-labelledby="credits-dialog-title"
        data-lenis-prevent
        className="editorial-dialog"
      >
        <div className="editorial-dialog-scroll p-4 sm:p-8" data-lenis-prevent>
          <div className="flex items-start justify-between gap-3 border-b border-black/15 pb-4">
            <div className="min-w-0">
              <p className="font-mono text-[9.5px] tracking-[0.18em] text-[#0038FF] uppercase sm:text-[10px] sm:tracking-[0.22em]">
                COLOPHON // ARCHITECTURE
              </p>
              <h2
                id="credits-dialog-title"
                className="mt-1 break-words font-display text-lg font-extrabold uppercase sm:text-2xl"
              >
                CREDITS &amp; MODERN WEB STACK
              </h2>
            </div>
            <form method="dialog" className="shrink-0">
              <button
                type="submit"
                value="close"
                autoFocus
                aria-label="Close credits dialog"
                className="grid h-9 w-9 place-items-center rounded-lg border border-black/20 hover:border-[#0038FF] hover:bg-[#0038FF] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          </div>

          <div className="mt-5 space-y-4 text-sm text-[#353945]">
            <p>
              Engineered with <strong>Next.js 16</strong>, <strong>React 19</strong>,{" "}
              <strong>Tailwind CSS v4</strong>, <strong>Three.js + Custom GLSL Shaders</strong>,{" "}
              <strong>GSAP ScrollTrigger</strong>, <strong>Lenis Smooth Scroll</strong>, and{" "}
              <strong>Motion</strong>.
            </p>
            <p>
              Implements Modern Web Guidance standards: native{" "}
              <code>&lt;dialog&gt;</code> modals with scroll containment,{" "}
              <code>content-visibility: auto</code> with{" "}
              <code>contentvisibilityautostatechange</code> off-screen WebGL pausing,
              native CSS Scroll-Driven progress bar, <code>in oklab</code> glass
              gradients, isolated <code>color-scheme</code> LiDAR stage, and WCAG
              2.2.2 visible pause controls.
            </p>
          </div>
        </div>
      </dialog>
    </footer>
  );
}
