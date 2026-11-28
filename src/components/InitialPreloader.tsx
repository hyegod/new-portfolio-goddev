"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PORTFOLIO_PROFILE } from "@/data/portfolio";

type PreloaderPhase = "loading" | "ready" | "exiting" | "done";

/** Balanced, poised ramp (~1.05s) + brief 100% hold (~150ms) + smooth GPU curtain lift (~420ms). */
const MIN_LOAD_MS = 1050;
const READY_HOLD_MS = 150;
const EXIT_CURTAIN_MS = 420;

/** Architectural ease curve: smooth start, poised mid-glide, soft settle into 100%. */
function easeProgress(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const base =
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const microHold = Math.sin(t * Math.PI * 2) * 0.02 * (1 - t);
  return Math.max(0, Math.min(1, base + microHold));
}

function getStatusLabel(pct: number): string {
  if (pct >= 100) return "READY";
  if (pct >= 72) return "CALIBRATING 3D · GPU";
  if (pct >= 34) return "LOADING ARCHITECTURE";
  return "INITIALIZING SURFACE";
}

export function InitialPreloader() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  const [phase, setPhase] = useState<PreloaderPhase>(
    isAdmin ? "done" : "loading"
  );

  const barRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const finishedRef = useRef(false);
  const skipTimerRef = useRef<number>(0);

  useEffect(() => {
    if (isAdmin || finishedRef.current) {
      setPhase("done");
      return;
    }

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReduced) {
      finishedRef.current = true;
      setPhase("done");
      return;
    }

    let rafId = 0;
    let holdTimer = 0;
    let exitTimer = 0;
    let disposed = false;
    let assetsReady = document.readyState === "complete";

    const markAssetsReady = () => {
      assetsReady = true;
    };

    if (!assetsReady) {
      window.addEventListener("load", markAssetsReady, { once: true });
    }
    if ("fonts" in document && document.fonts?.ready) {
      document.fonts.ready.then(markAssetsReady).catch(() => {});
    }

    const startTime = performance.now();
    let lastDisplayed = -1;
    let lastLabel = "";

    const paintProgress = (ratio: number, pct: number) => {
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${ratio.toFixed(4)})`;
      }
      if (pct !== lastDisplayed) {
        lastDisplayed = pct;
        if (pctRef.current) {
          pctRef.current.textContent = `${String(pct).padStart(3, "0")}%`;
        }
        const label = getStatusLabel(pct);
        if (label !== lastLabel) {
          lastLabel = label;
          if (statusRef.current) {
            statusRef.current.textContent = label;
          }
        }
      }
    };

    const complete = () => {
      if (disposed || finishedRef.current) return;
      finishedRef.current = true;
      paintProgress(1, 100);
      setPhase("ready");

      holdTimer = window.setTimeout(() => {
        if (disposed) return;
        setPhase("exiting");

        exitTimer = window.setTimeout(() => {
          if (disposed) return;
          setPhase("done");
        }, EXIT_CURTAIN_MS);
      }, READY_HOLD_MS);
    };

    const tick = (now: number) => {
      if (disposed || finishedRef.current) return;
      const elapsed = now - startTime;
      const rawT = Math.min(1, elapsed / MIN_LOAD_MS);
      let eased = easeProgress(rawT);

      if (!assetsReady && elapsed < MIN_LOAD_MS + 600) {
        eased = Math.min(eased, 0.94);
      }

      const nextPct = Math.min(100, Math.round(eased * 100));
      paintProgress(eased, nextPct);

      if (rawT >= 1 && (assetsReady || elapsed >= MIN_LOAD_MS + 600)) {
        complete();
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      window.clearTimeout(holdTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(skipTimerRef.current);
      window.removeEventListener("load", markAssetsReady);
    };
  }, [isAdmin]);

  const handleSkip = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (barRef.current) barRef.current.style.transform = "scaleX(1)";
    if (pctRef.current) pctRef.current.textContent = "100%";
    if (statusRef.current) statusRef.current.textContent = "READY";
    setPhase("exiting");
    skipTimerRef.current = window.setTimeout(() => {
      setPhase("done");
    }, EXIT_CURTAIN_MS);
  };

  if (isAdmin || phase === "done") return null;

  const isExiting = phase === "exiting";
  const isReady = phase === "ready" || isExiting;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading ${PORTFOLIO_PROFILE.brand} portfolio`}
      data-phase={phase}
      className={`preloader-curtain fixed inset-0 z-[9990] flex touch-none overscroll-none flex-col justify-between bg-[#ECEEF0] px-4 py-5 text-[#0D0E12] select-none sm:px-8 sm:py-7 lg:px-12 ${
        isExiting ? "preloader-curtain-exit pointer-events-none" : ""
      }`}
    >
      {/* Subtle Architectural Blueprint Grid */}
      <div
        aria-hidden="true"
        className="preloader-grid pointer-events-none absolute inset-0"
      />

      {/* Fine Corner Registration Ticks */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-4 left-4 h-3 w-3 border-t border-l border-black/25 sm:top-6 sm:left-6"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-4 right-4 h-3 w-3 border-t border-r border-black/25 sm:top-6 sm:right-6"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-4 left-4 h-3 w-3 border-b border-l border-black/25 sm:bottom-6 sm:left-6"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-4 bottom-4 h-3 w-3 border-r border-b border-[#0038FF]/60 sm:right-6 sm:bottom-6"
      />

      {/* Top Strip */}
      <div
        className={`preloader-inner relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between font-mono text-[9.5px] tracking-[0.18em] text-[#505562] uppercase sm:text-[10px] ${
          isExiting ? "preloader-inner-exit" : ""
        }`}
      >
        <span>00 // PORTFOLIO</span>
        <span className="inline-flex items-center gap-2 text-[#0D0E12]">
          <span
            className="status-dot h-1.5 w-1.5 rounded-full bg-[#0038FF]"
            aria-hidden="true"
          />
          <span>CIVIL × SWE</span>
        </span>
      </div>

      {/* Minimalist Centerpiece */}
      <div
        className={`preloader-inner relative z-10 mx-auto flex w-full max-w-xs flex-col items-center text-center sm:max-w-sm ${
          isExiting ? "preloader-inner-exit" : ""
        }`}
      >
        <p className="font-display text-3xl font-extrabold tracking-[0.22em] text-[#0D0E12] uppercase sm:text-4xl">
          {PORTFOLIO_PROFILE.brand}
        </p>

        {/* Crisp 2px Electric Cobalt Progress Hairline */}
        <div className="mt-6 h-[2px] w-full overflow-hidden rounded-full bg-black/10">
          <div
            ref={barRef}
            style={{ transform: "scaleX(0)" }}
            className="h-full w-full origin-left bg-[#0038FF] will-change-transform"
          />
        </div>

        {/* Clean Tabular Counter & Phase Telemetry (DOM-driven: 0 React re-renders during ramp) */}
        <div className="mt-3.5 flex w-full items-center justify-between font-mono text-[10px] tracking-[0.18em] uppercase">
          <span
            ref={statusRef}
            className={isReady ? "font-semibold text-[#0038FF]" : "text-[#505562]"}
          >
            INITIALIZING SURFACE
          </span>
          <span
            ref={pctRef}
            className="font-semibold text-[#0D0E12] tabular-nums"
          >
            000%
          </span>
        </div>
      </div>

      {/* Bottom Strip */}
      <div
        className={`preloader-inner relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 font-mono text-[9.5px] tracking-[0.18em] text-[#505562] uppercase sm:text-[10px] ${
          isExiting ? "preloader-inner-exit" : ""
        }`}
      >
        <span className="min-w-0 truncate">{PORTFOLIO_PROFILE.location}</span>
        <button
          type="button"
          onClick={handleSkip}
          className="shrink-0 rounded px-2 py-1 text-[#505562] transition-colors hover:text-[#0038FF]"
        >
          SKIP ↗
        </button>
      </div>
    </div>
  );
}

export default InitialPreloader;
