import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import type { ProjectItem } from "@/data/portfolio";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import {
  deletePortfolioProject,
  getPortfolioProjectsStrict,
  isBlobConfigured,
  isDatabaseConfigured,
  upsertPortfolioProject,
} from "@/lib/db";
import { revalidatePortfolioPages } from "@/lib/revalidate";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ projects: [], dbConfigured: false });
  }

  try {
    const projects = await getPortfolioProjectsStrict();
    return NextResponse.json({ projects, dbConfigured: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database query failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL belum terhubung di Vercel Storage." },
      { status: 503 }
    );
  }

  try {
    const raw = (await request.json()) as Partial<ProjectItem> & {
      sortOrder?: number;
    };

    const title = String(raw.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Project title is required." }, { status: 400 });
    }

    const id = slugify(String(raw.id || title));
    if (!id) {
      return NextResponse.json({ error: "Invalid project slug." }, { status: 400 });
    }

    const preset =
      raw.preset === "bridge" ||
      raw.preset === "tower" ||
      raw.preset === "terrain" ||
      raw.preset === "shell"
        ? raw.preset
        : "bridge";

    const discipline =
      raw.discipline === "STRUCTURAL / WEBGL" ||
      raw.discipline === "CIVIL × SOFTWARE" ||
      raw.discipline === "COMPUTATIONAL BIM" ||
      raw.discipline === "SOFTWARE / GIS"
        ? raw.discipline
        : "CIVIL × SOFTWARE";

    const project: ProjectItem = {
      id,
      index: String(raw.index ?? "01").trim() || "01",
      title: title.toUpperCase(),
      subtitle: String(raw.subtitle ?? "").trim() || title,
      category: String(raw.category ?? discipline).trim().toUpperCase(),
      discipline,
      year: String(raw.year ?? new Date().getFullYear()).trim(),
      role: String(raw.role ?? "Civil & Software Developer").trim(),
      client: String(raw.client ?? "Independent Build").trim(),
      duration: String(raw.duration ?? "2 MONTHS").trim().toUpperCase(),
      preset,
      accent: raw.accent === "pink" ? "pink" : "cobalt",
      summary: String(raw.summary ?? "").trim(),
      challenge:
        String(raw.challenge ?? "").trim() ||
        "Engineered to solve real-world workflow bottlenecks with clean architecture and responsive 3D/web performance.",
      outcome:
        String(raw.outcome ?? "").trim() ||
        "Shipped a fast, maintainable system built for real production use across desktop and mobile devices.",
      deliverables: Array.isArray(raw.deliverables)
        ? raw.deliverables.map((s) => String(s).trim()).filter(Boolean)
        : [],
      architectureHighlights: Array.isArray(raw.architectureHighlights)
        ? raw.architectureHighlights
            .map((b, i) => ({
              code: String(b?.code || `ARC 0${i + 1}`).trim().toUpperCase(),
              title: String(b?.title || "").trim(),
              detail: String(b?.detail || "").trim(),
            }))
            .filter((b) => b.title.length > 0)
        : [],
      metrics: Array.isArray(raw.metrics)
        ? raw.metrics
            .map((m) => ({
              label: String(m?.label || "").trim().toUpperCase(),
              value: String(m?.value || "").trim().toUpperCase(),
            }))
            .filter((m) => m.label.length > 0 && m.value.length > 0)
        : [],
      stack: Array.isArray(raw.stack)
        ? raw.stack.map((s) => String(s).trim()).filter(Boolean)
        : [],
      liveUrl: String(raw.liveUrl ?? "").trim() || `/gallery?preset=${preset}`,
      imageUrl:
        typeof raw.imageUrl === "string" && raw.imageUrl.trim()
          ? raw.imageUrl.trim()
          : null,
    };

    const saved = await upsertPortfolioProject(project, raw.sortOrder);
    revalidatePortfolioPages(saved.id);
    return NextResponse.json({ project: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL belum terhubung di Vercel Storage." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing project id" }, { status: 400 });
  }

  try {
    const { deletedImageUrl } = await deletePortfolioProject(id);
    if (
      deletedImageUrl &&
      isBlobConfigured() &&
      deletedImageUrl.includes(".blob.vercel-storage.com")
    ) {
      await del(deletedImageUrl).catch(() => {});
    }
    revalidatePortfolioPages(id);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
