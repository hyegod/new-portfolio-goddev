"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Camera,
  MapPin,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import {
  PHOTO_GALLERY,
  type PhotoBentoSize,
  type PhotoCategory,
  type PhotoGalleryItem,
  type PhotoTone,
} from "@/data/portfolio";

type PhotoFilter = "ALL" | PhotoCategory;

const PHOTO_FILTERS: PhotoFilter[] = [
  "ALL",
  "LANDSCAPE",
  "ARCHITECTURE",
  "STREET",
  "STAGE",
  "MONOCHROME",
];

const MONTHS_SHORT = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function formatPhotoDate(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "UNDATED";
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    const year = isoMatch[1];
    const monthIdx = Number(isoMatch[2]) - 1;
    const day = isoMatch[3];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${MONTHS_SHORT[monthIdx]} ${year}`;
    }
  }
  return trimmed.toUpperCase();
}

function getBentoTileClass(size: PhotoBentoSize): string {
  switch (size) {
    case "hero":
      return "min-h-[290px] sm:min-h-0 sm:col-span-2 sm:row-span-2";
    case "wide":
      return "min-h-[235px] sm:min-h-0 sm:col-span-2 sm:row-span-1";
    case "tall":
      return "min-h-[320px] sm:min-h-0 sm:col-span-1 sm:row-span-2";
    default:
      return "min-h-[245px] sm:min-h-0 sm:col-span-1 sm:row-span-1";
  }
}

/**
 * Editorial photographic light-study placeholder displayed only before real photos
 * are uploaded to Vercel Blob via /admin.
 */
function EditorialPhotoArtwork({
  tone = "obsidian",
  frame,
  camera,
}: {
  tone?: PhotoTone;
  frame: string;
  camera?: string;
}) {
  const palettes: Record<
    PhotoTone,
    { bg: string; glowA: string; glowB: string; accent: string }
  > = {
    cobalt: {
      bg: "from-[#091229] via-[#0F1C3D] to-[#080B14]",
      glowA: "rgba(0, 56, 255, 0.55)",
      glowB: "rgba(105, 162, 255, 0.32)",
      accent: "#6EA6FF",
    },
    concrete: {
      bg: "from-[#222630] via-[#343A47] to-[#13161D]",
      glowA: "rgba(236, 238, 240, 0.34)",
      glowB: "rgba(0, 56, 255, 0.28)",
      accent: "#E3E7EE",
    },
    obsidian: {
      bg: "from-[#090A0F] via-[#151A28] to-[#06070B]",
      glowA: "rgba(0, 56, 255, 0.44)",
      glowB: "rgba(56, 189, 248, 0.25)",
      accent: "#5B86FF",
    },
    amber: {
      bg: "from-[#17100B] via-[#2D1B10] to-[#0A090C]",
      glowA: "rgba(245, 158, 11, 0.45)",
      glowB: "rgba(251, 191, 36, 0.22)",
      accent: "#F7B955",
    },
    slate: {
      bg: "from-[#14161B] via-[#272B35] to-[#0B0C10]",
      glowA: "rgba(226, 232, 240, 0.28)",
      glowB: "rgba(148, 163, 184, 0.2)",
      accent: "#CBD5E1",
    },
  };

  const p = palettes[tone] ?? palettes.obsidian;

  return (
    <div
      aria-hidden="true"
      className={`relative h-full w-full overflow-hidden bg-gradient-to-br ${p.bg}`}
    >
      {/* Atmospheric lens light study */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: `radial-gradient(circle at 72% 28%, ${p.glowA} 0%, transparent 55%), radial-gradient(circle at 24% 78%, ${p.glowB} 0%, transparent 52%)`,
        }}
      />

      {/* Minimalist architectural viewfinder geometry */}
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full opacity-45"
        fill="none"
      >
        <line
          x1="0"
          y1="196"
          x2="400"
          y2="196"
          stroke={p.accent}
          strokeOpacity="0.28"
          strokeWidth="0.9"
        />
        <circle
          cx="200"
          cy="145"
          r="56"
          stroke={p.accent}
          strokeOpacity="0.26"
          strokeWidth="0.9"
          strokeDasharray="3 5"
        />
        <path
          d="M188 145 H212 M200 133 V157"
          stroke={p.accent}
          strokeOpacity="0.48"
          strokeWidth="1"
        />
        {/* Corner crop marks */}
        <path
          d="M28 46 V28 H46 M354 28 H372 V46 M28 254 V272 H46 M354 272 H372 V254"
          stroke="white"
          strokeOpacity="0.28"
          strokeWidth="1.2"
        />
      </svg>

      {/* Subtle viewfinder EXIF stamp */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
        <span className="font-mono text-[9.5px] tracking-[0.26em] text-white/45 uppercase">
          FRAME {frame}
        </span>
        {camera && (
          <span className="mt-1 font-mono text-[9px] tracking-[0.18em] text-white/35 uppercase">
            {camera}
          </span>
        )}
      </div>
    </div>
  );
}

export function GallerySection({
  standalone = false,
  photos = PHOTO_GALLERY,
}: {
  standalone?: boolean;
  photos?: PhotoGalleryItem[];
}) {
  const photoList = photos.length > 0 ? photos : PHOTO_GALLERY;
  const lightboxRef = useRef<HTMLDialogElement>(null);

  const [activeFilter, setActiveFilter] = useState<PhotoFilter>("ALL");
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  const visiblePhotos = useMemo(() => {
    if (!standalone || activeFilter === "ALL") return photoList;
    return photoList.filter((item) => item.category === activeFilter);
  }, [standalone, activeFilter, photoList]);

  const activePhoto =
    activePhotoIndex !== null ? visiblePhotos[activePhotoIndex] ?? null : null;

  const openPhotoLightbox = (idx: number) => {
    setActivePhotoIndex(idx);
    requestAnimationFrame(() => {
      if (lightboxRef.current && !lightboxRef.current.open) {
        lightboxRef.current.showModal();
      }
    });
  };

  const stepPhoto = useCallback(
    (delta: number) => {
      setActivePhotoIndex((prev) => {
        if (prev === null || visiblePhotos.length === 0) return prev;
        return (prev + delta + visiblePhotos.length) % visiblePhotos.length;
      });
    },
    [visiblePhotos.length]
  );

  // Sync dialog close & fallback outside-click close for browsers without `closedby`
  useEffect(() => {
    const dialog = lightboxRef.current;
    if (!dialog) return;
    const onClose = () => {
      dialog.returnValue = "";
      setActivePhotoIndex(null);
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

  // Keyboard arrow browsing while photo lightbox is open
  useEffect(() => {
    if (activePhotoIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!lightboxRef.current?.open) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        stepPhoto(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepPhoto(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePhotoIndex, stepPhoto]);

  return (
    <section
      id="gallery"
      className={
        standalone
          ? "relative border-b border-black/15 px-3 pt-28 pb-16 min-[380px]:px-4 sm:px-8 sm:pt-32 sm:pb-24 lg:px-12"
          : "relative border-b border-black/15 px-3 py-16 min-[380px]:px-4 sm:px-8 sm:py-20 lg:px-12 lg:py-28"
      }
      aria-labelledby="gallery-heading"
    >
      <div className="mx-auto max-w-[1440px]">
        {/* Standalone Breadcrumb */}
        {standalone && (
          <div className="reveal-up mb-8 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="glass-pill-light group inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-[#0D0E12] uppercase transition-colors hover:border-[#0038FF] hover:text-[#0038FF]"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span className="text-trim">BACK TO HOME</span>
            </Link>

            <span className="font-mono text-[10px] tracking-[0.18em] text-[#505562] uppercase">
              {String(photoList.length).padStart(2, "0")} FRAMES · PERSONAL PHOTOGRAPHY
            </span>
          </div>
        )}

        {/* Section Intro */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-black/12 pb-6 sm:mb-10 sm:gap-6 sm:pb-8 md:flex-row md:items-end">
          <div data-anim="mask-group" className="min-w-0">
            <p className="reveal-up font-mono text-[10px] tracking-[0.2em] text-[#0038FF] uppercase sm:text-[11px] sm:tracking-[0.22em]">
              {standalone
                ? "05 // PHOTO ARCHIVE · VISUAL JOURNAL & BENTO CONTACT SHEET"
                : "05 // GALLERY · PHOTOGRAPHY HOBBY & VISUAL JOURNAL"}
            </p>
            {standalone ? (
              <h1
                id="gallery-heading"
                className="mt-2 font-display text-[clamp(1.75rem,6.4vw,4.6rem)] leading-[0.95] font-extrabold tracking-tight text-[#0D0E12] uppercase"
              >
                <span className="mask-line block">
                  PHOTO <span className="text-[#0038FF]">GALLERY</span>
                </span>
              </h1>
            ) : (
              <h2
                id="gallery-heading"
                className="mt-2 font-display text-[clamp(1.5rem,6vw,3.75rem)] leading-[0.98] font-extrabold tracking-tight text-[#0D0E12] uppercase"
              >
                <span className="mask-line block">
                  PHOTO <span className="text-[#0038FF]">GALLERY</span>
                </span>
              </h2>
            )}
          </div>

          <div className="reveal-up flex flex-col gap-3 md:items-end">
            <p className="max-w-md text-[13px] leading-relaxed text-[#505562] sm:text-sm md:text-right">
              Off-the-clock photography frames — street walks, raw concrete
              geometry, coastal light, and stage nights. Click any photo to view
              its story, date, and location.
            </p>

            {!standalone && (
              <Link
                href="/gallery"
                className="group inline-flex w-fit items-center gap-2 rounded-lg border border-black/15 bg-white/80 px-3.5 py-2 font-mono text-[10px] font-semibold tracking-[0.16em] text-[#0D0E12] uppercase transition-colors hover:border-[#0038FF] hover:bg-[#0038FF] hover:text-white sm:text-[11px]"
              >
                <span className="text-trim">VIEW FULL PHOTO GALLERY</span>
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Category Filter Pills on Standalone /gallery Page */}
        {standalone && (
          <div className="reveal-up mb-6 flex flex-wrap items-center gap-1.5 sm:mb-8 sm:gap-2">
            {PHOTO_FILTERS.map((cat) => {
              const active = activeFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setActiveFilter(cat);
                    setActivePhotoIndex(null);
                  }}
                  aria-pressed={active}
                  className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase transition-colors sm:px-3.5 sm:py-2 ${
                    active
                      ? "border-[#0038FF] bg-[#0038FF] text-white"
                      : "border-black/12 bg-white/75 text-[#3A3F4B] hover:border-[#0038FF] hover:text-[#0038FF]"
                  }`}
                >
                  <span className="text-trim">{cat}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Asymmetric Editorial Bento Grid */}
        {visiblePhotos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white/70 p-10 text-center font-mono text-xs text-[#505562] uppercase">
            NO FRAMES IN THIS CATEGORY YET.
          </div>
        ) : (
          <div
            data-anim={standalone ? undefined : "stagger-group"}
            className="grid grid-flow-dense grid-cols-1 gap-3.5 sm:auto-rows-[220px] sm:grid-cols-2 sm:gap-4 lg:auto-rows-[238px] lg:grid-cols-4"
          >
            {visiblePhotos.map((photo, idx) => (
              <motion.div
                key={photo.id}
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
                        delay: Math.min(idx * 0.06, 0.3),
                        ease: [0.22, 1, 0.36, 1],
                      }
                    : undefined
                }
                className={`${getBentoTileClass(photo.bentoSize)} ${
                  standalone ? "flex min-w-0" : "stagger-item flex min-w-0"
                }`}
              >
                <motion.button
                  type="button"
                  onClick={() => openPhotoLightbox(idx)}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.992 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  aria-label={`Inspect photo: ${photo.title} — ${photo.location}`}
                  className="group relative flex h-full w-full min-w-0 overflow-hidden rounded-2xl border border-black/14 bg-[#0D0E12] text-left shadow-[0_14px_34px_-18px_rgba(13,14,18,0.28)] transition-all duration-300 hover:border-[#0038FF]/60 hover:shadow-[0_24px_48px_-16px_rgba(0,56,255,0.26)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038FF]"
                >
                  {/* Full-Bleed Photograph or Atmospheric Frame Study */}
                  <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.045]">
                    {photo.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={photo.imageUrl}
                        alt={photo.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <EditorialPhotoArtwork
                        tone={photo.tone}
                        frame={photo.frame}
                        camera={photo.camera}
                      />
                    )}
                  </div>

                  {/* Subtle Bottom Legibility Scrim */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/82 via-black/22 to-black/15 transition-opacity duration-300 group-hover:from-black/88"
                  />

                  {/* Top Floating Badges */}
                  <div className="pointer-events-none relative z-10 flex w-full flex-col justify-between p-3.5 sm:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-black/45 px-2.5 py-1 font-mono text-[9px] font-medium tracking-[0.16em] text-white/90 uppercase backdrop-blur-md">
                        <span className="text-[#78A6FF]">{photo.frame}</span>
                        <span className="text-white/40">·</span>
                        <span>{photo.category}</span>
                      </span>

                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/18 bg-black/45 text-white/85 backdrop-blur-md transition-all duration-300 group-hover:border-[#4E7CFF] group-hover:bg-[#0038FF] group-hover:text-white">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>

                    {/* Bottom Title + Location / Date Strip */}
                    <div className="min-w-0">
                      <h3
                        className={`break-words font-display leading-tight font-extrabold tracking-tight text-white uppercase ${
                          photo.bentoSize === "hero"
                            ? "text-lg sm:text-2xl"
                            : "text-sm sm:text-base"
                        }`}
                      >
                        {photo.title}
                      </h3>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] tracking-[0.12em] text-white/75 uppercase sm:text-[9.5px]">
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <MapPin className="h-2.5 w-2.5 shrink-0 text-[#6EA6FF]" />
                          <span className="truncate">{photo.location}</span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-white/60">
                          <Calendar className="h-2.5 w-2.5 shrink-0" />
                          <span>{formatPhotoDate(photo.takenDate)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Editorial Link Bar on Home Preview */}
        {!standalone && (
          <div className="reveal-up mt-6 sm:mt-8">
            <Link
              href="/gallery"
              className="glass-vellum group flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-4 transition-all hover:border-[#0038FF]/45 hover:bg-white sm:px-6"
            >
              <div className="min-w-0">
                <p className="font-mono text-[9.5px] tracking-[0.18em] text-[#0038FF] uppercase sm:text-[10px]">
                  PHOTOGRAPHY JOURNAL // COMPLETE BENTO ARCHIVE
                </p>
                <p className="mt-1 font-display text-sm font-extrabold tracking-tight text-[#0D0E12] uppercase transition-colors group-hover:text-[#0038FF] sm:text-base">
                  OPEN FULL PHOTO GALLERY &amp; FILTER BY MOOD
                </p>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#0D0E12] text-white transition-colors group-hover:bg-[#0038FF]">
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </Link>
          </div>
        )}
      </div>

      {/* Native Frosted-Glass <dialog> Photography Lightbox (Photo + Desc + Date + Location) */}
      <dialog
        ref={lightboxRef}
        id="photo-lightbox-dialog"
        closedby="any"
        aria-labelledby="photo-dialog-title"
        data-lenis-prevent
        className="editorial-dialog editorial-dialog-wide"
      >
        {activePhoto && (
          <div className="editorial-dialog-scroll p-3.5 sm:p-6" data-lenis-prevent>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.45fr)_330px] lg:items-stretch">
              {/* Left: Matte Gallery Photo Stage (uncropped full-frame display) */}
              <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-xl border border-black/15 bg-[#0B0D13] sm:min-h-[380px] lg:min-h-[480px]">
                {activePhoto.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={activePhoto.imageUrl}
                    alt={activePhoto.title}
                    className="max-h-[58vh] w-full object-contain lg:max-h-[70vh]"
                  />
                ) : (
                  <div className="aspect-[4/3] w-full max-w-full">
                    <EditorialPhotoArtwork
                      tone={activePhoto.tone}
                      frame={activePhoto.frame}
                      camera={activePhoto.camera}
                    />
                  </div>
                )}
              </div>

              {/* Right: Editorial Details (Description, Date, Location, Camera & Nav) */}
              <div className="flex min-w-0 flex-col justify-between gap-5">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-black/12 pb-3.5">
                    <div className="min-w-0">
                      <p className="font-mono text-[9.5px] font-semibold tracking-[0.18em] text-[#0038FF] uppercase">
                        FRAME {activePhoto.frame} // {activePhoto.category}
                      </p>
                      <h2
                        id="photo-dialog-title"
                        className="mt-1.5 break-words font-display text-lg leading-tight font-extrabold tracking-tight text-[#0D0E12] uppercase sm:text-2xl"
                      >
                        {activePhoto.title}
                      </h2>
                    </div>

                    <form method="dialog" className="shrink-0">
                      <button
                        type="submit"
                        value="close"
                        autoFocus
                        aria-label="Close photo lightbox"
                        className="grid h-9 w-9 place-items-center rounded-lg border border-black/20 text-[#0D0E12] transition-colors hover:border-[#0038FF] hover:bg-[#0038FF] hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </form>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="font-mono text-[9px] font-semibold tracking-[0.18em] text-[#505562] uppercase">
                      DESCRIPTION
                    </p>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#2F3440] sm:text-sm">
                      {activePhoto.description || "Captured on location."}
                    </p>
                  </div>

                  {/* Date, Location & Camera Spec Cards */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-start gap-3 rounded-xl border border-black/10 bg-white/75 px-3.5 py-2.5">
                      <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#0038FF]" />
                      <div className="min-w-0">
                        <p className="font-mono text-[8.5px] tracking-[0.18em] text-[#505562] uppercase">
                          DATE
                        </p>
                        <p className="mt-0.5 font-mono text-xs font-semibold tracking-[0.08em] text-[#0D0E12]">
                          {formatPhotoDate(activePhoto.takenDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-xl border border-black/10 bg-white/75 px-3.5 py-2.5">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0038FF]" />
                      <div className="min-w-0">
                        <p className="font-mono text-[8.5px] tracking-[0.18em] text-[#505562] uppercase">
                          LOCATION
                        </p>
                        <p className="mt-0.5 break-words text-xs font-semibold text-[#0D0E12]">
                          {activePhoto.location || "Makassar, Indonesia"}
                        </p>
                      </div>
                    </div>

                    {activePhoto.camera && (
                      <div className="flex items-start gap-3 rounded-xl border border-black/10 bg-white/75 px-3.5 py-2.5">
                        <Camera className="mt-0.5 h-4 w-4 shrink-0 text-[#0038FF]" />
                        <div className="min-w-0">
                          <p className="font-mono text-[8.5px] tracking-[0.18em] text-[#505562] uppercase">
                            CAMERA / EXIF
                          </p>
                          <p className="mt-0.5 font-mono text-xs font-medium text-[#0D0E12]">
                            {activePhoto.camera}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Prev / Next Frame Bar */}
                {visiblePhotos.length > 1 && activePhotoIndex !== null && (
                  <div className="flex items-center justify-between gap-2 border-t border-black/12 pt-3.5 font-mono text-[10px] tracking-[0.14em] uppercase">
                    <button
                      type="button"
                      onClick={() => stepPhoto(-1)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white/80 px-3 py-2 font-semibold text-[#0D0E12] transition-colors hover:border-[#0038FF] hover:text-[#0038FF]"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>PREV</span>
                    </button>

                    <span className="text-[#505562]">
                      {String(activePhotoIndex + 1).padStart(2, "0")} /{" "}
                      {String(visiblePhotos.length).padStart(2, "0")}
                    </span>

                    <button
                      type="button"
                      onClick={() => stepPhoto(1)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white/80 px-3 py-2 font-semibold text-[#0D0E12] transition-colors hover:border-[#0038FF] hover:text-[#0038FF]"
                    >
                      <span>NEXT</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
