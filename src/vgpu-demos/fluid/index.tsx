"use client";

import { useEffect, useRef, useState } from "react";
import { LazyVgpuCanvas } from "@/components/LazyVgpuCanvas";
import { hasHardwareWebGPU } from "@/lib/devicePerf";
import { createRenderer } from "./renderer";

export interface InteractiveFluidShowcaseProps {
  ambient?: boolean;
  className?: string;
}

/** Official vgpu Navier-Stokes pressure-projected Interactive Fluid with automatic WebGL2 fallback. */
export function InteractiveFluidShowcase({
  ambient = false,
  className = "",
}: InteractiveFluidShowcaseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "webgpu" | "fallback">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;
    let renderer: ReturnType<typeof createRenderer> | undefined;

    hasHardwareWebGPU()
      .then((supported) => {
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!supported || !canvas) {
          setStatus("fallback");
          return;
        }
        renderer = createRenderer({ canvas, ambient });
        return renderer.ready
          .then(() => {
            if (!cancelled) setStatus("webgpu");
          })
          .catch(() => {
            if (!cancelled) setStatus("fallback");
          });
      })
      .catch(() => {
        if (!cancelled) setStatus("fallback");
      });

    return () => {
      cancelled = true;
      renderer?.dispose();
    };
  }, [ambient]);

  if (status === "fallback") {
    return (
      <LazyVgpuCanvas
        shaderId="fluid"
        ambient={ambient}
        forceWebgl
        paperLight
        maxDpr={ambient ? 0.85 : 1.15}
        className={className}
        ariaLabel="Interactive Navier-Stokes concrete and cobalt fluid simulation (WebGL2 compatibility mode)"
      />
    );
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[#ECEEF0] ${className}`}
      aria-hidden={ambient ? "true" : undefined}
    >
      <canvas
        ref={canvasRef}
        aria-label={
          ambient
            ? undefined
            : "Interactive Navier-Stokes fluid solver. Move or drag pointer to stir."
        }
        className={`block h-full w-full transition-opacity duration-500 ${
          ambient
            ? "pointer-events-none"
            : "cursor-crosshair touch-none"
        } ${status === "webgpu" ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

export default InteractiveFluidShowcase;
