"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ExternalLink,
  GitBranch,
  GitFork,
  Star,
} from "lucide-react";
import { motion } from "motion/react";
import type {
  GitHubContributionDay,
  GitHubRepoSummary,
  GitHubTelemetryResponse,
} from "@/app/api/github/route";
import { PORTFOLIO_PROFILE } from "@/data/portfolio";
import { useNearViewport } from "@/lib/devicePerf";

type HeatmapSurface = "light" | "dark";

const COBALT_RAMPS: Record<HeatmapSurface, readonly [string, string, string, string, string]> = {
  light: ["#E5E9F0", "#B9CDFF", "#7098FF", "#285DFF", "#0038FF"],
  dark: ["#151A26", "#0E2973", "#0B41CC", "#2363FF", "#6DA4FF"],
};

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Svelte: "#ff3e00",
  Python: "#3572a5",
  "C#": "#178600",
  Go: "#00add8",
  Dart: "#00b4ab",
  Kotlin: "#a97bff",
  Swift: "#f05138",
  Java: "#b07219",
  PHP: "#4f5d95",
  Ruby: "#701516",
  Vue: "#41b883",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Rust: "#dea584",
  Shell: "#89e051",
};

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatIsoDate(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const year = Number(parts[0]);
  const monthIdx = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || monthIdx < 0 || monthIdx > 11 || !Number.isFinite(day)) {
    return iso;
  }
  return `${MONTH_SHORT[monthIdx]} ${day}, ${year}`;
}

function formatPushedMonth(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "ACTIVE";
  const m = MONTH_SHORT[date.getUTCMonth()] ?? "";
  return `${m.toUpperCase()} ${date.getUTCFullYear()}`;
}

interface CalendarGrid {
  weeks: Array<Array<GitHubContributionDay | null>>;
  monthLabels: Array<{ label: string; col: number }>;
}

function buildCalendarGrid(days: GitHubContributionDay[]): CalendarGrid {
  if (days.length === 0) {
    return { weeks: [], monthLabels: [] };
  }

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = new Date(`${sorted[0].date}T00:00:00Z`);
  const leadingPad = Number.isNaN(firstDate.getTime()) ? 0 : firstDate.getUTCDay();

  const padded: Array<GitHubContributionDay | null> = [
    ...Array.from({ length: leadingPad }, () => null),
    ...sorted,
  ];

  const weeks: Array<Array<GitHubContributionDay | null>> = [];
  for (let i = 0; i < padded.length; i += 7) {
    const slice = padded.slice(i, i + 7);
    while (slice.length < 7) slice.push(null);
    weeks.push(slice);
  }

  const monthLabels: Array<{ label: string; col: number }> = [];
  let prevMonth = -1;

  weeks.forEach((week, col) => {
    const firstValid = week.find((d): d is GitHubContributionDay => d !== null);
    if (!firstValid) return;
    const monthNum = Number(firstValid.date.slice(5, 7)) - 1;
    if (monthNum !== prevMonth && monthNum >= 0 && monthNum < 12) {
      const lastLabel = monthLabels[monthLabels.length - 1];
      if (!lastLabel || col - lastLabel.col >= 3) {
        monthLabels.push({ label: MONTH_SHORT[monthNum], col });
      } else if (col <= 2) {
        monthLabels[monthLabels.length - 1] = { label: MONTH_SHORT[monthNum], col };
      }
      prevMonth = monthNum;
    }
  });

  return { weeks, monthLabels };
}

function GitHubIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.19-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.07.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export function GitHubWorksPanel() {
  const [data, setData] = useState<GitHubTelemetryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [surface, setSurface] = useState<HeatmapSurface>("light");
  const [hoveredDay, setHoveredDay] = useState<GitHubContributionDay | null>(null);
  const [selectedLang, setSelectedLang] = useState<string>("ALL");
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollWrapRef = useRef<HTMLDivElement>(null);
  const isNearPanel = useNearViewport(panelRef, "650px 0px");

  useEffect(() => {
    if (!isNearPanel) return;
    let active = true;
    fetch(`/api/github?username=${encodeURIComponent(PORTFOLIO_PROFILE.githubUsername)}`)
      .then((res) => (res.ok ? (res.json() as Promise<GitHubTelemetryResponse>) : null))
      .then((payload) => {
        if (!active) return;
        if (payload) setData(payload);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isNearPanel]);

  const calendar = useMemo(
    () => buildCalendarGrid(data?.contributions ?? []),
    [data?.contributions]
  );

  // On mobile horizontal scroll, start scrolled to the most recent months on the right
  useEffect(() => {
    const el = scrollWrapRef.current;
    if (!el || calendar.weeks.length === 0) return;
    if (el.scrollWidth > el.clientWidth + 4) {
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    }
  }, [calendar.weeks.length]);

  const languages = useMemo(() => {
    if (!data?.repos) return [];
    const set = new Set<string>();
    data.repos.forEach((r) => {
      if (r.language) set.add(r.language);
    });
    return Array.from(set);
  }, [data?.repos]);

  const filteredRepos: GitHubRepoSummary[] = useMemo(() => {
    const repos = data?.repos ?? [];
    if (selectedLang === "ALL") return repos;
    return repos.filter((r) => r.language === selectedLang);
  }, [data?.repos, selectedLang]);

  const colors = COBALT_RAMPS[surface];
  const isLight = surface === "light";
  const cellSize = 11;
  const cellGap = 3.5;
  const step = cellSize + cellGap;
  const leftAxisW = 34;
  const topAxisH = 20;
  const colCount = Math.max(calendar.weeks.length, 53);
  const svgW = leftAxisW + colCount * step;
  const svgH = topAxisH + 7 * step + 2;

  const username = data?.username ?? PORTFOLIO_PROFILE.githubUsername;
  const profileUrl = data?.profileUrl ?? `https://github.com/${PORTFOLIO_PROFILE.githubUsername}`;

  return (
    <div
      ref={panelRef}
      id="github-works"
      className="mt-16 border-t border-black/12 pt-12 sm:mt-20 sm:pt-16"
    >
      {/* Section Sub-Header — Clean & Uncluttered */}
      <div className="reveal-up mb-6 sm:mb-8">
        <p className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-[#0038FF] uppercase sm:text-[11px] sm:tracking-[0.22em]">
          <span className="status-dot h-1.5 w-1.5 rounded-full bg-[#0038FF]" aria-hidden="true" />
          <span>GITHUB ACTIVITY // @{username.toUpperCase()} · LIVE SYNC</span>
        </p>
        <h3 className="mt-2 font-display text-[clamp(1.06rem,3.6vw,2.35rem)] leading-[1.04] font-extrabold tracking-tight text-[#0D0E12] uppercase">
          OPEN-SOURCE <span className="text-[#0038FF]">CONTRIBUTIONS</span> &amp; REPOS
        </h3>
      </div>

      {/* PART 1: GitHub Contribution Heatmap Matrix (Cobalt Theme Matching Concrete × Cobalt Aesthetic) */}
      <div
        className={`reveal-up min-w-0 overflow-hidden rounded-2xl border p-4 transition-colors duration-300 sm:p-6 ${
          isLight
            ? "border-black/12 bg-white/85 text-[#0D0E12] shadow-[0_16px_40px_-18px_rgba(13,14,18,0.12)]"
            : "border-black/20 bg-[#0B0E14] text-[#E6EDF3] shadow-[0_24px_54px_-18px_rgba(6,8,16,0.38)]"
        }`}
      >
        {/* Top Matrix Header */}
        <div
          className={`mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3.5 ${
            isLight ? "border-black/10" : "border-white/10"
          }`}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
            <a
              href={profileUrl}
              target="_blank"
              rel="noreferrer"
              className={`group inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors ${
                isLight
                  ? "text-[#0D0E12] hover:text-[#0038FF]"
                  : "text-white hover:text-[#6DA4FF]"
              }`}
            >
              <GitHubIcon className={`h-4 w-4 ${isLight ? "text-[#0038FF]" : "text-white/90"}`} />
              <span>@{username}</span>
              <ArrowUpRight className="h-3 w-3 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
            </a>
            <span
              className={`hidden font-mono text-[10px] sm:inline ${
                isLight ? "text-black/20" : "text-white/20"
              }`}
              aria-hidden="true"
            >
              ·
            </span>
            <span
              className={`font-mono text-[10px] tracking-[0.14em] uppercase ${
                isLight ? "text-[#505562]" : "text-white/55"
              }`}
            >
              {loading
                ? "SYNCING CONTRIBUTION GRAPH..."
                : `${(data?.totalContributions ?? 0).toLocaleString("en-US")} CONTRIBUTIONS IN THE LAST YEAR`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!loading && data && data.longestStreak > 0 && (
              <span
                className={`hidden rounded-md border px-2.5 py-1 font-mono text-[9.5px] tracking-[0.14em] uppercase sm:inline-flex ${
                  isLight
                    ? "border-black/10 bg-[#ECEEF0]/80 text-[#3A3F4B]"
                    : "border-white/12 bg-white/5 text-white/70"
                }`}
              >
                PEAK STREAK: {data.longestStreak}D · {data.activeDays} ACTIVE DAYS
              </span>
            )}

            {/* Surface Switch: Light Concrete Cobalt (Default) vs Dark Obsidian Cobalt */}
            <div
              role="group"
              aria-label="Contribution graph surface mode"
              className={`inline-flex items-center rounded-lg border p-0.5 font-mono text-[9px] tracking-[0.14em] uppercase ${
                isLight
                  ? "border-black/12 bg-[#ECEEF0]/85"
                  : "border-white/12 bg-white/[0.04]"
              }`}
            >
              <button
                type="button"
                onClick={() => setSurface("light")}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors ${
                  isLight
                    ? "bg-[#0038FF] font-semibold text-white"
                    : "text-white/55 hover:text-white"
                }`}
              >
                <span>LIGHT</span>
              </button>
              <button
                type="button"
                onClick={() => setSurface("dark")}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors ${
                  !isLight
                    ? "bg-[#0038FF] font-semibold text-white"
                    : "text-[#505562] hover:text-[#0D0E12]"
                }`}
              >
                <span>DARK</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable 53-Week SVG Heatmap (Zero overflow on 320px, edge-to-edge on desktop) */}
        <div
          ref={scrollWrapRef}
          className="no-scrollbar w-full overflow-x-auto pb-1"
        >
          {loading ? (
            <div
              aria-label="Loading GitHub contribution heatmap"
              className={`h-[132px] min-w-[660px] animate-pulse rounded-xl ${
                isLight ? "bg-black/[0.05]" : "bg-white/[0.04]"
              }`}
            />
          ) : calendar.weeks.length > 0 ? (
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              role="img"
              aria-label={`GitHub contribution graph for ${username} showing ${data?.totalContributions ?? 0} contributions in the last year`}
              className="block h-auto w-full min-w-[680px]"
              onMouseLeave={() => setHoveredDay(null)}
            >
              {/* Month Labels */}
              {calendar.monthLabels.map((m) => (
                <text
                  key={`${m.label}-${m.col}`}
                  x={leftAxisW + m.col * step}
                  y={12}
                  fill={isLight ? "#505562" : "#8B949E"}
                  fontSize="10"
                  fontFamily="var(--font-jetbrains-mono), ui-monospace, monospace"
                >
                  {m.label}
                </text>
              ))}

              {/* Weekday Labels (Mon, Wed, Fri) */}
              {[
                { label: "Mon", row: 1 },
                { label: "Wed", row: 3 },
                { label: "Fri", row: 5 },
              ].map((d) => (
                <text
                  key={d.label}
                  x={0}
                  y={topAxisH + d.row * step + 9}
                  fill={isLight ? "#505562" : "#8B949E"}
                  fontSize="10"
                  fontFamily="var(--font-jetbrains-mono), ui-monospace, monospace"
                >
                  {d.label}
                </text>
              ))}

              {/* 53 × 7 Contribution Cells */}
              {calendar.weeks.map((week, col) =>
                week.map((day, row) => {
                  if (!day) return null;
                  const isActive = hoveredDay?.date === day.date;
                  return (
                    <rect
                      key={day.date}
                      x={leftAxisW + col * step}
                      y={topAxisH + row * step}
                      width={cellSize}
                      height={cellSize}
                      rx={2.4}
                      ry={2.4}
                      fill={colors[day.level]}
                      stroke={
                        isActive
                          ? isLight
                            ? "#0D0E12"
                            : "#ffffff"
                          : isLight
                            ? day.level === 0
                              ? "rgba(13,14,18,0.06)"
                              : "rgba(0,56,255,0.14)"
                            : day.level === 0
                              ? "rgba(255,255,255,0.04)"
                              : "rgba(255,255,255,0.08)"
                      }
                      strokeWidth={isActive ? 1.25 : 0.6}
                      className="cursor-pointer transition-opacity duration-150 hover:opacity-85"
                      onMouseEnter={() => setHoveredDay(day)}
                      onClick={() => setHoveredDay(day)}
                    >
                      <title>{`${formatIsoDate(day.date)}: ${day.count} ${
                        day.count === 1 ? "contribution" : "contributions"
                      }`}</title>
                    </rect>
                  );
                })
              )}
            </svg>
          ) : (
            <div
              className={`flex h-[110px] items-center justify-center rounded-xl border font-mono text-xs ${
                isLight
                  ? "border-black/10 text-[#505562]"
                  : "border-white/10 text-white/55"
              }`}
            >
              Unable to reach GitHub contribution feed — visit github.com/{username} directly.
            </div>
          )}
        </div>

        {/* Footer Readout + Cobalt Intensity Legend */}
        <div
          className={`mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 font-mono text-[10px] tracking-[0.12em] ${
            isLight
              ? "border-black/10 text-[#505562]"
              : "border-white/8 text-[#8B949E]"
          }`}
        >
          <span className="min-w-0 truncate">
            {hoveredDay ? (
              <span className={isLight ? "text-[#0D0E12]" : "text-white"}>
                {formatIsoDate(hoveredDay.date).toUpperCase()} —{" "}
                <strong className={isLight ? "text-[#0038FF]" : "text-[#6da4ff]"}>
                  {hoveredDay.count} {hoveredDay.count === 1 ? "CONTRIBUTION" : "CONTRIBUTIONS"}
                </strong>
              </span>
            ) : (
              <span>Hover or tap any day cell · Swipe horizontally on compact screens</span>
            )}
          </span>

          <div className="inline-flex shrink-0 items-center gap-1.5">
            <span>Less</span>
            {colors.map((hex, idx) => (
              <span
                key={hex}
                className={`inline-block h-2.5 w-2.5 rounded-[2.5px] border ${
                  isLight ? "border-black/10" : "border-white/10"
                }`}
                style={{ backgroundColor: hex }}
                aria-label={`Intensity level ${idx}`}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      {/* PART 2: Live Public Repositories Grid (Auto-Synced from GitHub API) */}
      <div className="mt-8 sm:mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10px] tracking-[0.18em] text-[#505562] uppercase sm:text-[11px]">
            <span className="inline-flex items-center gap-2">
              <GitBranch className="h-3.5 w-3.5 text-[#0038FF]" />
              <span>PUBLIC REPOSITORIES</span>
            </span>
            {data && (
              <>
                <span className="text-black/20" aria-hidden="true">//</span>
                <span className="font-semibold text-[#0D0E12] tabular-nums">
                  {String(data.publicReposCount).padStart(2, "0")} PUBLIC
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {languages.length > 1 && (data?.repos.length ?? 0) > 4 && (
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9.5px] tracking-[0.12em] uppercase">
                {["ALL", ...languages].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedLang(lang)}
                    className={`rounded-md border px-2 py-1 transition-colors ${
                      selectedLang === lang
                        ? "border-[#0038FF] bg-[#0038FF] text-white"
                        : "border-black/12 bg-white/75 text-[#3A3F4B] hover:border-[#0038FF] hover:text-[#0038FF]"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}

            <a
              href={profileUrl}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white/80 px-3 py-1.5 whitespace-nowrap font-mono text-[9.5px] font-semibold tracking-[0.15em] text-[#0D0E12] uppercase transition-colors hover:border-[#0038FF] hover:bg-[#0038FF] hover:text-white sm:text-[10px]"
            >
              <GitHubIcon className="h-3 w-3" />
              <span className="text-trim">@{username}</span>
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="h-[172px] animate-pulse rounded-2xl border border-black/10 bg-white/60 p-5"
              />
            ))}
          </div>
        ) : filteredRepos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRepos.map((repo, idx) => {
              const langColor = repo.language
                ? LANGUAGE_COLORS[repo.language] ?? "#0038FF"
                : "#8B949E";

              return (
                <motion.div
                  key={repo.id}
                  initial={{ opacity: 0, y: 20, filter: "blur(5px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{
                    duration: 0.8,
                    delay: Math.min(idx * 0.12, 0.48),
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{ y: -4 }}
                  className="group relative flex min-w-0 flex-col justify-between rounded-2xl border border-black/12 bg-white/85 p-4 shadow-[0_12px_30px_-16px_rgba(13,14,18,0.1)] transition-all hover:border-[#0038FF]/40 hover:bg-white hover:shadow-[0_20px_40px_-16px_rgba(0,56,255,0.16)] sm:p-5"
                >
                  <div>
                    {/* Top Metadata Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[9.5px] tracking-[0.14em] uppercase">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0038FF]">
                          REPO {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="rounded border border-black/12 bg-[#ECEEF0] px-1.5 py-0.5 text-[8.5px] font-semibold text-[#3A3F4B]">
                          {repo.isFork ? "FORK" : "PUBLIC"}
                        </span>
                      </div>
                      <span className="text-[#505562]">
                        {formatPushedMonth(repo.pushedAt)}
                      </span>
                    </div>

                    {/* Repo Name + Corner Link Icon */}
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <a
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 break-words font-display text-base font-extrabold tracking-tight text-[#0D0E12] transition-colors group-hover:text-[#0038FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038FF] sm:text-lg"
                      >
                        {repo.name}
                      </a>

                      <a
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${repo.name} on GitHub`}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-black/12 text-[#0D0E12] transition-colors group-hover:border-[#0038FF] group-hover:bg-[#0038FF] group-hover:text-white"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    {/* Description */}
                    <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[#4B505E]">
                      {repo.description ||
                        "Public repository on GitHub — inspect source code, commits, and architecture."}
                    </p>

                    {/* Optional GitHub Topics */}
                    {repo.topics.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {repo.topics.map((topic) => (
                          <span
                            key={topic}
                            className="text-trim rounded bg-[#ECEEF0] px-2 py-0.5 font-mono text-[9.5px] tracking-[0.06em] text-[#242832]"
                          >
                            #{topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Language + Stars/Forks + Live Demo */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-3 font-mono text-[10px] tracking-[0.12em] text-[#505562]">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 text-[#0D0E12]">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: langColor }}
                          aria-hidden="true"
                        />
                        <span>{repo.language ?? "Markdown / Profile"}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Star className="h-3 w-3" />
                        {repo.stars}
                      </span>

                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <GitFork className="h-3 w-3" />
                        {repo.forks}
                      </span>
                    </div>

                    {repo.homepage ? (
                      <a
                        href={repo.homepage}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#0038FF] uppercase hover:underline"
                      >
                        <span>LIVE</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <a
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-[#0038FF] uppercase hover:underline"
                      >
                        CODE ↗
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-black/12 bg-white/75 p-6 font-mono text-xs text-[#505562]">
            No public repositories found right now — check{" "}
            <a
              href={profileUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#0038FF] underline"
            >
              github.com/{username}
            </a>
            .
          </div>
        )}
      </div>
    </div>
  );
}
