"use client";

import { useEffect, useRef, useState } from "react";
import { LazyVgpuCanvas } from "@/components/LazyVgpuCanvas";
import { createRenderer } from "./renderer";

export interface BlackHoleShowcaseProps {
  ambient?: boolean;
  className?: string;
}

/** Multi-pass G-buffer baked Optimized Black Hole with automatic WebGL2 fallback for mobile/tablet. */
export function OptimizedBlackHoleShowcase({
  ambient = false,
  className = "",
}: BlackHoleShowcaseProps) {
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
        shaderId="black-hole"
        ambient={ambient}
        forceWebgl
        maxDpr={1.5}
        className={className}
        ariaLabel="Relativistic black hole gravitational lensing background"
      />
    );
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[#06070B] ${className}`}
      aria-hidden={ambient ? "true" : undefined}
    >
      <canvas
        ref={canvasRef}
        className={`block h-full w-full transition-opacity duration-700 ${
          ambient ? "pointer-events-none" : "touch-none"
        } ${status === "webgpu" ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

export default OptimizedBlackHoleShowcase;
