"use client";

import { useRef, useState, type PointerEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { SprayInfinity } from "./SprayArtworks";

interface DatumStation {
  station: string;
  meters: number;
  label: string;
  spec: string;
  discipline: "CIVIL" | "SOFTWARE" | "HYBRID";
}

const DATUM_STATIONS: DatumStation[] = [
  {
    station: "0+000",
    meters: 0,
    label: "STRUCTURAL",
    spec: "SNI 1726 · ACI 318 · ETABS FINITE-ELEMENT FRAMES & LONG-SPAN BRIDGES",
    discipline: "CIVIL",
  },
  {
    station: "0+020",
    meters: 20,
    label: "FULL-STACK",
    spec: "NEXT.JS 16 · TYPESCRIPT · PYTHON FASTAPI · POSTGIS SPATIAL APIS",
    discipline: "SOFTWARE",
  },
  {
    station: "0+040",
    meters: 40,
    label: "BIM PIPELINE",
    spec: "REVIT API (C#) · DYNAMO · AUTOMATED REBAR DETAILING & IFC SYNC",
    discipline: "HYBRID",
  },
  {
    station: "0+060",
    meters: 60,
    label: "3D LIDAR",
    spec: "THREE.JS · CUSTOM GLSL SHADERS · 60 FPS POINT-CLOUD DIGITAL TWINS",
    discipline: "HYBRID",
  },
  {
    station: "0+080",
    meters: 80,
    label: "SEISMIC QA",
    spec: "MODAL DRIFT VERIFICATION · P-DELTA AUDITING · AUTOMATED CODE CHECKS",
    discipline: "CIVIL",
  },
  {
    station: "0+100",
    meters: 100,
    label: "PARAMETRIC",
    spec: "GRASSHOPPER · THIN-SHELL FORM-FINDING · REAL-TIME WEB FEA SANDBOX",
    discipline: "HYBRID",
  },
];

export function SloganSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const rulerRef = useRef<HTMLDivElement>(null);
  const staReadoutRef = useRef<HTMLSpanElement>(null);

  // Smooth spring-tracked Vernier hairline position (0% .. 100%)
  const rawPct = useMotionValue(8.33);
  const springPct = useSpring(rawPct, { stiffness: 320, damping: 32, mass: 0.4 });
  const needleLeft = useTransform(springPct, (v) => `${v}%`);

  const activeStation = DATUM_STATIONS[activeIdx] ?? DATUM_STATIONS[0];

  const selectStation = (idx: number) => {
    setActiveIdx(idx);
    const pct = ((idx + 0.5) / DATUM_STATIONS.length) * 100;
    rawPct.set(pct);
    if (staReadoutRef.current) {
      staReadoutRef.current.textContent = `STA ${DATUM_STATIONS[idx].station}.0M`;
    }
  };

  const handleRulerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const pct = ratio * 100;

    rawPct.set(pct);
    if (!isTracking) setIsTracking(true);

    const meters = ratio * 100;
    const whole = Math.floor(meters);
    const dec = Math.floor((meters - whole) * 10);
    if (staReadoutRef.current) {
      staReadoutRef.current.textContent = `STA 0+${String(whole).padStart(3, "0")}.${dec}M`;
    }

    const nearest = Math.min(
      DATUM_STATIONS.length - 1,
      Math.floor(ratio * DATUM_STATIONS.length)
    );
    if (nearest !== activeIdx) {
      setActiveIdx(nearest);
    }
  };

  const handleRulerLeave = () => {
    setIsTracking(false);
    const snappedPct = ((activeIdx + 0.5) / DATUM_STATIONS.length) * 100;
    rawPct.set(snappedPct);
    if (staReadoutRef.current) {
      staReadoutRef.current.textContent = `STA ${activeStation.station}.0M`;
    }
  };

  return (
    <section
      id="slogan"
      className="relative overflow-hidden border-b border-black/12 bg-gradient-to-b from-[#ECEEF0] via-[#F5F6F8] to-[#ECEEF0] pt-24 pb-0 sm:pt-32"
      aria-labelledby="slogan-heading"
    >
      {/* Giant Electric Cobalt-Blue Spray Infinity Loop */}
      <div className="px-3 pb-16 min-[380px]:px-4 sm:px-8 sm:pb-24 lg:px-12">
        <div className="relative mx-auto max-w-[1440px]">
          <div className="relative flex min-h-[340px] flex-col justify-center py-6 sm:min-h-[520px] sm:py-8">
            <div className="manifesto-infinity pointer-events-none absolute inset-0 flex items-center justify-center">
              <SprayInfinity className="w-[108%] max-w-[1160px] opacity-95" />
            </div>

            <div className="relative z-10 grid min-w-0 items-end gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
              <div data-anim="mask-group" className="min-w-0">
                <p className="reveal-up mb-3 font-mono text-[10px] tracking-[0.2em] text-[#0038FF] uppercase sm:mb-4 sm:text-[11px] sm:tracking-[0.22em]">
                  02 // SLOGAN · 無限の可能性
                </p>
                <h2
                  id="slogan-heading"
                  className="font-display text-[clamp(1.9rem,8.2vw,7.4rem)] leading-[0.9] font-extrabold tracking-[-0.04em] text-[#0D0E12] uppercase sm:leading-[0.88]"
                >
                  <span className="block">
                    <span className="slogan-word-left mask-line inline-block">
                      ENDLESS
                    </span>
                  </span>
                  <span className="block">
                    <span className="slogan-word-right mask-line inline-block">
                      NO LIMIT
                    </span>
                  </span>
                </h2>
              </div>

              {/* Frosted Drafting Vellum Glass Card Refracting Cobalt Infinity */}
              <div className="slogan-glass-float min-w-0 lg:mb-3">
                <div className="reveal-up glass-vellum space-y-3.5 rounded-2xl border-l-2 border-l-[#0038FF] p-4 sm:space-y-4 sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-[9.5px] font-semibold tracking-[0.18em] text-[#0038FF] uppercase sm:text-[10px] sm:tracking-[0.22em]">
                      SLOGAN // CONCRETE × CODE
                    </p>
                    <span className="font-mono text-[9px] tracking-[0.16em] text-[#505562] uppercase sm:tracking-[0.18em]">
                      GLASS PLATE 02
                    </span>
                  </div>
                  <p className="text-lg font-bold tracking-tight text-[#0D0E12] sm:text-xl">
                    構造とコードの無限の可能性
                  </p>
                  <p className="text-[13px] leading-relaxed text-[#242832] sm:text-sm">
                    Steel and concrete follow physics; software multiplies human
                    scale. By uniting structural engineering discipline with modern
                    code, there are no boundaries between what can be calculated,
                    visualized, and built.
                  </p>
                  <motion.a
                    href="#skill"
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 420, damping: 24 }}
                    className="glass-cobalt group inline-flex items-center gap-2 rounded-lg px-3.5 py-2 whitespace-nowrap font-mono text-[10px] font-semibold tracking-[0.16em] text-[#0038FF] uppercase transition-colors hover:bg-[#0038FF] hover:text-white sm:px-4 sm:py-2.5 sm:text-[11px] sm:tracking-[0.2em]"
                  >
                    <span className="text-trim">EXPLORE SKILLS</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:h-4 sm:w-4" />
                  </motion.a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bespoke Interactive Architectural Vernier Datum Scale (Replaces Cliché Marquee) */}
      <div
        id="datum-scale"
        className="relative border-t border-black/15 bg-white/55 backdrop-blur-xs"
        aria-label="Interactive engineering discipline datum scale"
      >
        <div className="mx-auto max-w-[1440px] px-3 sm:px-8 lg:px-12">
          <div
            ref={rulerRef}
            onPointerMove={handleRulerMove}
            onPointerLeave={handleRulerLeave}
            className="relative"
          >
            {/* Calibrated 1px Architectural Ruler Ticks + Gliding Cobalt Vernier Needle */}
            <div
              aria-hidden="true"
              className="datum-ruler-ticks relative h-4 w-full overflow-hidden border-x border-black/10"
            >
              <motion.span
                style={{ left: needleLeft }}
                className={`pointer-events-none absolute top-0 bottom-0 w-[2px] -translate-x-1/2 bg-[#0038FF] transition-opacity duration-200 ${
                  isTracking ? "opacity-100 shadow-[0_0_10px_#0038FF]" : "opacity-85"
                }`}
              />
            </div>

            {/* 6 Calibrated Discipline Stations (Uniform 1px Hairline Grid at All Breakpoints) */}
            <div
              role="tablist"
              aria-label="Engineering discipline stations"
              className="grid grid-cols-2 gap-px border border-black/10 bg-black/10 sm:grid-cols-3 lg:grid-cols-6"
            >
              {DATUM_STATIONS.map((item, idx) => {
                const active = idx === activeIdx;
                return (
                  <button
                    key={item.station}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onMouseEnter={() => selectStation(idx)}
                    onClick={() => selectStation(idx)}
                    className={`group relative flex min-w-0 flex-col gap-0.5 px-2.5 py-3 text-left transition-colors sm:px-3.5 sm:py-3.5 ${
                      active
                        ? "bg-[#EFF3FF]"
                        : "bg-[#F7F8FA] hover:bg-white"
                    }`}
                  >
                    <span
                      className={`absolute inset-x-0 top-0 h-[2px] origin-left bg-[#0038FF] transition-transform duration-300 ${
                        active ? "scale-x-100" : "scale-x-0"
                      }`}
                      aria-hidden="true"
                    />

                    <span className="flex items-center justify-between gap-1 font-mono text-[9px] tracking-[0.14em] uppercase">
                      <span
                        className={`tabular-nums font-semibold transition-colors ${
                          active ? "text-[#0038FF]" : "text-[#505562]"
                        }`}
                      >
                        {item.station}
                      </span>
                      <span className="text-[8.5px] text-[#505562]/75">
                        {item.discipline}
                      </span>
                    </span>

                    <span
                      className={`truncate font-mono text-[10.5px] font-semibold tracking-[0.14em] uppercase transition-colors sm:text-[11px] ${
                        active
                          ? "text-[#0038FF]"
                          : "text-[#0D0E12] group-hover:text-[#0038FF]"
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Live Calibrated Spec Readout Strip */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 font-mono text-[9.5px] tracking-[0.14em] uppercase sm:py-3 sm:text-[10px]">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0038FF]"
                  aria-hidden="true"
                />
                <span
                  ref={staReadoutRef}
                  className="shrink-0 font-semibold text-[#0038FF] tabular-nums"
                >
                  STA {activeStation.station}.0M
                </span>
                <span className="hidden text-black/20 sm:inline" aria-hidden="true">
                  //
                </span>
                <span className="min-w-0 break-words text-[#242832] sm:truncate">
                  {activeStation.spec}
                </span>
              </div>

              <span className="hidden shrink-0 text-[#505562] md:inline">
                DATUM SCALE · SCRUB OR SELECT STATION
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
