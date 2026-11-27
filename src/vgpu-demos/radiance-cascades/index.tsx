"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { LazyVgpuCanvas } from "@/components/LazyVgpuCanvas";
import { createRenderer, type RadianceView } from "./renderer";

const VIEW_MODES: { value: RadianceView; label: string }[] = [
  { value: "final", label: "FINAL GI" },
  { value: "emitters", label: "EMITTERS" },
  { value: "sdf", label: "SDF FIELD" },
];

export interface RadianceCascadesShowcaseProps {
  className?: string;
}

/** Interactive 2D Global Illumination (Jump-Flood SDF + 6 Radiance Cascades) with WebGL2 mobile fallback. */
export function RadianceCascadesShowcase({
  className = "",
}: RadianceCascadesShowcaseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ReturnType<typeof createRenderer> | null>(null);
  const [status, setStatus] = useState<"loading" | "webgpu" | "fallback">(
    "loading"
  );
  const [view, setView] = useState<RadianceView>("final");

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
      <div className={`relative h-full w-full overflow-hidden bg-[#06090F] ${className}`}>
        <LazyVgpuCanvas
          shaderId="radiance-cascades"
          forceWebgl
          maxDpr={1.4}
          ariaLabel="Interactive 2D global illumination architectural light study"
        />
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/15 bg-black/55 px-3 py-1 font-mono text-[9px] tracking-[0.18em] text-white/80 uppercase backdrop-blur-md">
          MOVE POINTER · 2D GLOBAL ILLUMINATION (WEBGL2 COMPAT)
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[#081912] ${className}`}
    >
      <canvas
        ref={canvasRef}
        aria-label="Interactive Radiance Cascades 2D global illumination canvas. Drag or swipe to draw bouncing light."
        className={`block h-full w-full cursor-crosshair touch-none transition-opacity duration-500 ${
          status === "webgpu" ? "opacity-100" : "opacity-0"
        }`}
      />

      {status === "webgpu" && (
        <>
          {/* Minimal GODDEV Top-Right Controls */}
          <div className="pointer-events-auto absolute top-3 right-3 z-20 flex flex-wrap items-center justify-end gap-1.5 sm:top-4 sm:right-4">
            <div className="inline-flex items-center gap-0.5 rounded-lg border border-white/15 bg-black/60 p-0.5 backdrop-blur-md">
              {VIEW_MODES.map((m) => {
                const active = view === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => {
                      setView(m.value);
                      rendererRef.current?.setView(m.value);
                    }}
                    aria-pressed={active}
                    className={`rounded-md px-2 py-1 font-mono text-[9px] font-semibold tracking-[0.12em] uppercase transition-colors ${
                      active
                        ? "bg-[#0038FF] text-white"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => rendererRef.current?.clear()}
              className="inline-flex items-center gap-1 rounded-lg border border-white/18 bg-black/60 px-2.5 py-1.5 font-mono text-[9px] font-semibold tracking-[0.14em] text-white/85 uppercase backdrop-blur-md transition-colors hover:border-[#0038FF] hover:bg-[#0038FF] hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
              <span>CLEAR</span>
            </button>
          </div>

          <div className="pointer-events-none absolute bottom-3.5 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/15 bg-black/50 px-3.5 py-1 font-mono text-[9.5px] font-semibold tracking-[0.2em] text-white/85 uppercase backdrop-blur-md">
            DRAW LIGHT ON GRID
          </div>
        </>
      )}
    </div>
  );
}

export default RadianceCascadesShowcase;
