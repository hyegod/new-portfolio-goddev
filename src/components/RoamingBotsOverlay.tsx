"use client";

import { useEffect, useRef, useState } from "react";
import { Bot } from "lucide-react";
import { hasHardwareWebGPU, scheduleBackgroundTask } from "@/lib/devicePerf";
import {
  createRoamingRenderer,
  ROAMING_BOTS,
  type BotScreenTelemetry,
  type BotTrickKind,
  type BotTrickTrigger,
} from "@/vgpu-demos/mechanical-garden/roaming";

const STORAGE_KEY = "goddev-roaming-bots";

interface ActivePing {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly trick: BotTrickKind;
}

/**
 * Full-viewport transparent WebGPU overlay with 2 document-anchored free-roaming quadruped FABRIK IK companions.
 * Hovering a bot reveals its live architectural callsign badge; clicking a bot triggers physical FABRIK IK tricks
 * (salute bow, happy wiggle, spring hop, LiDAR scan + zoomie) with a Cobalt kinetic ping ring.
 * Auto-skips on touch-only mobile screens, reduced-motion, or non-WebGPU browsers for zero overhead.
 */
export function RoamingBotsOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const badgeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const statusRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const pingIdRef = useRef(0);

  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [booted, setBooted] = useState(false);
  const [ready, setReady] = useState(false);
  const [pings, setPings] = useState<ActivePing[]>([]);

  // Detect genuine hardware WebGPU + desktop/tablet capability & persisted preference, deferred behind LCP
  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrowTouch =
      window.matchMedia("(hover: none) and (pointer: coarse)").matches &&
      window.innerWidth < 768;

    if (reduced || narrowTouch) {
      setSupported(false);
      return;
    }

    let cancelled = false;
    let cancelBoot: (() => void) | undefined;
    let timer = 0;

    hasHardwareWebGPU()
      .then((hasHwGpu) => {
        if (cancelled) return;
        if (!hasHwGpu) {
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
        timer = window.setTimeout(() => {
          cancelBoot = scheduleBackgroundTask(() => {
            if (!cancelled) setBooted(true);
          }, 300);
        }, 1250);
      })
      .catch(() => {
        if (!cancelled) setSupported(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cancelBoot?.();
    };
  }, []);

  useEffect(() => {
    if (!supported || !booted || !enabled) {
      setReady(false);
      setPings([]);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const prevVisible = [false, false];
    const prevStatus = ["", ""];
    const pingTimeouts = new Set<number>();

    const onTelemetry = (bots: readonly BotScreenTelemetry[]) => {
      for (let i = 0; i < bots.length; i++) {
        const bot = bots[i]!;
        const el = badgeRefs.current[i];
        const statusEl = statusRefs.current[i];
        if (!el) continue;

        if (bot.visible) {
          el.style.transform = `translate3d(${bot.labelX.toFixed(1)}px, ${bot.labelY.toFixed(1)}px, 0) translate(-50%, -100%)`;
          if (!prevVisible[i]) {
            prevVisible[i] = true;
            el.dataset.visible = "true";
          }
          const nextStatus = bot.trickLabel ?? "CLICK · DRAG";
          if (statusEl && prevStatus[i] !== nextStatus) {
            prevStatus[i] = nextStatus;
            statusEl.textContent = nextStatus;
            statusEl.dataset.active = bot.trickLabel ? "true" : "false";
          }
        } else if (prevVisible[i]) {
          prevVisible[i] = false;
          el.dataset.visible = "false";
        }
      }
    };

    const onTrick = (event: BotTrickTrigger) => {
      if (cancelled) return;
      const id = ++pingIdRef.current;
      setPings((prev) => [
        ...prev.slice(-3),
        { id, x: event.x, y: event.y, trick: event.trick },
      ]);
      const timer = window.setTimeout(() => {
        pingTimeouts.delete(timer);
        setPings((prev) => prev.filter((item) => item.id !== id));
      }, 920);
      pingTimeouts.add(timer);
    };

    const renderer = createRoamingRenderer({
      canvas,
      count: ROAMING_BOTS.length,
      onTelemetry,
      onTrick,
    });

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
      for (const timer of pingTimeouts) {
        window.clearTimeout(timer);
      }
      pingTimeouts.clear();
      for (let i = 0; i < badgeRefs.current.length; i++) {
        const el = badgeRefs.current[i];
        if (el) el.dataset.visible = "false";
      }
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
          className="pointer-events-none fixed top-0 left-0 z-30 h-[100lvh] w-full overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            className={`block h-full w-full transition-opacity duration-700 ${
              ready ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Kinetic Cobalt Sonar Ping Rings emitted when clicking a robot */}
          {pings.map((ping) => (
            <div
              key={ping.id}
              style={{
                transform: `translate3d(${ping.x.toFixed(1)}px, ${ping.y.toFixed(1)}px, 0) translate(-50%, -50%)`,
              }}
              className="pointer-events-none fixed top-0 left-0"
            >
              <span
                className={`block rounded-full border ${
                  ping.trick === "scan"
                    ? "bot-ping-ring-lg border-dashed border-[#0038FF]"
                    : ping.trick === "land"
                      ? "bot-ping-ring-impact border-2 border-[#0038FF]"
                      : "bot-ping-ring border-[#0038FF]"
                }`}
              />
              <span className="bot-ping-ring-delayed absolute top-1/2 left-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#6DA4FF]/80" />
            </div>
          ))}

          {/* Direct-DOM-positioned Floating Callsign & Trick HUD Badges (zero React rerenders per frame) */}
          {ROAMING_BOTS.map((bot, idx) => (
            <div
              key={bot.id}
              ref={(node) => {
                badgeRefs.current[idx] = node;
              }}
              data-bot-badge={bot.name}
              data-visible="false"
              style={{ transform: "translate3d(-240px, -240px, 0)" }}
              className="bot-hud-badge pointer-events-none fixed top-0 left-0 will-change-transform"
            >
              <div className="relative flex flex-col items-center">
                <div className="flex items-center gap-2 rounded-full border border-[#0038FF]/60 bg-[#0D0E12]/90 px-2.5 py-1 text-white shadow-[0_8px_24px_rgba(0,56,255,0.24)] backdrop-blur-md">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B7BFF] shadow-[0_0_8px_#0038FF]" />
                  <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-white uppercase">
                    {bot.name}
                  </span>
                  <span className="h-2.5 w-px bg-white/15" />
                  <span
                    ref={(node) => {
                      statusRefs.current[idx] = node;
                    }}
                    data-active="false"
                    className="bot-hud-status font-mono text-[8.5px] font-semibold tracking-[0.14em] uppercase"
                  >
                    CLICK · DRAG
                  </span>
                </div>
                <span className="mt-0.5 rounded bg-[#0D0E12]/72 px-1.5 py-[1px] font-mono text-[7.5px] tracking-[0.18em] text-white/75 uppercase backdrop-blur-sm">
                  {bot.role}
                </span>
                <span className="mt-0.5 h-1.5 w-1.5 rotate-45 border-r border-b border-[#0038FF]/70 bg-[#0D0E12]/90" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subtle corner toggle pill so visitors can pause/hide roaming bots anytime */}
      <button
        type="button"
        onClick={toggleBots}
        aria-pressed={enabled}
        title={
          enabled
            ? "Hide roaming quadruped bots (hover to see name, click a bot to interact)"
            : "Enable roaming quadruped bots"
        }
        className={`fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[9px] font-semibold tracking-[0.16em] uppercase shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all sm:bottom-5 ${
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
