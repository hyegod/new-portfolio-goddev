"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import {
  GALLERY_PLATES,
  GATHER_SWATCHES,
  type GalleryPlate,
  type PointPresetId,
} from "@/data/portfolio";
import { useNearViewport, usePerformanceProfile } from "@/lib/devicePerf";
import {
  generatePresetPointCloud,
  getPresetMeta,
  imageFileToPointCloud,
  type PointCloudData,
} from "@/lib/pointCloudGenerator";
import type {
  GatherDrawOptions,
  TravelMode,
  WhitePaperMode,
} from "./GatherPointCloud";
import { LazyGatherPointCloud } from "./LazyGatherPointCloud";

const BUILTIN_PRESETS: PointPresetId[] = ["bridge", "tower", "terrain", "shell"];

type PlateFilter = "ALL" | GalleryPlate["filterGroup"];

const PLATE_FILTERS: PlateFilter[] = [
  "ALL",
  "STRUCTURAL",
  "GEOSPATIAL",
  "COMPUTATIONAL",
  "SOFTWARE",
];

interface SpecimenEntry {
  id: string;
  label: string;
  thumbnail: string;
  preset?: PointPresetId;
  customCloud?: PointCloudData;
}

/**
 * Clean Architectural & Computational Engineering Vector Drawings on Crisp Light Drafting Paper
 */
function BlueprintGraphic({
  type,
  className = "",
}: {
  type: GalleryPlate["visualType"];
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 420 260"
      fill="none"
      aria-hidden="true"
      className={`h-full w-full ${className}`}
    >
      <defs>
        <pattern id={`grid-${type}`} width="24" height="24" patternUnits="userSpaceOnUse">
          <path
            d="M 24 0 L 0 0 0 24"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.09"
            strokeWidth="0.7"
          />
        </pattern>
      </defs>
      <rect width="420" height="260" fill={`url(#grid-${type})`} />

      {type === "bridge-elevation" && (
        <g>
          <line x1="20" y1="176" x2="400" y2="176" stroke="currentColor" strokeWidth="2.4" />
          <line x1="20" y1="184" x2="400" y2="184" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
          <path d="M126 232 L138 44 L150 232" stroke="#0038FF" strokeWidth="2.5" />
          <path d="M270 232 L282 44 L294 232" stroke="#0038FF" strokeWidth="2.5" />
          <line x1="130" y1="114" x2="146" y2="114" stroke="#0038FF" strokeWidth="2" />
          <line x1="274" y1="114" x2="290" y2="114" stroke="#0038FF" strokeWidth="2" />
          {[0, 1, 2, 3, 4].map((k) => (
            <g key={k} stroke="currentColor" strokeOpacity="0.75" strokeWidth="1">
              <line x1="138" y1={56 + k * 14} x2={34 + k * 20} y2="176" />
              <line x1="138" y1={56 + k * 14} x2={210 - k * 12} y2="176" />
              <line x1="282" y1={56 + k * 14} x2={210 + k * 12} y2="176" />
              <line x1="282" y1={56 + k * 14} x2={386 - k * 20} y2="176" />
            </g>
          ))}
          <line x1="20" y1="232" x2="400" y2="232" stroke="#0038FF" strokeDasharray="4 4" strokeOpacity="0.55" />
        </g>
      )}

      {type === "tower-section" && (
        <g>
          <rect x="190" y="34" width="40" height="202" stroke="#0038FF" strokeWidth="1.6" fill="#0038FF" fillOpacity="0.08" />
          <polygon points="146,236 164,34 256,34 274,236" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="210" y1="8" x2="210" y2="34" stroke="#0038FF" strokeWidth="2.2" />
          {[0, 1, 2, 3, 4].map((lv) => {
            const y0 = 34 + lv * 40;
            const y1 = y0 + 40;
            const w0 = 46 + lv * 3.5;
            const w1 = 46 + (lv + 1) * 3.5;
            return (
              <g key={lv}>
                <line x1={210 - w0} y1={y0} x2={210 + w1} y2={y1} stroke="#0038FF" strokeOpacity="0.7" strokeWidth="1.2" />
                <line x1={210 + w0} y1={y0} x2={210 - w1} y2={y1} stroke="#0038FF" strokeOpacity="0.7" strokeWidth="1.2" />
                <line x1={210 - w1} y1={y1} x2={210 + w1} y2={y1} stroke="currentColor" strokeOpacity="0.45" strokeWidth="1" />
              </g>
            );
          })}
          <path d="M88 64 L136 64 M130 59 L136 64 L130 69" stroke="#0038FF" strokeWidth="1.5" />
          <path d="M102 124 L138 124 M132 119 L138 124 L132 129" stroke="#0038FF" strokeWidth="1.3" />
          <path d="M116 184 L140 184 M134 179 L140 184 L134 189" stroke="#0038FF" strokeWidth="1.1" />
        </g>
      )}

      {type === "lidar-contour" && (
        <g>
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <ellipse
              key={r}
              cx={176 + r * 6}
              cy={132 - r * 3}
              rx={155 - r * 22}
              ry={92 - r * 13}
              stroke={r % 2 === 0 ? "#0038FF" : "currentColor"}
              strokeOpacity={0.3 + r * 0.11}
              strokeWidth={r === 4 ? "2" : "1.2"}
              transform={`rotate(${-14 + r * 3} 210 130)`}
            />
          ))}
          {[0, 1, 2].map((r) => (
            <circle
              key={`p-${r}`}
              cx="308"
              cy="92"
              r={54 - r * 16}
              stroke="#0038FF"
              strokeOpacity={0.45 + r * 0.2}
              strokeWidth="1.2"
              strokeDasharray={r === 1 ? "4 3" : undefined}
            />
          ))}
          <path d="M196 116 H216 M206 106 V126" stroke="currentColor" strokeWidth="1.4" />
          <path d="M298 92 H318 M308 82 V102" stroke="#0038FF" strokeWidth="1.4" />
        </g>
      )}

      {type === "shell-grid" && (
        <g>
          {Array.from({ length: 11 }).map((_, idx) => {
            const t = idx / 10;
            const x1 = 44 + t * 150;
            const y1 = 212 - t * 152;
            const x2 = 226 + t * 150;
            const y2 = 60 + t * 152;
            return (
              <path
                key={idx}
                d={`M ${x1} ${y1} Q 210 ${48 + t * 90} ${x2} ${y2}`}
                stroke={idx === 0 || idx === 10 ? "#0038FF" : "currentColor"}
                strokeOpacity={idx === 0 || idx === 10 ? 0.95 : 0.45}
                strokeWidth={idx === 0 || idx === 10 ? "2.2" : "1.1"}
              />
            );
          })}
          <path d="M44 212 Q210 136 376 212" stroke="#0038FF" strokeWidth="2.2" />
          <circle cx="44" cy="212" r="4" fill="#0038FF" />
          <circle cx="376" cy="212" r="4" fill="#0038FF" />
        </g>
      )}

      {type === "rebar-detail" && (
        <g>
          <path
            d="M158 18 V92 H34 M34 176 H158 V244 M262 244 V176 H386 M386 92 H262 V18"
            stroke="currentColor"
            strokeWidth="2.2"
          />
          <line x1="176" y1="18" x2="176" y2="244" stroke="#0038FF" strokeWidth="2.4" />
          <line x1="244" y1="18" x2="244" y2="244" stroke="#0038FF" strokeWidth="2.4" />
          <line x1="34" y1="110" x2="386" y2="110" stroke="#0038FF" strokeWidth="2.4" />
          <line x1="34" y1="158" x2="386" y2="158" stroke="#0038FF" strokeWidth="2.4" />
          {[32, 50, 68, 86, 108, 126, 144, 162, 184, 202, 220].map((y) => (
            <line key={y} x1="172" y1={y} x2="248" y2={y} stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.2" />
          ))}
          {[56, 78, 100, 122, 144, 276, 298, 320, 342, 364].map((x) => (
            <line key={x} x1={x} y1="106" x2={x} y2="162" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.2" />
          ))}
        </g>
      )}

      {type === "bim-pipeline" && (
        <g fontFamily="monospace" fontSize="9">
          {[
            { x: 26, y: 98, w: 86, h: 64, label: "ETABS / REVIT", sub: "API EXTRACT" },
            { x: 164, y: 98, w: 92, h: 64, label: "PYTHON SOLVER", sub: "FASTAPI · IFC" },
            { x: 308, y: 98, w: 86, h: 64, label: "WEBGL TWIN", sub: "GLSL 60 FPS" },
          ].map((node, idx) => (
            <g key={node.label}>
              <rect
                x={node.x}
                y={node.y}
                width={node.w}
                height={node.h}
                rx="6"
                stroke={idx === 2 ? "#0038FF" : "currentColor"}
                strokeWidth={idx === 2 ? "2" : "1.4"}
                fill={idx === 2 ? "#0038FF" : "none"}
                fillOpacity={idx === 2 ? "0.1" : "0"}
              />
              <text x={node.x + 8} y={node.y + 28} fill="currentColor" fontWeight="700">
                {node.label}
              </text>
              <text x={node.x + 8} y={node.y + 46} fill="#0038FF">
                {node.sub}
              </text>
            </g>
          ))}
          <path d="M112 130 H164 M157 125 L164 130 L157 135" stroke="#0038FF" strokeWidth="1.8" />
          <path d="M256 130 H308 M301 125 L308 130 L301 135" stroke="#0038FF" strokeWidth="1.8" />
          <path d="M351 162 V204 H69 V162" stroke="currentColor" strokeOpacity="0.4" strokeDasharray="4 4" />
        </g>
      )}
    </svg>
  );
}

export function GallerySection({
  standalone = false,
  plates = GALLERY_PLATES,
}: {
  standalone?: boolean;
  plates?: GalleryPlate[];
}) {
  const plateList = plates.length > 0 ? plates : GALLERY_PLATES;
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lightboxRef = useRef<HTMLDialogElement>(null);
  const cloudCacheRef = useRef<Map<string, PointCloudData>>(new Map());

  const perf = usePerformanceProfile();
  const nearStageViewport = useNearViewport(stageRef, "650px 0px");
  const isNearStage = standalone || nearStageViewport;
  const labPoints = perf?.galleryPoints ?? 36000;

  // Lightweight specimen metadata renders rail thumbnails immediately with zero 3D CPU cost at startup
  const [specimens, setSpecimens] = useState<SpecimenEntry[]>(() =>
    BUILTIN_PRESETS.map((preset) => getPresetMeta(preset))
  );
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [activePlateFilter, setActivePlateFilter] =
    useState<PlateFilter>("ALL");
  const [paperLight, setPaperLight] = useState<boolean>(false);
  const [whiteMode, setWhiteMode] = useState<WhitePaperMode>("negative");
  const [travelMode, setTravelMode] = useState<TravelMode>("swarm");
  const [lightOn, setLightOn] = useState<boolean>(true);
  const [lightHex, setLightHex] = useState<string>(GATHER_SWATCHES[1].hex);
  const [denseTrackers, setDenseTrackers] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [activePlate, setActivePlate] = useState<GalleryPlate | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>(
    "LIDAR DEPTH MODEL · DROP SITE PHOTO OR BLUEPRINT"
  );

  const [drift, setDrift] = useState<number>(68);
  const [splash, setSplash] = useState<number>(70);
  const [gather, setGather] = useState<number>(38);
  const [depth, setDepth] = useState<number>(80);

  const [draw, setDraw] = useState<GatherDrawOptions>({
    track: true,
    links: true,
    scan: false,
    marks: true,
  });

  const activeEntry = specimens[activeIndex] ?? specimens[0];

  const visiblePlates = useMemo(() => {
    if (!standalone || activePlateFilter === "ALL") return plateList;
    return plateList.filter((p) => p.filterGroup === activePlateFilter);
  }, [standalone, activePlateFilter, plateList]);

  // Support deep-linking from /works/[slug] via /gallery?preset=bridge|tower|terrain|shell
  useEffect(() => {
    if (typeof window === "undefined") return;
    const presetParam = new URLSearchParams(window.location.search).get("preset");
    if (!presetParam) return;
    const idx = BUILTIN_PRESETS.indexOf(presetParam as PointPresetId);
    if (idx >= 0) {
      setActiveIndex(idx);
    }
  }, []);

  // Generate 3D points lazily on demand once #gallery approaches viewport, cached per preset
  const activeCloud = useMemo(() => {
    if (!isNearStage || !perf) return null;
    if (activeEntry.customCloud) return activeEntry.customCloud;
    const preset = activeEntry.preset ?? "bridge";
    const key = `${preset}-${perf.galleryPoints}`;
    const cached = cloudCacheRef.current.get(key);
    if (cached) return cached;
    const generated = generatePresetPointCloud(preset, perf.galleryPoints);
    cloudCacheRef.current.set(key, generated);
    return generated;
  }, [activeEntry, isNearStage, perf]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % specimens.length);
  }, [specimens.length]);

  const loadPresetIntoViewer = (preset: PointPresetId) => {
    const idx = BUILTIN_PRESETS.indexOf(preset);
    if (idx >= 0) {
      setActiveIndex(idx);
      lightboxRef.current?.close();
      stageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const openLightbox = (plate: GalleryPlate) => {
    setActivePlate(plate);
    requestAnimationFrame(() => {
      if (lightboxRef.current && !lightboxRef.current.open) {
        lightboxRef.current.showModal();
      }
    });
  };

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const valid = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, 4);
      if (valid.length === 0) return;

      const targetPoints = perf?.galleryPoints ?? 36000;
      setUploadStatus("SYNTHESIZING 3D LIDAR RELIEF...");
      try {
        const converted = await Promise.all(
          valid.map((file) => imageFileToPointCloud(file, targetPoints))
        );
        const newEntries: SpecimenEntry[] = converted.map((c) => ({
          id: c.id,
          label: c.label,
          thumbnail: c.thumbnail,
          customCloud: c,
        }));
        setSpecimens((prev) => {
          const merged = [...prev, ...newEntries].slice(-8);
          setActiveIndex(merged.length - 1);
          return merged;
        });
        setUploadStatus(
          `LOADED ${converted[0].label} · ${targetPoints.toLocaleString("en-US")} PTS`
        );
      } catch {
        setUploadStatus("UNABLE TO DECODE IMAGE · TRY PNG OR JPG");
      }
    },
    [perf]
  );

  const toggleFullscreen = async () => {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.().catch(() => {});
    } else {
      await document.exitFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const dialog = lightboxRef.current;
    if (!dialog) return;
    const onClose = () => {
      dialog.returnValue = "";
    };
    dialog.addEventListener("close", onClose);

    let cleanupFallback: (() => void) | undefined;
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      let pressedOutside = false;
      const onDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e) && dialog.open) dialog.close();
      };
      dialog.addEventListener("pointerdown", onDown);
      dialog.addEventListener("pointerup", onUp);
      cleanupFallback = () => {
        dialog.removeEventListener("pointerdown", onDown);
        dialog.removeEventListener("pointerup", onUp);
      };
    }

    return () => {
      dialog.removeEventListener("close", onClose);
      cleanupFallback?.();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const inGallery =
        document.fullscreenElement === stageRef.current ||
        sectionRef.current?.contains(document.activeElement);
      if (!inGallery) return;

      if (e.code === "Space") {
        e.preventDefault();
        handleNext();
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        setLightOn((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNext]);

  const toggleDraw = (key: keyof GatherDrawOptions) => {
    setDraw((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const borderSubtle = paperLight ? "border-black/15" : "border-white/15";
  const mutedText = paperLight ? "text-black/55" : "text-white/55";
  const pillActive = paperLight
    ? "border-[#0038FF] text-[#0038FF] underline underline-offset-4"
    : "border-[#ffe9c4] text-white underline underline-offset-4";

  return (
    <section
      id="gallery"
      ref={sectionRef}
      tabIndex={-1}
      className={
        standalone
          ? "relative border-b border-black/15 px-3 pt-28 pb-16 min-[380px]:px-4 sm:px-8 sm:pt-32 sm:pb-24 lg:px-12"
          : "relative border-b border-black/15 px-3 py-16 min-[380px]:px-4 sm:px-8 sm:py-20 lg:px-12 lg:py-28"
      }
      aria-labelledby="gallery-heading"
    >
      {/* Standalone Breadcrumb */}
      {standalone && (
        <div className="reveal-up mx-auto mb-8 flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="glass-pill-light group inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-[#0D0E12] uppercase transition-colors hover:border-[#0038FF] hover:text-[#0038FF]"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span className="text-trim">BACK TO HOME</span>
          </Link>

          <span className="font-mono text-[10px] tracking-[0.18em] text-[#505562] uppercase">
            {String(BUILTIN_PRESETS.length).padStart(2, "0")} 3D SPECIMENS ·{" "}
            {String(plateList.length).padStart(2, "0")} TECHNICAL SHEETS
          </span>
        </div>
      )}

      {/* Clean Bright Section Intro */}
      <div className="mx-auto mb-8 flex max-w-[1440px] flex-col justify-between gap-4 sm:mb-10 sm:gap-6 md:flex-row md:items-end">
        <div data-anim="mask-group" className="min-w-0">
          <p className="reveal-up font-mono text-[10px] tracking-[0.2em] text-[#0038FF] uppercase sm:text-[11px] sm:tracking-[0.22em]">
            {standalone
              ? "05 // COMPLETE GALLERY · 3D LIDAR STUDIO & BLUEPRINT ARCHIVE"
              : "05 // GALLERY · 3D LIDAR POINT-CLOUD & BLUEPRINT ARCHIVE"}
          </p>
          {standalone ? (
            <h1
              id="gallery-heading"
              className="mt-2 font-display text-[clamp(1.75rem,6.4vw,4.6rem)] leading-[0.95] font-extrabold tracking-tight text-[#0D0E12] uppercase"
            >
              <span className="mask-line block">
                COMPLETE <span className="text-[#0038FF]">GALLERY</span>
              </span>
            </h1>
          ) : (
            <h2
              id="gallery-heading"
              className="mt-2 font-display text-[clamp(1.45rem,6vw,3.75rem)] leading-[0.98] font-extrabold tracking-tight text-[#0D0E12] uppercase"
            >
              <span className="mask-line block">
                STRUCTURAL <span className="text-[#0038FF]">GALLERY</span>
              </span>
            </h2>
          )}
        </div>

        <div className="reveal-up flex flex-col gap-3 md:items-end">
          <p className="max-w-md text-[13px] leading-relaxed text-[#505562] sm:text-sm md:text-right">
            Interactive Gather-style 3D point-cloud viewer for structural &amp;
            topographic scans. Drag to orbit, pinch to zoom, double-tap to reset,
            cycle with{" "}
            <kbd className="rounded border border-black/20 bg-white/80 px-1.5 py-0.5 font-mono text-[10px] text-[#0D0E12] sm:text-[11px]">
              SPACE
            </kbd>
            , or drop any blueprint or site photo directly onto the canvas.
          </p>

          {!standalone && (
            <Link
              href="/gallery"
              className="group inline-flex w-fit items-center gap-2 rounded-lg border border-black/15 bg-white/80 px-3.5 py-2 font-mono text-[10px] font-semibold tracking-[0.16em] text-[#0D0E12] uppercase transition-colors hover:border-[#0038FF] hover:bg-[#0038FF] hover:text-white sm:text-[11px]"
            >
              <span className="text-trim">VIEW OTHER GALLERY</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          )}
        </div>
      </div>

      {/* PART A: Full Gather 3D Point-Cloud Structural Viewer (deferred-lab kept directly on WebGL stage) */}
      <div className="anim-stage-reveal mx-auto max-w-[1440px] min-w-0">
        <div
          ref={stageRef}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={`deferred-lab relative flex min-h-[600px] w-full min-w-0 flex-col justify-between overflow-hidden rounded-2xl border transition-colors duration-300 sm:min-h-[680px] lg:min-h-[740px] ${
            paperLight
              ? "gather-surface-light border-black/20 shadow-[0_24px_56px_-18px_rgba(13,14,18,0.18)]"
              : "gather-surface-dark border-black/25 shadow-[0_28px_64px_-18px_rgba(6,8,16,0.45)]"
          }`}
        >
        <div className="absolute inset-0">
          {activeCloud && perf && (
            <LazyGatherPointCloud
              cloud={activeCloud}
              pointCount={perf.galleryPoints}
              drift={drift}
              splash={splash}
              gather={gather}
              depth={depth}
              lightOn={lightOn}
              lightHex={lightHex}
              paperLight={paperLight}
              whiteMode={whiteMode}
              travelMode={travelMode}
              draw={draw}
              denseTrackers={denseTrackers}
              paused={paused}
              interactive
              showHud
              showGimbal
              cameraDistance={3.95}
              pointSizeScale={0.84 * perf.pointSizeBoost}
              maxDpr={perf.maxDpr}
              ariaLabel={`Interactive 3D Gather structural point cloud displaying ${activeEntry.label}`}
            />
          )}
        </div>

        {isDragOver && (
          <div className="pointer-events-none absolute inset-3 z-30 flex items-center justify-center rounded-xl border-2 border-dashed border-[#0038FF] bg-black/60 p-4 text-center backdrop-blur-xs">
            <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[10px] tracking-[0.18em] text-white uppercase sm:gap-3 sm:text-xs sm:tracking-[0.22em]">
              <Upload className="h-4 w-4 shrink-0 text-[#3c6bff]" />
              <span>DROP BLUEPRINT OR SITE PHOTO TO SYNTHESIZE 3D POINT CLOUD</span>
            </div>
          </div>
        )}

        {/* Top Floating Smoked Glass HUD Bar (stacks cleanly on < sm so 320px never overflows) */}
        <div className="pointer-events-none relative z-20 flex min-w-0 flex-col gap-2.5 p-2.5 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div
            className={`pointer-events-auto min-w-0 max-w-full space-y-1 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 ${
              paperLight ? "glass-vellum" : "glass-obsidian"
            }`}
          >
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 sm:gap-x-3">
              <span className="font-mono text-xs font-semibold tracking-[0.26em] uppercase sm:text-sm sm:tracking-[0.38em]">
                GATHER
              </span>
              <span className={`font-mono text-[9px] tracking-[0.16em] sm:text-[10px] sm:tracking-[0.2em] ${mutedText}`}>
                LIDAR ARCHIVE · V1.5
              </span>
            </div>
            <p className={`break-words font-mono text-[9px] tracking-[0.12em] uppercase sm:text-[10px] sm:tracking-[0.16em] ${mutedText}`}>
              {uploadStatus}
            </p>
            <p className={`hidden font-mono text-[9.5px] tracking-[0.14em] min-[380px]:block sm:text-[10px] sm:tracking-[0.16em] ${mutedText}`}>
              {labPoints.toLocaleString("en-US")} GPU POINTS · DRAG ORBIT · PINCH ZOOM · 2×TAP RESET
            </p>
          </div>

          <div className="pointer-events-auto flex shrink-0 flex-row items-center justify-end gap-2 self-end sm:flex-col sm:items-end sm:gap-3 sm:self-auto">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[9.5px] tracking-[0.14em] uppercase transition-colors hover:border-[#0038FF] sm:px-3 sm:text-[10px] sm:tracking-[0.16em] ${
                  paperLight ? "glass-pill-light" : "glass-pill-dark"
                }`}
                aria-label={paused ? "Play point cloud motion" : "Pause point cloud motion"}
              >
                {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                <span className="text-trim">{paused ? "PLAY" : "PAUSE"}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaperLight((prev) => !prev)}
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors hover:border-[#0038FF] ${
                  paperLight ? "glass-pill-light" : "glass-pill-dark"
                }`}
                title={paperLight ? "Switch to Matte Black canvas" : "Switch to Blueprint Paper mode"}
                aria-label={paperLight ? "Switch to dark canvas" : "Switch to light blueprint canvas"}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 2 A10 10 0 0 1 12 22 A5 5 0 0 1 12 12 A5 5 0 0 0 12 2 Z" fill="currentColor" />
                  <circle cx="12" cy="7" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="17" r="1.5" fill={paperLight ? "#f2f3f5" : "#060709"} />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors hover:border-[#0038FF] ${
                  paperLight ? "glass-pill-light" : "glass-pill-dark"
                }`}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <span
              className={`hidden px-2 py-0.5 font-mono text-lg tracking-widest sm:inline-block ${mutedText}`}
              aria-hidden="true"
            >
              聚
            </span>
          </div>
        </div>

        {/* Floating Smoked Glass Structural Specimen Rail (horizontal bar on mobile, vertical left rail on sm+) */}
        <div className="pointer-events-none relative z-20 flex min-w-0 flex-1 items-end px-2.5 pb-1 sm:items-center sm:px-5 sm:pb-0">
          <div
            className={`no-scrollbar pointer-events-auto flex max-w-full flex-row items-center gap-2 overflow-x-auto rounded-xl p-2 sm:flex-col sm:items-stretch sm:gap-2.5 sm:overflow-visible sm:p-3 ${
              paperLight ? "glass-vellum" : "glass-obsidian"
            }`}
          >
            {specimens.map((item, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className="group flex shrink-0 items-center gap-2.5 text-left"
                  aria-label={`Select 3D specimen ${idx + 1}: ${item.label}`}
                  aria-current={active ? "true" : undefined}
                >
                  <span
                    className={`relative block h-9 w-9 overflow-hidden rounded-lg border transition-all sm:h-11 sm:w-11 ${
                      active
                        ? paperLight
                          ? "border-[#0038FF] ring-1 ring-[#0038FF]"
                          : "border-white ring-1 ring-white/80"
                        : `${borderSubtle} opacity-65 group-hover:opacity-100`
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnail}
                      alt={item.label}
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span
                    className={`hidden font-mono text-[10px] tracking-[0.14em] sm:inline ${
                      active ? "opacity-100" : "opacity-45 group-hover:opacity-85"
                    }`}
                  >
                    {idx + 1} · {item.label}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group flex shrink-0 items-center gap-2.5 text-left sm:pt-1"
              aria-label="Upload custom site photo or blueprint"
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-lg border border-dashed transition-colors group-hover:border-[#0038FF] sm:h-11 sm:w-11 ${borderSubtle}`}
              >
                <Plus className="h-4 w-4" />
              </span>
              <span
                className={`hidden font-mono text-[10px] tracking-[0.14em] uppercase sm:inline ${mutedText} group-hover:text-current`}
              >
                ADD SCAN
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Floating Inset Smoked Glass Studio Control Console */}
        <div
          className={`relative z-20 m-2.5 min-w-0 rounded-xl px-3 py-3 sm:m-4 sm:px-6 sm:py-4 ${
            paperLight ? "glass-vellum" : "glass-obsidian"
          }`}
        >
          <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-[210px_minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0 space-y-2.5 font-mono text-[9.5px] tracking-[0.14em] uppercase sm:space-y-3 sm:text-[10px] sm:tracking-[0.18em]">
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 sm:gap-x-4 sm:gap-y-2">
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-[#3c6bff]"
                >
                  <span>▸ NEXT</span>
                  <span className={mutedText}>SPACE</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLightOn((v) => !v)}
                  className="inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-[#3c6bff]"
                  aria-pressed={lightOn}
                >
                  <Sparkles
                    className={`h-3 w-3 ${lightOn ? "text-[#3c6bff]" : mutedText}`}
                  />
                  <span>LIGHT</span>
                  <span className={mutedText}>{lightOn ? "ON" : "OFF"}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className={mutedText}>TRAVEL</span>
                {(["swarm", "melt"] as TravelMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTravelMode(mode)}
                    className={`px-0.5 transition-opacity ${
                      travelMode === mode ? pillActive : `${mutedText} hover:opacity-100`
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {paperLight && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className={mutedText}>ON WHITE</span>
                  {(["negative", "true"] as WhitePaperMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setWhiteMode(mode)}
                      className={`px-0.5 ${
                        whiteMode === mode ? pillActive : mutedText
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-3 sm:space-y-3.5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 sm:gap-x-6 sm:gap-y-2.5">
                {[
                  { id: "drift", label: "DRIFT", value: drift, set: setDrift },
                  { id: "splash", label: "SPLASH", value: splash, set: setSplash },
                  { id: "gather", label: "GATHER", value: gather, set: setGather },
                  { id: "depth", label: "DEPTH", value: depth, set: setDepth },
                ].map((ctrl) => (
                  <label
                    key={ctrl.id}
                    htmlFor={`gather-${ctrl.id}`}
                    className="flex min-w-0 flex-col gap-1 font-mono text-[9.5px] tracking-[0.14em] sm:text-[10px] sm:tracking-[0.16em]"
                  >
                    <span className="flex items-center justify-between">
                      <span className={mutedText}>{ctrl.label}</span>
                      <span>{ctrl.value}</span>
                    </span>
                    <input
                      id={`gather-${ctrl.id}`}
                      type="range"
                      min={0}
                      max={100}
                      value={ctrl.value}
                      onChange={(e) => ctrl.set(Number(e.target.value))}
                      className="gather-slider w-full"
                    />
                  </label>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[9.5px] tracking-[0.14em] uppercase sm:gap-x-4 sm:text-[10px] sm:tracking-[0.16em]">
                <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className={mutedText}>DRAW</span>
                  {(["track", "links", "scan", "marks"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleDraw(key)}
                      aria-pressed={draw[key]}
                      className={draw[key] ? pillActive : `${mutedText} hover:opacity-100`}
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <div className="inline-flex items-center gap-2.5">
                  <span className={mutedText}>TRACKERS</span>
                  <button
                    type="button"
                    onClick={() => setDenseTrackers(false)}
                    className={!denseTrackers ? pillActive : mutedText}
                  >
                    SPARSE
                  </button>
                  <button
                    type="button"
                    onClick={() => setDenseTrackers(true)}
                    className={denseTrackers ? pillActive : mutedText}
                  >
                    DENSE
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono text-[9.5px] tracking-[0.14em] uppercase sm:text-[10px] sm:tracking-[0.16em] lg:justify-end">
              <span className={`mr-1 ${mutedText}`}>LIGHT</span>
              {GATHER_SWATCHES.map((sw) => {
                const selected = lightHex.toLowerCase() === sw.hex.toLowerCase();
                return (
                  <button
                    key={sw.id}
                    type="button"
                    onClick={() => {
                      setLightHex(sw.hex);
                      setLightOn(true);
                    }}
                    title={sw.name}
                    aria-label={`Set light tint to ${sw.name}`}
                    aria-pressed={selected}
                    className={`h-4 w-4 rounded-full border transition-transform hover:scale-125 ${
                      selected
                        ? paperLight
                          ? "scale-115 border-black ring-2 ring-[#0038FF]"
                          : "scale-115 border-white ring-2 ring-white/50"
                        : "border-white/30"
                    }`}
                    style={{ backgroundColor: sw.hex }}
                  />
                );
              })}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* PART B: Clean High-Contrast Technical Blueprint Plates */}
      <div className="mx-auto mt-12 max-w-[1440px] sm:mt-14">
        <div className="reveal-up mb-5 flex flex-wrap items-baseline justify-between gap-2 sm:mb-6 sm:gap-4">
          <p className="font-mono text-[10px] tracking-[0.18em] text-[#505562] uppercase sm:text-[11px] sm:tracking-[0.22em]">
            DRAWING PLATES // STRUCTURAL &amp; SYSTEM ARCHIVE (CLICK TO INSPECT)
          </p>
          <span className="font-mono text-[9.5px] tracking-[0.16em] text-[#0038FF] uppercase sm:text-[10px] sm:tracking-[0.18em]">
            {String(visiblePlates.length).padStart(2, "0")} TECHNICAL SHEETS · INTERACTIVE
          </span>
        </div>

        {/* Category Filter Pills on Standalone /gallery Page */}
        {standalone && (
          <div className="reveal-up mb-6 flex flex-wrap items-center gap-1.5 sm:gap-2">
            {PLATE_FILTERS.map((group) => {
              const active = activePlateFilter === group;
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => setActivePlateFilter(group)}
                  aria-pressed={active}
                  className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase transition-colors sm:px-3.5 sm:py-2 ${
                    active
                      ? "border-[#0038FF] bg-[#0038FF] text-white"
                      : "border-black/12 bg-white/75 text-[#3A3F4B] hover:border-[#0038FF] hover:text-[#0038FF]"
                  }`}
                >
                  <span className="text-trim">{group}</span>
                </button>
              );
            })}
          </div>
        )}

        <div
          data-anim={standalone ? undefined : "stagger-group"}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
        >
          {visiblePlates.map((plate, idx) => (
            <motion.div
              key={plate.id}
              initial={
                standalone
                  ? { opacity: 0, y: 18, filter: "blur(5px)" }
                  : false
              }
              animate={
                standalone
                  ? { opacity: 1, y: 0, filter: "blur(0px)" }
                  : undefined
              }
              transition={
                standalone
                  ? {
                      duration: 0.65,
                      delay: Math.min(idx * 0.07, 0.3),
                      ease: [0.22, 1, 0.36, 1],
                    }
                  : undefined
              }
              className={standalone ? "flex min-w-0" : "stagger-item flex min-w-0"}
            >
              <motion.button
                type="button"
                onClick={() => openLightbox(plate)}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="group flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-black/12 bg-white/85 text-left shadow-[0_12px_30px_-16px_rgba(13,14,18,0.12)] transition-colors hover:border-[#0038FF]/35 hover:shadow-[0_22px_40px_-16px_rgba(0,56,255,0.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038FF]"
              >
              <div className="flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-black/10 px-3.5 py-2.5 font-mono text-[9px] tracking-[0.12em] text-[#505562] uppercase sm:px-4 sm:text-[10px] sm:tracking-[0.16em]">
                <span className="whitespace-nowrap font-semibold text-[#0038FF]">{plate.code}</span>
                <span className="whitespace-nowrap">{plate.scale}</span>
              </div>

              <div className="aspect-[16/10] w-full overflow-hidden border-b border-black/10 bg-[#F6F7F9] text-[#0D0E12] transition-transform duration-300 group-hover:scale-[1.015]">
                {plate.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={plate.imageUrl}
                    alt={plate.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <BlueprintGraphic type={plate.visualType} />
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between gap-3 p-4 sm:p-5">
                <div className="min-w-0">
                  <p className="font-mono text-[9.5px] tracking-[0.14em] text-[#505562] uppercase sm:text-[10px] sm:tracking-[0.16em]">
                    {plate.category} · {plate.year}
                  </p>
                  <h3 className="mt-1.5 break-words font-display text-base font-extrabold tracking-tight text-[#0D0E12] uppercase transition-colors group-hover:text-[#0038FF] sm:text-lg">
                    {plate.title}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 font-mono text-[9.5px] tracking-[0.12em] text-[#505562] uppercase sm:text-[10px] sm:tracking-[0.14em]">
                  <span className="truncate">{plate.coords}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#0D0E12] group-hover:text-[#0038FF]">
                    VIEW <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Editorial Full Gallery Archive Link Bar (shown on Home preview) */}
        {!standalone && (
          <div className="reveal-up mt-6 sm:mt-8">
            <Link
              href="/gallery"
              className="glass-vellum group flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-4 transition-all hover:border-[#0038FF]/45 hover:bg-white sm:px-6"
            >
              <div className="min-w-0">
                <p className="font-mono text-[9.5px] tracking-[0.18em] text-[#0038FF] uppercase sm:text-[10px]">
                  ARCHIVE // FULL 3D LIDAR STUDIO &amp; FILTERABLE BLUEPRINT ARCHIVE
                </p>
                <p className="mt-1 font-display text-sm font-extrabold tracking-tight text-[#0D0E12] uppercase transition-colors group-hover:text-[#0038FF] sm:text-base">
                  VIEW OTHER GALLERY &amp; ALL TECHNICAL PLATES
                </p>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#0D0E12] text-white transition-colors group-hover:bg-[#0038FF]">
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </Link>
          </div>
        )}
      </div>

      {/* Native Light Frosted-Glass <dialog> Blueprint Lightbox */}
      <dialog
        ref={lightboxRef}
        id="gallery-plate-dialog"
        closedby="any"
        aria-labelledby="plate-dialog-title"
        data-lenis-prevent
        className="editorial-dialog"
      >
        {activePlate && (
          <div className="editorial-dialog-scroll p-4 sm:p-8" data-lenis-prevent>
            <div className="flex items-start justify-between gap-3 border-b border-black/15 pb-4 sm:gap-4">
              <div className="min-w-0">
                <p className="font-mono text-[9.5px] tracking-[0.16em] text-[#0038FF] uppercase sm:text-[10px] sm:tracking-[0.22em]">
                  {activePlate.code} // {activePlate.scale} · {activePlate.coords}
                </p>
                <h2
                  id="plate-dialog-title"
                  className="mt-1.5 break-words font-display text-lg font-extrabold tracking-tight text-[#0D0E12] uppercase sm:text-3xl"
                >
                  {activePlate.title}
                </h2>
              </div>

              <form method="dialog" className="shrink-0">
                <button
                  type="submit"
                  value="close"
                  autoFocus
                  aria-label="Close drawing plate dialog"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-black/20 text-[#0D0E12] transition-colors hover:border-[#0038FF] hover:bg-[#0038FF] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
            </div>

            <div className="mt-4 aspect-[16/10] w-full overflow-hidden rounded-xl border border-black/15 bg-white text-[#0D0E12] sm:mt-5">
              {activePlate.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={activePlate.imageUrl}
                  alt={activePlate.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <BlueprintGraphic type={activePlate.visualType} />
              )}
            </div>

            <div className="mt-4 flex flex-col justify-between gap-4 sm:mt-5 sm:flex-row sm:items-end">
              <p className="max-w-lg text-[13px] leading-relaxed text-[#3B404D] sm:text-sm">
                {activePlate.caption}
              </p>

              <button
                type="button"
                onClick={() => loadPresetIntoViewer(activePlate.preset)}
                className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0038FF] px-4 py-2.5 font-mono text-[10.5px] font-semibold tracking-[0.14em] text-white uppercase transition-colors hover:bg-[#0D0E12] sm:w-auto sm:text-[11px] sm:tracking-[0.16em]"
              >
                <span className="text-trim">
                  LOAD {activePlate.preset.toUpperCase()} 3D
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
