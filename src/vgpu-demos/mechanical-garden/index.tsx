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
        className={`relative h-full w-full overflow-hidden bg-[#0A0C12] ${className}`}
      >
        <LazyVgpuCanvas
          shaderId="particles-ocean"
          forceWebgl
          maxDpr={1.4}
          ariaLabel="Interactive wave surface field (WebGL2 mobile compatibility mode)"
        />
        <div className="pointer-events-none absolute top-3 left-3 z-10 rounded-full border border-white/15 bg-black/55 px-3 py-1 font-mono text-[9px] tracking-[0.16em] text-emerald-200 uppercase backdrop-blur-md">
          WEBGL2 COMPAT · DRAG TO ORBIT
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`relative h-full w-full overflow-hidden bg-[#8D9096] ${className}`}
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
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[9px] font-semibold tracking-[0.14em] uppercase backdrop-blur-md transition-colors ${
              ikDebug
                ? "border-[#5B86FF] bg-[#0038FF] text-white"
                : "border-white/15 bg-[#0D0E12]/80 text-white/85 hover:border-[#0038FF]"
            }`}
          >
            <Cpu className="h-3 w-3" />
            <span>IK VECTORS</span>
          </button>

          <button
            type="button"
            onClick={() => rendererRef.current?.resetTerrain()}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#0D0E12]/80 px-2.5 py-1.5 font-mono text-[9px] font-semibold tracking-[0.14em] text-white/85 uppercase backdrop-blur-md transition-colors hover:border-[#0038FF] hover:bg-[#0038FF] hover:text-white"
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
