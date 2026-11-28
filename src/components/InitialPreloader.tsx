"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PORTFOLIO_PROFILE } from "@/data/portfolio";

type PreloaderPhase = "loading" | "ready" | "exiting" | "done";

/** Deliberate, unhurried ramp duration (~1.9s) + brief 100% hold (~280ms) + smooth curtain lift (~640ms). */
const MIN_LOAD_MS = 1900;
const READY_HOLD_MS = 280;
const EXIT_CURTAIN_MS = 640;

/** Architectural ease curve: smooth start, poised mid-glide, soft settle into 100%. */
function easeProgress(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  // Blend cubic ease-in-out with a subtle organic mid-curve pause around ~78%
  const base =
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const microHold = Math.sin(t * Math.PI * 2) * 0.025 * (1 - t);
  return Math.max(0, Math.min(1, base + microHold));
}

export function InitialPreloader() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  const [phase, setPhase] = useState<PreloaderPhase>(
    isAdmin ? "done" : "loading"
  );
  const [percent, setPercent] = useState<number>(0);

  const barRef = useRef<HTMLDivElement>(null);
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
      setPercent(100);
      setPhase("done");
      return;
    }

    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

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

    const complete = () => {
      if (disposed || finishedRef.current) return;
      finishedRef.current = true;
      setPercent(100);
      if (barRef.current) {
        barRef.current.style.transform = "scaleX(1)";
      }
      setPhase("ready");

      holdTimer = window.setTimeout(() => {
        if (disposed) return;
        document.documentElement.style.overflow = prevOverflow;
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

      // Wait briefly at 94% only if fonts/document are still finishing load (capped at +900ms)
      if (!assetsReady && elapsed < MIN_LOAD_MS + 900) {
        eased = Math.min(eased, 0.94);
      }

      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${eased.toFixed(4)})`;
      }

      const nextPct = Math.min(100, Math.round(eased * 100));
      if (nextPct !== lastDisplayed) {
        lastDisplayed = nextPct;
        setPercent(nextPct);
      }

      if (rawT >= 1 && (assetsReady || elapsed >= MIN_LOAD_MS + 900)) {
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
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [isAdmin]);

  const handleSkip = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    document.documentElement.style.overflow = "";
    setPercent(100);
    if (barRef.current) {
      barRef.current.style.transform = "scaleX(1)";
    }
    setPhase("exiting");
    skipTimerRef.current = window.setTimeout(() => {
      setPhase("done");
    }, EXIT_CURTAIN_MS);
  };

  if (isAdmin || phase === "done") return null;

  const isExiting = phase === "exiting";
  const statusLabel =
    percent >= 100
      ? "READY"
      : percent >= 72
        ? "CALIBRATING 3D · GPU"
        : percent >= 34
          ? "LOADING ARCHITECTURE"
          : "INITIALIZING SURFACE";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading ${PORTFOLIO_PROFILE.brand} portfolio: ${percent}%`}
      data-phase={phase}
      className={`preloader-curtain fixed inset-0 z-[9990] flex flex-col justify-between bg-[#ECEEF0] px-4 py-5 text-[#0D0E12] select-none sm:px-8 sm:py-7 lg:px-12 ${
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

        {/* Clean Tabular Counter & Phase Telemetry */}
        <div className="mt-3.5 flex w-full items-center justify-between font-mono text-[10px] tracking-[0.18em] uppercase">
          <span
            className={
              percent >= 100
                ? "font-semibold text-[#0038FF]"
                : "text-[#505562]"
            }
          >
            {statusLabel}
          </span>
          <span className="font-semibold text-[#0D0E12] tabular-nums">
            {String(percent).padStart(3, "0")}%
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
