"use client";

import { useEffect, useRef, useState } from "react";
import { hasHardwareWebGPU } from "@/lib/devicePerf";
import {
  clock,
  effect,
  frameLoop,
  init,
  pingPong,
  sampler,
  surface,
  texture,
  type Gpu,
} from "vgpu";
import blackHoleShader from "@/shaders/vgpu/black-hole.wgsl";
import cobaltFlareShader from "@/shaders/vgpu/cobalt-flare.wgsl";
import fluidDisplayShader from "@/shaders/vgpu/fluid-display.wgsl";
import fluidSimShader from "@/shaders/vgpu/fluid-sim.wgsl";
import particlesOceanShader from "@/shaders/vgpu/particles-ocean.wgsl";
import radianceCascadesShader from "@/shaders/vgpu/radiance-cascades.wgsl";
import videoTextureShader from "@/shaders/vgpu/video-texture.wgsl";

export type VgpuShaderId =
  | "cobalt-flare"
  | "fluid"
  | "radiance-cascades"
  | "particles-ocean"
  | "black-hole"
  | "video-texture";

export type VgpuStatus = "loading" | "webgpu" | "webgl" | "unsupported";

export interface VgpuCanvasProps {
  shaderId: VgpuShaderId;
  ambient?: boolean;
  /** Scroll-safe touch lock (prevents touch drag from hijacking page scroll until user unlocks). */
  touchLocked?: boolean;
  paused?: boolean;
  maxDpr?: number;
  forceWebgl?: boolean;
  paperLight?: boolean;
  videoElement?: HTMLVideoElement | null;
  onStatusChange?: (status: VgpuStatus) => void;
  className?: string;
  ariaLabel?: string;
}

function drawProceduralVideoFeed(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number
) {
  // Deep obsidian blueprint monitor
  ctx.fillStyle = "#080B12";
  ctx.fillRect(0, 0, w, h);

  // Drafting grid
  ctx.strokeStyle = "rgba(91, 134, 255, 0.14)";
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Animated electric cobalt structural wave + bass spectrum
  ctx.strokeStyle = "#0038FF";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 6) {
    const nx = x / w;
    const y =
      h * 0.56 +
      Math.sin(nx * 10 + t * 2.6) * 28 +
      Math.cos(nx * 22 - t * 3.8) * 12;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Secondary luminous harmonic wave
  ctx.strokeStyle = "#6DA4FF";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 6) {
    const nx = x / w;
    const y =
      h * 0.56 +
      Math.cos(nx * 8 - t * 2.1) * 22 +
      Math.sin(nx * 18 + t * 3.2) * 9;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Vertical scanning beam
  const scanX = ((t * 95) % (w + 60)) - 30;
  const grad = ctx.createLinearGradient(scanX - 28, 0, scanX + 28, 0);
  grad.addColorStop(0, "rgba(0, 56, 255, 0)");
  grad.addColorStop(0.5, "rgba(91, 134, 255, 0.28)");
  grad.addColorStop(1, "rgba(0, 56, 255, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(scanX - 28, 0, 56, h);

  // Crisp architectural HUD typography
  ctx.fillStyle = "#5B86FF";
  ctx.font = "600 13px monospace";
  ctx.fillText("GODDEV // WEBGPU VIDEO STREAM", 22, 34);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 32px sans-serif";
  ctx.fillText("VGPU · TEXTURE", 22, 74);

  // Live spectrum bars at bottom
  const barCount = 24;
  for (let i = 0; i < barCount; i++) {
    const mag =
      0.22 +
      0.78 *
        Math.abs(Math.sin(t * 2.8 + i * 0.45) * Math.cos(t * 1.4 - i * 0.2));
    const bh = mag * 42;
    const bx = 22 + i * ((w - 44) / barCount);
    ctx.fillStyle = i % 4 === 0 ? "#0038FF" : "rgba(185, 205, 255, 0.72)";
    ctx.fillRect(bx, h - 22 - bh, 11, bh);
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
  ctx.font = "500 11px monospace";
  ctx.fillText(`T=${t.toFixed(2)}S · 60 FPS · COPY_EXTERNAL_IMAGE`, 22, h - 76);
}

export function VgpuCanvas({
  shaderId,
  ambient = false,
  touchLocked = false,
  paused = false,
  maxDpr = 2,
  forceWebgl = false,
  paperLight = false,
  videoElement = null,
  onStatusChange,
  className = "",
  ariaLabel = "Interactive WebGPU shader canvas powered by vgpu",
}: VgpuCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engineMode, setEngineMode] = useState<"auto" | "webgl">(
    forceWebgl ? "webgl" : "auto"
  );
  const [status, setStatus] = useState<VgpuStatus>("loading");

  useEffect(() => {
    setEngineMode(forceWebgl ? "webgl" : "auto");
  }, [forceWebgl, shaderId]);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const touchLockedRef = useRef(touchLocked);
  touchLockedRef.current = touchLocked;

  const videoRef = useRef<HTMLVideoElement | null>(videoElement);
  videoRef.current = videoElement;

  const onStatusRef = useRef(onStatusChange);
  onStatusRef.current = onStatusChange;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const notify = (next: VgpuStatus) => {
      setStatus(next);
      onStatusRef.current?.(next);
    };

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let cancelled = false;
    let gpu: Gpu | null = null;
    let webglHandle: { dispose: () => void } | null = null;
    let isVisible = true;
    let cvSkipped = false;
    let canvasTouchedByWebgpu = false;

    // Interactive pointer & orbit state stored in closure (zero React rerenders)
    const ptr = {
      x: 0,
      y: 0,
      uvX: 0.5,
      uvY: 0.5,
      prevUvX: 0.5,
      prevUvY: 0.5,
      vx: 0,
      vy: 0,
      orbitX: 0,
      orbitY: 0,
      targetOrbitX: 0,
      targetOrbitY: 0,
      pressed: false,
      lastDragX: 0,
      lastDragY: 0,
    };

    const updatePointerFromClient = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = (clientX - rect.left) / rect.width;
      const ny = (clientY - rect.top) / rect.height;
      ptr.uvX = Math.max(0, Math.min(1, nx));
      ptr.uvY = Math.max(0, Math.min(1, ny));
      ptr.x = ptr.uvX * 2 - 1;
      ptr.y = ptr.uvY * 2 - 1;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (touchLockedRef.current && e.pointerType !== "mouse") return;
      updatePointerFromClient(e.clientX, e.clientY);
      if (ptr.pressed && !ambient) {
        const dx = e.clientX - ptr.lastDragX;
        const dy = e.clientY - ptr.lastDragY;
        ptr.lastDragX = e.clientX;
        ptr.lastDragY = e.clientY;
        ptr.targetOrbitX += dx * 0.0065;
        ptr.targetOrbitY = Math.max(
          -1.1,
          Math.min(1.1, ptr.targetOrbitY + dy * 0.0055)
        );
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (ambient) return;
      if (touchLockedRef.current && e.pointerType !== "mouse") return;
      ptr.pressed = true;
      ptr.lastDragX = e.clientX;
      ptr.lastDragY = e.clientY;
      updatePointerFromClient(e.clientX, e.clientY);
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if capture not supported
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      ptr.pressed = false;
      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
    };

    const onAmbientWindowMove = (e: PointerEvent) => {
      if (!isVisible) return;
      const rect = container.getBoundingClientRect();
      if (
        e.clientY >= rect.top - 120 &&
        e.clientY <= rect.bottom + 120 &&
        rect.width > 0 &&
        rect.height > 0
      ) {
        updatePointerFromClient(e.clientX, e.clientY);
      }
    };

    if (ambient) {
      window.addEventListener("pointermove", onAmbientWindowMove, { passive: true });
    } else {
      canvas.addEventListener("pointermove", onPointerMove, { passive: true });
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
    }

    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries.some((entry) => entry.isIntersecting);
      },
      { rootMargin: "160px" }
    );
    io.observe(container);

    const onCvChange = (event: Event) => {
      cvSkipped = Boolean((event as Event & { skipped?: boolean }).skipped);
    };
    const cvTarget =
      container.closest(
        ".deferred-lab, .deferred-section, .deferred-slogan, .deferred-works, .deferred-gallery, .deferred-footer"
      ) ?? container;
    cvTarget.addEventListener("contentvisibilityautostatechange", onCvChange);

    const isActiveVisible = () => isVisible && !cvSkipped;

    const launchWebglFallback = async () => {
      try {
        const { startWebglShaderFallback } = await import(
          "@/lib/vgpuWebglFallback"
        );
        if (cancelled) return;
        const handle = startWebglShaderFallback({
          canvas,
          shaderId,
          ambient,
          paperLight,
          maxDpr,
          reducedMotion,
          ptr,
          isVisible: isActiveVisible,
          isPaused: () => pausedRef.current,
          getVideoElement: () => videoRef.current,
          drawProceduralFeed: drawProceduralVideoFeed,
        });
        if (cancelled) {
          handle?.dispose();
          return;
        }
        if (handle) {
          webglHandle = handle;
          notify("webgl");
        } else {
          notify("unsupported");
        }
      } catch {
        if (!cancelled) notify("unsupported");
      }
    };

    const hasWebgpuApi =
      engineMode === "auto" &&
      typeof navigator !== "undefined" &&
      "gpu" in navigator &&
      Boolean(navigator.gpu);

    const startGpuOrFallback = async () => {
      if (!hasWebgpuApi) {
        notify("loading");
        await launchWebglFallback();
        return;
      }
      const hwGpu = await hasHardwareWebGPU();
      if (cancelled) return;
      if (!hwGpu) {
        notify("loading");
        await launchWebglFallback();
        return;
      }
      await bootWebgpuEngine();
    };

    const bootWebgpuEngine = async () => {
      // Offscreen procedural video feed canvas for "video-texture" mode
      const videoW = 512;
      const videoH = 320;
      let feedCanvas: HTMLCanvasElement | null = null;
      let feedCtx: CanvasRenderingContext2D | null = null;

      if (shaderId === "video-texture") {
        feedCanvas = document.createElement("canvas");
        feedCanvas.width = videoW;
        feedCanvas.height = videoH;
        feedCtx = feedCanvas.getContext("2d");
      }

      (async () => {
        try {
          notify("loading");
          let instance: Gpu;
          try {
            instance = await init({
              powerPreference: "high-performance",
              label: `goddev-vgpu-${shaderId}`,
            });
          } catch {
            // Retry with default adapter preference for mobile/tablet GPUs
            instance = await init({
              label: `goddev-vgpu-${shaderId}`,
            });
          }

          if (cancelled) {
            instance.dispose();
            return;
          }
          gpu = instance;

          canvasTouchedByWebgpu = true;
          const canvasSurface = surface(instance, canvas, {
            dpr: [1, Math.max(1, maxDpr)],
          });
          const gpuClock = clock(instance);

          // Compile the active shader pipeline(s)
          if (shaderId === "fluid") {
            const pp = pingPong(instance, 512, 512, { format: "rgba16float" });
            const lin = sampler(instance, {
              magFilter: "linear",
              minFilter: "linear",
              addressModeU: "clamp-to-edge",
              addressModeV: "clamp-to-edge",
            });

            const simEffect = effect(instance, fluidSimShader, {
              label: "fluid-sim",
              set: {
                u: {
                  timeRes: [0, 512, 512, 0.016],
                  pointer: [0.5, 0.5, 0, 0],
                  control: [0, 1, 0.985, 0],
                },
                prevTex: pp.read,
                linearSampler: lin,
              },
            });

            const dispEffect = effect(instance, fluidDisplayShader, {
              label: "fluid-display",
              set: {
                u: {
                  timeRes: [
                    0,
                    canvasSurface.size[0],
                    canvasSurface.size[1],
                    canvasSurface.size[0] / Math.max(1, canvasSurface.size[1]),
                  ],
                },
                fluidTex: pp.read,
                linearSampler: lin,
              },
            });

            let simTime = 0;
            frameLoop(
              instance,
              (f) => {
                if (!isActiveVisible() || document.hidden || pausedRef.current) return;
                const dt = reducedMotion
                  ? 0.004
                  : Math.min(0.033, Math.max(0.004, gpuClock.deltaTime || 0.016));
                simTime += dt;

                const dvx = ptr.uvX - ptr.prevUvX;
                const dvy = ptr.uvY - ptr.prevUvY;
                ptr.prevUvX = ptr.uvX;
                ptr.prevUvY = ptr.uvY;
                ptr.vx = ptr.vx * 0.72 + dvx * 0.28;
                ptr.vy = ptr.vy * 0.72 + dvy * 0.28;

                simEffect.set({
                  u: {
                    timeRes: [simTime, 512, 512, dt],
                    pointer: [ptr.uvX, ptr.uvY, ptr.vx, ptr.vy],
                    control: [ptr.pressed ? 1 : 0, 1, 0.985, 0],
                  },
                  prevTex: pp.read,
                });
                f.pass(pp.write, simEffect);
                pp.swap();

                const [w, h] = canvasSurface.size;
                dispEffect.set({
                  u: { timeRes: [simTime, w, h, w / Math.max(1, h)] },
                  fluidTex: pp.read,
                });
                f.pass(canvasSurface, dispEffect);
              },
              { fps: 60 }
            );
          } else if (shaderId === "video-texture") {
            const videoTex = texture(instance, {
              kind: "2d",
              size: [videoW, videoH],
              format: "rgba8unorm",
              usage: ["texture_binding", "copy_dst", "render_attachment"],
              label: "live-video-texture",
            });
            const lin = sampler(instance, {
              magFilter: "linear",
              minFilter: "linear",
              addressModeU: "clamp-to-edge",
              addressModeV: "clamp-to-edge",
            });

            if (feedCtx && feedCanvas) {
              drawProceduralVideoFeed(feedCtx, videoW, videoH, 0);
              instance.gpu.queue.copyExternalImageToTexture(
                { source: feedCanvas },
                { texture: videoTex.gpu },
                [videoW, videoH]
              );
            }

            const vidEffect = effect(instance, videoTextureShader, {
              label: "video-texture-slab",
              set: {
                u: {
                  timeRes: [
                    0,
                    canvasSurface.size[0],
                    canvasSurface.size[1],
                    canvasSurface.size[0] / Math.max(1, canvasSurface.size[1]),
                  ],
                  pointer: [0, 0, 0, 0],
                  control: [1, 0, 0, 0],
                },
                videoTex,
                videoSampler: lin,
              },
            });

            let elapsed = 0;
            frameLoop(
              instance,
              (f) => {
                if (!isActiveVisible() || document.hidden || pausedRef.current) return;
                const dt = reducedMotion
                  ? 0.004
                  : Math.min(0.033, gpuClock.deltaTime || 0.016);
                elapsed += dt;

                ptr.orbitX += (ptr.targetOrbitX - ptr.orbitX) * 0.1;
                ptr.orbitY += (ptr.targetOrbitY - ptr.orbitY) * 0.1;

                const activeVid = videoRef.current;
                if (activeVid && activeVid.readyState >= 2) {
                  try {
                    if (feedCtx && feedCanvas) {
                      feedCtx.drawImage(activeVid, 0, 0, videoW, videoH);
                      instance.gpu.queue.copyExternalImageToTexture(
                        { source: feedCanvas },
                        { texture: videoTex.gpu },
                        [videoW, videoH]
                      );
                    }
                  } catch {
                    // Ignore transient decode frame error
                  }
                } else if (feedCtx && feedCanvas) {
                  drawProceduralVideoFeed(feedCtx, videoW, videoH, elapsed);
                  instance.gpu.queue.copyExternalImageToTexture(
                    { source: feedCanvas },
                    { texture: videoTex.gpu },
                    [videoW, videoH]
                  );
                }

                const [w, h] = canvasSurface.size;
                vidEffect.set({
                  u: {
                    timeRes: [elapsed, w, h, w / Math.max(1, h)],
                    pointer: [ptr.x, ptr.y, ptr.vx, ptr.vy],
                    control: [1, ptr.orbitX, ptr.orbitY, ptr.pressed ? 1 : 0],
                  },
                });
                f.pass(canvasSurface, vidEffect);
              },
              { fps: 60 }
            );
          } else {
            // Single-pass fullscreen WGSL effects (cobalt-flare, radiance-cascades, particles-ocean, black-hole)
            const shaderSource =
              shaderId === "radiance-cascades"
                ? radianceCascadesShader
                : shaderId === "particles-ocean"
                  ? particlesOceanShader
                  : shaderId === "black-hole"
                    ? blackHoleShader
                    : cobaltFlareShader;

            const fx = effect(instance, shaderSource, {
              label: shaderId,
              set: {
                u: {
                  timeRes: [
                    0,
                    canvasSurface.size[0],
                    canvasSurface.size[1],
                    canvasSurface.size[0] / Math.max(1, canvasSurface.size[1]),
                  ],
                  pointer: [0, 0, 0, 0],
                  control: [ambient ? 1 : 0, 0, 0, 0],
                },
              },
            });

            let elapsed = 0;
            frameLoop(
              instance,
              (f) => {
                if (!isActiveVisible() || document.hidden || pausedRef.current) return;
                const dt = reducedMotion
                  ? 0.003
                  : Math.min(0.033, gpuClock.deltaTime || 0.016);
                elapsed += dt;

                ptr.orbitX += (ptr.targetOrbitX - ptr.orbitX) * 0.1;
                ptr.orbitY += (ptr.targetOrbitY - ptr.orbitY) * 0.1;

                const [w, h] = canvasSurface.size;
                fx.set({
                  u: {
                    timeRes: [elapsed, w, h, w / Math.max(1, h)],
                    pointer: [ptr.x, ptr.y, ptr.vx, ptr.vy],
                    control: [
                      ambient ? 1 : 0,
                      ptr.orbitX,
                      ptr.orbitY,
                      ptr.pressed ? 1 : 0,
                    ],
                  },
                });
                f.pass(canvasSurface, fx);
              },
              { fps: ambient ? 30 : 50 }
            );
          }

          notify("webgpu");
        } catch {
          if (cancelled) return;
          gpu?.dispose();
          gpu = null;
          if (canvasTouchedByWebgpu) {
            // Remount a fresh <canvas> before creating a WebGL context
            setEngineMode("webgl");
          } else {
            await launchWebglFallback();
          }
        }
      })();
    };

    void startGpuOrFallback();

    return () => {
      cancelled = true;
      io.disconnect();
      cvTarget.removeEventListener("contentvisibilityautostatechange", onCvChange);
      if (ambient) {
        window.removeEventListener("pointermove", onAmbientWindowMove);
      } else {
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerUp);
      }
      gpu?.dispose();
      webglHandle?.dispose();
    };
  }, [shaderId, ambient, paperLight, maxDpr, engineMode]);

  const isLive = status === "webgpu" || status === "webgl";

  if (status === "unsupported" && ambient) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${className}`}
      role={ambient ? undefined : "img"}
      aria-label={ambient ? undefined : ariaLabel}
      aria-hidden={ambient ? "true" : undefined}
    >
      <canvas
        key={engineMode}
        ref={canvasRef}
        className={`block h-full w-full transition-opacity duration-500 ${
          isLive ? "opacity-100" : "opacity-0"
        } ${
          ambient
            ? "pointer-events-none"
            : touchLocked
              ? "touch-pan-y"
              : "touch-none cursor-crosshair"
        }`}
      />

      {status === "unsupported" && !ambient && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#08090D] p-6 text-center font-mono text-xs text-white/75">
          <span className="rounded border border-[#0038FF]/50 bg-[#0038FF]/15 px-2.5 py-1 text-[10px] tracking-[0.18em] text-[#6DA4FF] uppercase">
            GPU ACCELERATION UNAVAILABLE
          </span>
          <p className="max-w-md text-[11px] leading-relaxed text-white/60">
            Neither WebGPU nor WebGL hardware acceleration is enabled in this
            browser session. Enable hardware acceleration or switch to{" "}
            <strong className="text-white">3D LIDAR · WEBGL</strong> above.
          </p>
        </div>
      )}
    </div>
  );
}
