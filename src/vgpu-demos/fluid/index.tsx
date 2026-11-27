"use client";

import { useEffect, useRef, useState } from "react";
import { LazyVgpuCanvas } from "@/components/LazyVgpuCanvas";
import { createRenderer } from "./renderer";

export interface InteractiveFluidShowcaseProps {
  className?: string;
}

/** Official vgpu Navier-Stokes pressure-projected Interactive Fluid with automatic WebGL2 fallback. */
export function InteractiveFluidShowcase({
  className = "",
}: InteractiveFluidShowcaseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "webgpu" | "fallback">(
    "loading"
  );

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
    if (!canvas) return;

    const renderer = createRenderer({ canvas });
    renderer.ready
      .then(() => {
        if (!cancelled) setStatus("webgpu");
      })
      .catch(() => {
        if (!cancelled) setStatus("fallback");
      });

    return () => {
      cancelled = true;
      renderer.dispose();
    };
  }, []);

  if (status === "fallback") {
    return (
      <LazyVgpuCanvas
        shaderId="fluid"
        forceWebgl
        maxDpr={1.4}
        className={className}
        ariaLabel="Interactive Navier-Stokes fluid simulation (WebGL2 compatibility mode)"
      />
    );
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[#06080F] ${className}`}
    >
      <canvas
        ref={canvasRef}
        aria-label="Interactive Navier-Stokes fluid solver. Move or drag pointer to stir."
        className={`block h-full w-full cursor-crosshair touch-none transition-opacity duration-500 ${
          status === "webgpu" ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

export default InteractiveFluidShowcase;
