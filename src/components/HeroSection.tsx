"use client";

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { PORTFOLIO_PROFILE } from "@/data/portfolio";
import {
  scheduleBackgroundTask,
  useInViewport,
  usePerformanceProfile,
} from "@/lib/devicePerf";
import {
  generatePresetPointCloud,
  type PointCloudData,
} from "@/lib/pointCloudGenerator";
import { LazyGatherPointCloud } from "./LazyGatherPointCloud";
import { ConcreteCracks, HeroSprayArtwork } from "./SprayArtworks";
import { LazyInteractiveFluidShowcase } from "./VgpuShowcases";

const GHOST_LINES = [
  "STATIC PLANS",
  "SILOED CODE",
  "MANUAL WORK",
  "RIGID SYSTEMS",
  "STUCK IN THE PAST",
];

export function HeroSection() {
  const perf = usePerformanceProfile();
  const [heroCloud, setHeroCloud] = useState<PointCloudData | null>(null);
  const [fluidBooted, setFluidBooted] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const tapResetRef = useRef<number>(0);
  const isHeroInView = useInViewport(sectionRef, "160px 0px");

  // Zero-rerender spring parallax planes (back ghost text / mid cobalt spray / front GO HARD)
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawPulse = useMotionValue(1);

  const springX = useSpring(rawX, { stiffness: 130, damping: 22, mass: 0.6 });
  const springY = useSpring(rawY, { stiffness: 130, damping: 22, mass: 0.6 });
  const pulseScale = useSpring(rawPulse, { stiffness: 320, damping: 18, mass: 0.5 });

  const ghostX = useTransform(springX, [-1, 1], [10, -10]);
  const ghostY = useTransform(springY, [-1, 1], [6, -6]);
  const sprayX = useTransform(springX, [-1, 1], [-12, 12]);
  const sprayY = useTransform(springY, [-1, 1], [-8, 8]);
  const sprayRotate = useTransform(springX, [-1, 1], [-1.4, 1.4]);
  const textX = useTransform(springX, [-1, 1], [-20, 20]);
  const textY = useTransform(springY, [-1, 1], [-12, 12]);
  const textRotate = useTransform(springX, [-1, 1], [-2, 2]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      window.clearTimeout(tapResetRef.current);
    };
  }, []);

  // Defer ambient GPU fluid & 3D bridge behind initial Hero LCP paint using background priority scheduling
  useEffect(() => {
    const cancelFluid = scheduleBackgroundTask(() => {
      setFluidBooted(true);
    }, 180);
    return cancelFluid;
  }, []);

  useEffect(() => {
    if (!perf) return;
    return scheduleBackgroundTask(() => {
      setHeroCloud(generatePresetPointCloud("bridge", perf.heroPoints));
    }, 260);
  }, [perf]);

  const handleHeroPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (reducedMotion || !sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ny = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
    rawX.set(Math.max(-1, Math.min(1, nx)));
    rawY.set(Math.max(-1, Math.min(1, ny)));
  };

  const handleHeroPointerLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  const handleHeroClick = (e: MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("a, button")) return;

    // Trigger 3D bridge particle scatter -> re-gather wave + subtle foreground recoil
    setPulseCount((c) => c + 1);

    if (!reducedMotion && sectionRef.current) {
      const rect = sectionRef.current.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const ny = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
      rawX.set(Math.max(-1, Math.min(1, nx)));
      rawY.set(Math.max(-1, Math.min(1, ny)));
      rawPulse.set(0.955);

      window.clearTimeout(tapResetRef.current);
      tapResetRef.current = window.setTimeout(() => {
        rawPulse.set(1);
        if (perf?.isTouchOnly) {
          rawX.set(0);
          rawY.set(0);
        }
      }, 170);
    }
  };

  return (
    <section
      ref={sectionRef}
      id="home"
      onPointerMove={handleHeroPointerMove}
      onPointerLeave={handleHeroPointerLeave}
      onClick={handleHeroClick}
      className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden border-b border-black/12 px-3 pt-[74px] pb-4 min-[380px]:px-4 min-[380px]:pt-[84px] sm:px-8 sm:pb-5 lg:px-12"
    >
      {/* Layer 0: Ambient Interactive Navier-Stokes Concrete × Cobalt Fluid (deferred past LCP, unmounts off-screen) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-75"
      >
        {fluidBooted && isHeroInView && <LazyInteractiveFluidShowcase ambient />}
      </div>

      {/* Architectural Concrete Crack Accents */}
      <ConcreteCracks className="pointer-events-none absolute top-12 left-0 z-[1] h-[260px] w-[220px] opacity-80 sm:h-[360px] sm:w-[300px]" />

      {/* Layer 1: 3D Cable-Stayed Bridge Point-Cloud blended seamlessly over Interactive Fluid */}
      <div
        className={`pointer-events-none absolute inset-0 z-[1] mix-blend-multiply transition-opacity duration-700 ${
          heroCloud ? "opacity-55" : "opacity-0"
        }`}
      >
        {heroCloud && perf && (
          <LazyGatherPointCloud
            cloud={heroCloud}
            pointCount={perf.heroPoints}
            drift={44}
            splash={58}
            gather={46}
            depth={72}
            lightOn
            lightHex="#0038FF"
            paperLight
            whiteMode="negative"
            draw={{ track: false, links: false, scan: false, marks: true }}
            paused={false}
            interactive={false}
            ambientInteractive
            pulseTrigger={pulseCount}
            showHud
            showGimbal={false}
            cameraDistance={4.15}
            pointSizeScale={0.92 * perf.pointSizeBoost}
            maxDpr={perf.maxDpr}
            ariaLabel="Ambient interactive 3D cable-stayed bridge point cloud behind hero typography"
          />
        )}
      </div>

      {/* Top Status & Location Strip */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-2 font-mono text-[9px] tracking-[0.12em] text-[#505562] uppercase sm:text-[10px] sm:tracking-[0.18em]">
        <span className="hero-top-item glass-pill-light inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[#0D0E12] sm:gap-2 sm:px-3 sm:py-1.5">
          <span
            className="status-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#0038FF] sm:h-2 sm:w-2"
            aria-hidden="true"
          />
          <span className="text-trim truncate">{PORTFOLIO_PROFILE.availability}</span>
        </span>
        <span className="hero-top-item glass-pill-light hidden items-center rounded-full px-3 py-1.5 text-[#3A3F4B] sm:inline-flex">
          <span className="text-trim">{PORTFOLIO_PROFILE.location}</span>
        </span>
      </div>

      {/* Centerpiece: Kinetic Scroll-Scrubbed + Interactive Depth Parallax Ghost Typography & GO HARD */}
      <div className="relative z-10 mx-auto my-auto w-full max-w-[1440px] py-2 sm:py-1">
        <div className="relative mx-auto max-w-[1160px]">
          <motion.div
            aria-hidden="true"
            style={reducedMotion ? undefined : { x: ghostX, y: ghostY }}
            className="hero-ghost-lines select-none font-display text-[clamp(1.25rem,6.2vw,5.25rem)] leading-[0.9] font-extrabold tracking-[-0.035em] text-white/92 uppercase drop-shadow-[0_1px_12px_rgba(13,14,18,0.06)] sm:leading-[0.88]"
          >
            {GHOST_LINES.map((line, i) => (
              <div
                key={line}
                className={i % 2 === 0 ? "hero-ghost-odd" : "hero-ghost-even"}
              >
                <div className="hero-line">{line}</div>
              </div>
            ))}
          </motion.div>

          <div className="hero-spray-parallax pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="hero-spray relative flex w-full items-center justify-center">
              <motion.div
                style={
                  reducedMotion
                    ? undefined
                    : { x: sprayX, y: sprayY, rotate: sprayRotate, scale: pulseScale }
                }
                className="flex w-full items-center justify-center"
              >
                <HeroSprayArtwork className="w-[96%] max-w-[800px] -rotate-2 sm:w-[90%]" />
              </motion.div>

              <motion.div
                style={
                  reducedMotion
                    ? undefined
                    : { x: textX, y: textY, rotate: textRotate, scale: pulseScale }
                }
                className="absolute inset-0 flex flex-col items-center justify-center text-center"
              >
                <h1 className="sr-only">
                  {PORTFOLIO_PROFILE.fullName} — Civil Engineering Student &amp; Software Developer.
                  Go Hard, Build Solid Infrastructure and Modern Software.
                </h1>
                <span
                  aria-hidden="true"
                  className="weathered-spray -rotate-6 font-script text-[clamp(2.35rem,9.4vw,8rem)] leading-[0.84] tracking-[-0.02em] text-[#0034FF] drop-shadow-[3px_4px_0px_rgba(10,11,15,0.92)] sm:drop-shadow-[4px_6px_0px_rgba(10,11,15,0.92)]"
                >
                  GO
                  <br />
                  <span className="pl-6 text-[#0B0C10] drop-shadow-[-3px_3px_0px_rgba(0,56,255,0.95)] min-[380px]:pl-10 sm:pl-20 sm:drop-shadow-[-4px_4px_0px_rgba(0,56,255,0.95)]">
                    HARD
                  </span>
                </span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Clean Frosted Glass Telemetry Dock */}
      <div className="hero-dock relative z-10 mx-auto w-full max-w-[1440px] pt-2">
        <div className="glass-vellum flex flex-col justify-between gap-3.5 rounded-2xl p-3.5 sm:gap-4 sm:px-6 sm:py-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-mono text-[9px] font-semibold tracking-[0.14em] text-[#0038FF] uppercase sm:text-[10px] sm:tracking-[0.2em]">
              00 // {PORTFOLIO_PROFILE.fullName} — {PORTFOLIO_PROFILE.tagline}
            </p>
            <p className="max-w-2xl text-[13px] font-medium leading-snug text-[#0D0E12] sm:text-base">
              Hi, I&apos;m {PORTFOLIO_PROFILE.fullName} — a{" "}
              <span className="font-bold text-[#0038FF]">Civil Engineering</span>{" "}
              student &amp;{" "}
              <span className="font-bold text-[#0D0E12] underline decoration-[#0038FF]/60 decoration-2 underline-offset-4">
                Software Developer
              </span>{" "}
              uniting structural design, full-stack code, bass music, and visual craft.
            </p>
          </div>

          <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-2.5">
            <motion.a
              href="#works"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
              className="group inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0D0E12] px-2.5 py-2 whitespace-nowrap font-mono text-[9.5px] font-semibold tracking-[0.08em] text-white uppercase transition-colors hover:bg-[#0038FF] min-[380px]:text-[10px] min-[380px]:tracking-[0.12em] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-[11px] sm:tracking-[0.16em]"
            >
              <span className="text-trim">SELECTED WORKS</span>
              <ArrowDownRight className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5 sm:h-3.5 sm:w-3.5" />
            </motion.a>

            <motion.a
              href="#gallery"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
              className="glass-cobalt group inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 whitespace-nowrap font-mono text-[9.5px] font-semibold tracking-[0.08em] text-[#0038FF] uppercase transition-colors hover:bg-[#0038FF] hover:text-white min-[380px]:text-[10px] min-[380px]:tracking-[0.12em] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-[11px] sm:tracking-[0.16em]"
            >
              <span className="text-trim">PHOTO GALLERY</span>
              <ArrowUpRight className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:h-3.5 sm:w-3.5" />
            </motion.a>
          </div>
        </div>
      </div>
    </section>
  );
}
