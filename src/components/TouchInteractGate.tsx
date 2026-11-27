"use client";

import { useEffect, useState, type RefObject } from "react";
import { ArrowUpDown, Hand } from "lucide-react";

/**
 * Detects coarse touch devices (mobile phones & tablets) and manages a scroll-safe interaction gate
 * so interactive 3D/WebGPU canvases never hijack vertical touch scrolling by default.
 * On fine-pointer desktop mice/trackpads, `isTouchDevice` stays false and `interactive` is always true.
 */
export function useTouchInteractGate(
  stageRef: RefObject<HTMLElement | null>,
  forceInteractive = false
) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => {
      setIsTouchDevice(mq.matches);
      if (!mq.matches) setUnlocked(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Automatically re-lock back to scroll-safe mode once the stage scrolls out of view
  useEffect(() => {
    if (!isTouchDevice || !unlocked) return;
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (!visible) setUnlocked(false);
      },
      { threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [isTouchDevice, unlocked, stageRef]);

  const active = forceInteractive || unlocked;
  const interactive = !isTouchDevice || active;

  return {
    isTouchDevice,
    active,
    interactive,
    toggle: () => setUnlocked((prev) => !prev),
    lock: () => setUnlocked(false),
    unlock: () => setUnlocked(true),
  };
}

export interface TouchInteractPillProps {
  /** Only renders on touch devices; returns null on desktop mouse. */
  visible: boolean;
  /** True when touch interaction (360° orbit / fluid stir) is unlocked. */
  active: boolean;
  /** Match light blueprint paper vs dark obsidian stage theme. */
  lightSurface?: boolean;
  onToggle: () => void;
  className?: string;
}

export function TouchInteractPill({
  visible,
  active,
  lightSurface = false,
  onToggle,
  className = "",
}: TouchInteractPillProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[9.5px] font-semibold tracking-[0.14em] uppercase transition-all active:scale-95 ${
        active
          ? "border border-[#6DA4FF] bg-[#0038FF] text-white shadow-[0_8px_24px_-6px_rgba(0,56,255,0.7)]"
          : lightSurface
            ? "glass-pill-light border-[#0038FF]/35 text-[#0D0E12] shadow-[0_6px_18px_-8px_rgba(13,14,18,0.22)]"
            : "glass-pill-dark border-[#5B86FF]/45 text-white shadow-[0_8px_22px_-8px_rgba(0,0,0,0.65)]"
      } ${className}`}
    >
      {active ? (
        <>
          <ArrowUpDown className="h-3 w-3 shrink-0" />
          <span className="text-trim">DONE · SCROLL</span>
        </>
      ) : (
        <>
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B7BFF]"
            aria-hidden="true"
          />
          <Hand className="h-3 w-3 shrink-0 text-[#5B86FF]" />
          <span className="text-trim">TAP TO INTERACT</span>
        </>
      )}
    </button>
  );
}
