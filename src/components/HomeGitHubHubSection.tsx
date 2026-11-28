import Link from "next/link";
import { ArrowUpRight, Camera, Layers } from "lucide-react";
import { LazyGitHubWorksPanel } from "./LazyHeavyModules";

export function HomeGitHubHubSection() {
  return (
    <section
      id="github"
      className="deferred-section relative border-b border-black/15 px-3 py-16 min-[380px]:px-4 sm:px-8 sm:py-20 lg:px-12 lg:py-28"
      aria-labelledby="github-hub-heading"
    >
      <div className="mx-auto max-w-[1440px]">
        {/* Section Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-black/12 pb-6 sm:mb-10 sm:gap-6 md:flex-row md:items-end">
          <div data-anim="mask-group" className="min-w-0">
            <p className="reveal-up font-mono text-[10px] tracking-[0.2em] text-[#0038FF] uppercase sm:text-[11px] sm:tracking-[0.22em]">
              04 // LIVE CODE &amp; DEDICATED ARCHIVES
            </p>
            <h2
              id="github-hub-heading"
              className="mt-2 font-display text-[clamp(1.55rem,6vw,3.75rem)] leading-[0.98] font-extrabold tracking-tight text-[#0D0E12] uppercase"
            >
              <span className="mask-line block">
                GITHUB <span className="text-[#0038FF]">&amp; ARCHIVES</span>
              </span>
            </h2>
          </div>

          <p className="reveal-up max-w-md font-mono text-[11px] leading-relaxed text-[#505562] sm:text-xs md:text-right">
            Live open-source telemetry stays right here on home. Full engineering
            case studies, 3D LiDAR / WebGPU lab, and photo gallery live on their
            own fast dedicated routes.
          </p>
        </div>

        {/* Dedicated Route Portals: Works & Photo Gallery */}
        <div
          data-anim="stagger-group"
          className="mb-10 grid grid-cols-1 gap-4 sm:mb-12 md:grid-cols-2 md:gap-5"
        >
          <Link
            href="/works"
            className="stagger-item group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-black/12 bg-white/88 p-5 shadow-[0_12px_30px_-16px_rgba(13,14,18,0.12)] transition-[transform,border-color,box-shadow] duration-250 hover:-translate-y-1 hover:border-[#0038FF]/50 hover:shadow-[0_22px_44px_-16px_rgba(0,56,255,0.18)] sm:p-7"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 font-mono text-[9.5px] font-semibold tracking-[0.18em] text-[#0038FF] uppercase sm:text-[10px]">
                  <Layers className="h-3.5 w-3.5" />
                  <span>ROUTE /WORKS · CASE STUDIES &amp; LAB</span>
                </p>
                <h3 className="mt-2.5 font-display text-xl font-extrabold tracking-tight text-[#0D0E12] uppercase transition-colors group-hover:text-[#0038FF] sm:text-2xl">
                  SELECTED WORKS &amp; 3D LAB
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#4B505E] sm:text-sm">
                  Explore structural engineering software, BIM pipelines,
                  interactive 3D LiDAR point-cloud specimens, WebGPU shaders, and
                  technical blueprint plates.
                </p>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0D0E12] text-white transition-colors group-hover:bg-[#0038FF]">
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-3.5 font-mono text-[9.5px] tracking-[0.14em] text-[#505562] uppercase">
              <span>CASE STUDIES · WEBGPU · LIDAR · BLUEPRINTS</span>
              <span className="font-semibold text-[#0038FF]">OPEN /WORKS ↗</span>
            </div>
          </Link>

          <Link
            href="/gallery"
            className="stagger-item group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-black/12 bg-white/88 p-5 shadow-[0_12px_30px_-16px_rgba(13,14,18,0.12)] transition-[transform,border-color,box-shadow] duration-250 hover:-translate-y-1 hover:border-[#0038FF]/50 hover:shadow-[0_22px_44px_-16px_rgba(0,56,255,0.18)] sm:p-7"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 font-mono text-[9.5px] font-semibold tracking-[0.18em] text-[#0038FF] uppercase sm:text-[10px]">
                  <Camera className="h-3.5 w-3.5" />
                  <span>ROUTE /GALLERY · PHOTOGRAPHY JOURNAL</span>
                </p>
                <h3 className="mt-2.5 font-display text-xl font-extrabold tracking-tight text-[#0D0E12] uppercase transition-colors group-hover:text-[#0038FF] sm:text-2xl">
                  EDITORIAL PHOTO GALLERY
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#4B505E] sm:text-sm">
                  Personal asymmetric bento photography archive — street walks,
                  raw concrete geometry, coastal light, and stage moments with
                  full-frame lightbox.
                </p>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0D0E12] text-white transition-colors group-hover:bg-[#0038FF]">
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-3.5 font-mono text-[9.5px] tracking-[0.14em] text-[#505562] uppercase">
              <span>BENTO GRID · MOOD FILTERS · AVIF/WEBP</span>
              <span className="font-semibold text-[#0038FF]">OPEN /GALLERY ↗</span>
            </div>
          </Link>
        </div>

        {/* Live GitHub Contributions & Auto-Synced Public Repos (lazy-loaded near viewport) */}
        <LazyGitHubWorksPanel embedded />
      </div>
    </section>
  );
}
