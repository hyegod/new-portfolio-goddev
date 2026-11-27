"use client";

import { useEffect, useRef, useState } from "react";
import { Cpu, RotateCcw } from "lucide-react";
import { LazyVgpuCanvas } from "@/components/LazyVgpuCanvas";
import { createRenderer } from "./renderer";

export interface MechanicalGardenShowcaseProps {
  className?: string;
}

/** Quadruped FABRIK inverse kinematics on exposed-concrete terrain (vgpu/scene) with WebGL2 mobile fallback. */
export function MechanicalGardenShowcase({
  className = "",
}: MechanicalGardenShowcaseProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ReturnType<typeof createRenderer> | null>(null);
  const [status, setStatus] = useState<"loading" | "webgpu" | "fallback">(
    "loading"
  );
  const [ikDebug, setIkDebug] = useState(false);

  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !("gpu" in navigator) ||
      !navigator.gpu
    ) {
      setStatus("fallback");
      return;
    }

    let cancelled = false;
    const canvas = canvasRef.current;
    const container = rootRef.current;
    if (!canvas || !container) return;

    const renderer = createRenderer({ canvas, container });
    rendererRef.current = renderer;

    renderer.ready
      .then(() => {
        if (!cancelled) setStatus("webgpu");
      })
      .catch(() => {
        if (!cancelled) setStatus("fallback");
      });

    return () => {
      cancelled = true;
      rendererRef.current = null;
      renderer.dispose();
    };
  }, []);

  if (status === "fallback") {
    return (
      <div
        className={`relative h-full w-full overflow-hidden bg-[#ECEEF0] ${className}`}
      >
        <LazyVgpuCanvas
          shaderId="particles-ocean"
          forceWebgl
          paperLight
          maxDpr={1.4}
          ariaLabel="Interactive concrete wave terrain field (WebGL2 mobile compatibility mode)"
        />
        <div className="glass-pill-light pointer-events-none absolute top-3 left-3 z-10 rounded-full px-3 py-1 font-mono text-[9px] font-semibold tracking-[0.16em] text-[#0D0E12] uppercase">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#0038FF] align-middle" />
          WEBGL2 COMPAT · DRAG TO ORBIT
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`relative h-full w-full overflow-hidden bg-[#ECEEF0] ${className}`}
    >
      <canvas
        ref={canvasRef}
        role="application"
        tabIndex={0}
        aria-label="Quadruped robots walking across a sculptable concrete training slab solved with FABRIK inverse kinematics. Switch tools to Orbit, Elevate, Lower, or set Destination."
        className={`block h-full w-full touch-none outline-none transition-opacity duration-500 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0038FF] ${
          status === "webgpu" ? "opacity-100" : "opacity-0"
        }`}
      />

      {status === "webgpu" && (
        <div className="pointer-events-auto absolute top-3 right-3 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const next = rendererRef.current?.toggleDebug() ?? false;
              setIkDebug(next);
            }}
            aria-pressed={ikDebug}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-[9.5px] font-semibold tracking-[0.14em] uppercase transition-colors ${
              ikDebug
                ? "border border-[#0038FF] bg-[#0038FF] text-white shadow-[0_6px_16px_-4px_rgba(0,56,255,0.45)]"
                : "glass-pill-light text-[#0D0E12] hover:border-[#0038FF] hover:text-[#0038FF]"
            }`}
          >
            <Cpu className="h-3 w-3" />
            <span>IK VECTORS</span>
          </button>

          <button
            type="button"
            onClick={() => rendererRef.current?.resetTerrain()}
            className="glass-pill-light inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-mono text-[9.5px] font-semibold tracking-[0.14em] text-[#0D0E12] uppercase transition-colors hover:border-[#0038FF] hover:bg-[#0038FF] hover:text-white"
          >
            <RotateCcw className="h-3 w-3" />
            <span>RESET</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default MechanicalGardenShowcase;
