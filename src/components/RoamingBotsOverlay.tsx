"use client";

import { useEffect, useRef, useState } from "react";
import { Bot } from "lucide-react";
import { scheduleBackgroundTask } from "@/lib/devicePerf";
import { createRoamingRenderer } from "@/vgpu-demos/mechanical-garden/roaming";

const STORAGE_KEY = "goddev-roaming-bots";

/**
 * Full-viewport transparent WebGPU overlay with 2 free-roaming quadruped FABRIK IK companions.
 * Click any empty page space to summon the nearest robot; toggleable via corner pill.
 * Auto-skips on touch-only mobile screens, reduced-motion, or non-WebGPU browsers for zero overhead.
 */
export function RoamingBotsOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [booted, setBooted] = useState(false);
  const [ready, setReady] = useState(false);

  // Detect WebGPU + desktop/tablet capability & persisted preference, deferred behind Hero LCP
  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    const hasGpu = "gpu" in navigator && Boolean(navigator.gpu);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrowTouch =
      window.matchMedia("(hover: none) and (pointer: coarse)").matches &&
      window.innerWidth < 768;

    if (!hasGpu || reduced || narrowTouch) {
      setSupported(false);
      return;
    }

    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      if (saved === "off") setEnabled(false);
    } catch {
      // Ignore storage errors
    }

    setSupported(true);
    return scheduleBackgroundTask(() => {
      setBooted(true);
    }, 360);
  }, []);

  useEffect(() => {
    if (!supported || !booted || !enabled) {
      setReady(false);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const renderer = createRoamingRenderer({ canvas, count: 2 });

    renderer.ready
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setReady(false);
          setSupported(false);
        }
      });

    return () => {
      cancelled = true;
      setReady(false);
      renderer.dispose();
    };
  }, [supported, booted, enabled]);

  if (!supported) return null;

  const toggleBots = () => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        window.sessionStorage.setItem(STORAGE_KEY, next ? "on" : "off");
      } catch {
        // Ignore
      }
      return next;
    });
  };

  return (
    <>
      {enabled && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            className={`block h-full w-full transition-opacity duration-700 ${
              ready ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>
      )}

      {/* Subtle corner toggle pill so visitors can pause/hide roaming bots anytime */}
      <button
        type="button"
        onClick={toggleBots}
        aria-pressed={enabled}
        title={
          enabled
            ? "Hide roaming quadruped bots (click empty page space to summon)"
            : "Enable roaming quadruped bots"
        }
        className={`fixed bottom-3 z-40 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[9px] font-semibold tracking-[0.16em] uppercase shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all sm:bottom-5 ${
          process.env.NODE_ENV === "development"
            ? "left-14 sm:left-16"
            : "left-3 sm:left-6"
        } ${
          enabled
            ? "glass-pill-light text-[#0D0E12] hover:border-[#0038FF] hover:text-[#0038FF]"
            : "glass-pill-light text-[#505562] opacity-75 hover:border-[#0038FF] hover:opacity-100"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full transition-colors ${
            enabled ? "bg-[#0038FF]" : "bg-black/25"
          }`}
          aria-hidden="true"
        />
        <Bot className="h-3 w-3 shrink-0" />
        <span className="text-trim">{enabled ? "BOTS · ON" : "BOTS · OFF"}</span>
      </button>
    </>
  );
}

export default RoamingBotsOverlay;
