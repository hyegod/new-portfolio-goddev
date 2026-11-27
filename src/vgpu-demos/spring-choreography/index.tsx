"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { LazyVgpuCanvas } from "@/components/LazyVgpuCanvas";
import { SHAPES } from "./choreography";
import { createRenderer } from "./renderer";

export interface SpringChoreographyShowcaseProps {
  showControls?: boolean;
  className?: string;
}

/** 500K GPU particle spring choreography morphing between shapes with WebGL2 mobile fallback. */
export function SpringChoreographyShowcase({
  showControls = true,
  className = "",
}: SpringChoreographyShowcaseProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ReturnType<typeof createRenderer> | null>(null);
  const [status, setStatus] = useState<"loading" | "webgpu" | "fallback">(
    "loading"
  );
  const [activeShape, setActiveShape] = useState<number>(0);

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

    const renderer = createRenderer({
      canvas,
      container,
      onShapeChange: (idx) => {
        if (!cancelled) setActiveShape(idx);
      },
    });
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
      <LazyVgpuCanvas
        shaderId="fluid"
        forceWebgl
        maxDpr={1.4}
        className={className}
        ariaLabel="Interactive fluid particle field behind slogan"
      />
    );
  }

  return (
    <div
      ref={rootRef}
      className={`relative h-full w-full overflow-hidden bg-[#06070C] ${className}`}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="GPU particle swarm morphing on real Motion springs between wave, ring, and infinite torus knot. Move pointer to part particles or click for a spring burst."
        className={`block h-full w-full touch-none transition-opacity duration-700 ${
          status === "webgpu" ? "opacity-100" : "opacity-0"
        }`}
      />

      {showControls && status === "webgpu" && (
        <div className="pointer-events-auto absolute right-3 bottom-3 z-20 flex flex-wrap items-center justify-end gap-1.5 sm:right-6 sm:bottom-5">
          {SHAPES.map((shape, idx) => {
            const active = activeShape === idx;
            return (
              <button
                key={shape.id}
                type="button"
                onClick={() => {
                  setActiveShape(idx);
                  rendererRef.current?.jumpTo(idx);
                }}
                aria-pressed={active}
                className={`rounded-xl px-3 py-1.5 font-mono text-[9.5px] font-semibold tracking-[0.14em] uppercase transition-colors ${
                  active
                    ? "border border-[#5B86FF] bg-[#0038FF] text-white shadow-[0_6px_16px_-4px_rgba(0,56,255,0.5)]"
                    : "glass-pill-dark text-white/75 hover:border-[#5B86FF] hover:text-white"
                }`}
              >
                {shape.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => rendererRef.current?.burst()}
            className="glass-pill-dark inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-mono text-[9.5px] font-semibold tracking-[0.14em] text-[#8AB4FF] uppercase transition-colors hover:border-[#0038FF] hover:bg-[#0038FF] hover:text-white"
          >
            <Sparkles className="h-3 w-3" />
            <span>BURST</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default SpringChoreographyShowcase;
