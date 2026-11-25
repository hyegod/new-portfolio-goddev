import { NextResponse } from "next/server";
import { PORTFOLIO_PROFILE } from "@/data/portfolio";

export interface GitHubContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface GitHubRepoSummary {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  homepage: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  updatedAt: string;
  pushedAt: string;
  isFork: boolean;
}

export interface GitHubTelemetryResponse {
  username: string;
  profileUrl: string;
  avatarUrl: string | null;
  publicReposCount: number;
  followers: number;
  totalContributions: number;
  activeDays: number;
  longestStreak: number;
  contributions: GitHubContributionDay[];
  repos: GitHubRepoSummary[];
  fetchedAt: string;
  source: "live" | "fallback";
}

interface RawGitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics?: string[];
  updated_at: string;
  pushed_at: string;
  fork: boolean;
  archived?: boolean;
  private?: boolean;
}

interface RawJogruberResponse {
  total?: Record<string, number>;
  contributions?: Array<{
    date: string;
    count: number;
    level: number;
  }>;
}

function clampLevel(lvl: number): 0 | 1 | 2 | 3 | 4 {
  if (lvl <= 0) return 0;
  if (lvl === 1) return 1;
  if (lvl === 2) return 2;
  if (lvl === 3) return 3;
  return 4;
}

function computeStats(days: GitHubContributionDay[]) {
  let activeDays = 0;
  let longestStreak = 0;
  let streak = 0;

  for (const day of days) {
    if (day.count > 0 || day.level > 0) {
      activeDays++;
      streak++;
      if (streak > longestStreak) longestStreak = streak;
    } else {
      streak = 0;
    }
  }

  return { activeDays, longestStreak };
}

/**
 * Fallback parser for GitHub's public contributions HTML fragment in case
 * the JSON contributions proxy is temporarily unavailable.
 */
async function fetchContributionsFromGitHubHtml(
  username: string
): Promise<{ total: number; days: GitHubContributionDay[] } | null> {
  try {
    const res = await fetch(
      `https://github.com/users/${encodeURIComponent(username)}/contributions`,
      {
        headers: {
          "User-Agent": "minimalist-portfolio-app",
          Accept: "text/html",
        },
        next: { revalidate: 1800 },
      }
    );
    if (!res.ok) return null;
    const html = await res.text();

    const totalMatch = html.match(/([\d,]+)\s+contributions?\s+in\s+the\s+last\s+year/i);
    const totalFromHeader = totalMatch
      ? Number.parseInt(totalMatch[1].replace(/,/g, ""), 10)
      : 0;

    // Extract td cells containing data-date and data-level
    const cellRegex =
      /data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="([0-4])"|data-level="([0-4])"[^>]*data-date="(\d{4}-\d{2}-\d{2})"/g;
    const map = new Map<string, 0 | 1 | 2 | 3 | 4>();
    let match: RegExpExecArray | null;
    while ((match = cellRegex.exec(html)) !== null) {
      const date = match[1] ?? match[4];
      const lvl = Number.parseInt(match[2] ?? match[3] ?? "0", 10);
      if (date) {
        map.set(date, clampLevel(lvl));
      }
    }

    if (map.size === 0) return null;

    const days: GitHubContributionDay[] = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, level]) => ({
        date,
        count: level === 0 ? 0 : level * 2,
        level,
      }));

    return {
      total: totalFromHeader || days.reduce((sum, d) => sum + d.count, 0),
      days,
    };
  } catch {
    return null;
  }
}

async function fetchContributions(
  username: string
): Promise<{ total: number; days: GitHubContributionDay[] } | null> {
  try {
    const res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last`,
      {
        headers: { "User-Agent": "minimalist-portfolio-app" },
        next: { revalidate: 1800 },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (res.ok) {
      const json = (await res.json()) as RawJogruberResponse;
      if (Array.isArray(json.contributions) && json.contributions.length > 0) {
        const days: GitHubContributionDay[] = json.contributions.map((d) => ({
          date: d.date,
          count: Number(d.count) || 0,
          level: clampLevel(Number(d.level) || 0),
        }));
        const total =
          typeof json.total?.lastYear === "number"
            ? json.total.lastYear
            : days.reduce((acc, d) => acc + d.count, 0);
        return { total, days };
      }
    }
  } catch {
    // Fall through to GitHub HTML parser
  }

  return fetchContributionsFromGitHubHtml(username);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("username")?.trim();
  const safeUsername =
    requested && /^[a-zA-Z0-9-]{1,39}$/.test(requested)
      ? requested
      : PORTFOLIO_PROFILE.githubUsername;

  const ghHeaders: Record<string, string> = {
    "User-Agent": "minimalist-portfolio-app",
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    ghHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const [userResult, reposResult, contribResult] = await Promise.allSettled([
    fetch(`https://api.github.com/users/${encodeURIComponent(safeUsername)}`, {
      headers: ghHeaders,
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(8000),
    }).then((r) => (r.ok ? r.json() : null)),
    fetch(
      `https://api.github.com/users/${encodeURIComponent(
        safeUsername
      )}/repos?sort=pushed&direction=desc&per_page=100&type=owner`,
      {
        headers: ghHeaders,
        next: { revalidate: 1800 },
        signal: AbortSignal.timeout(8000),
      }
    ).then((r) => (r.ok ? (r.json() as Promise<RawGitHubRepo[]>) : null)),
    fetchContributions(safeUsername),
  ]);

  const userData =
    userResult.status === "fulfilled" && userResult.value
      ? (userResult.value as {
          login?: string;
          html_url?: string;
          avatar_url?: string;
          public_repos?: number;
          followers?: number;
        })
      : null;

  const rawRepos =
    reposResult.status === "fulfilled" && Array.isArray(reposResult.value)
      ? reposResult.value
      : null;

  const contribData =
    contribResult.status === "fulfilled" ? contribResult.value : null;

  const repos: GitHubRepoSummary[] = (rawRepos ?? [])
    .filter((repo) => !repo.private && !repo.archived)
    .map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      htmlUrl: repo.html_url,
      homepage: repo.homepage && repo.homepage.trim() ? repo.homepage.trim() : null,
      language: repo.language,
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      topics: Array.isArray(repo.topics) ? repo.topics.slice(0, 4) : [],
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      isFork: Boolean(repo.fork),
    }));

  const contributions = contribData?.days ?? [];
  const totalContributions = contribData?.total ?? 0;
  const { activeDays, longestStreak } = computeStats(contributions);

  const payload: GitHubTelemetryResponse = {
    username: userData?.login ?? safeUsername,
    profileUrl: userData?.html_url ?? `https://github.com/${safeUsername}`,
    avatarUrl: userData?.avatar_url ?? null,
    publicReposCount: userData?.public_repos ?? repos.length,
    followers: userData?.followers ?? 0,
    totalContributions,
    activeDays,
    longestStreak,
    contributions,
    repos,
    fetchedAt: new Date().toISOString(),
    source: rawRepos !== null || contribData !== null ? "live" : "fallback",
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
    },
  });
}
