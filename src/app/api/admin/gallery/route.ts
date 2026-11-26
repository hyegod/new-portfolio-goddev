import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import type { GalleryPlate } from "@/data/portfolio";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import {
  deletePortfolioGalleryPlate,
  extractBlobTargetForDelete,
  getBlobAuthOptions,
  getPortfolioGalleryPlatesStrict,
  isDatabaseConfigured,
  upsertPortfolioGalleryPlate,
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
    return NextResponse.json({ plates: [], dbConfigured: false });
  }

  try {
    const plates = await getPortfolioGalleryPlatesStrict();
    return NextResponse.json({ plates, dbConfigured: true });
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
    const raw = (await request.json()) as Partial<GalleryPlate> & {
      sortOrder?: number;
    };

    const title = String(raw.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Gallery title is required." }, { status: 400 });
    }

    const id = slugify(String(raw.id || `plate-${title}`));
    if (!id) {
      return NextResponse.json({ error: "Invalid gallery id." }, { status: 400 });
    }

    const preset =
      raw.preset === "bridge" ||
      raw.preset === "tower" ||
      raw.preset === "terrain" ||
      raw.preset === "shell"
        ? raw.preset
        : "bridge";

    const filterGroup =
      raw.filterGroup === "STRUCTURAL" ||
      raw.filterGroup === "GEOSPATIAL" ||
      raw.filterGroup === "COMPUTATIONAL" ||
      raw.filterGroup === "SOFTWARE"
        ? raw.filterGroup
        : "STRUCTURAL";

    const visualType =
      raw.visualType === "bridge-elevation" ||
      raw.visualType === "tower-section" ||
      raw.visualType === "lidar-contour" ||
      raw.visualType === "shell-grid" ||
      raw.visualType === "rebar-detail" ||
      raw.visualType === "bim-pipeline"
        ? raw.visualType
        : "bridge-elevation";

    const plate: GalleryPlate = {
      id,
      code: String(raw.code ?? "FIG. NEW").trim().toUpperCase(),
      title: title.toUpperCase(),
      category: String(raw.category ?? filterGroup).trim().toUpperCase(),
      filterGroup,
      scale: String(raw.scale ?? "PHOTO / PLATE").trim().toUpperCase(),
      coords: String(raw.coords ?? "-5.1477° S, 119.4327° E").trim().toUpperCase(),
      year: String(raw.year ?? new Date().getFullYear()).trim(),
      preset,
      visualType,
      caption: String(raw.caption ?? "").trim(),
      imageUrl:
        typeof raw.imageUrl === "string" && raw.imageUrl.trim()
          ? raw.imageUrl.trim()
          : null,
    };

    const saved = await upsertPortfolioGalleryPlate(plate, raw.sortOrder);
    revalidatePortfolioPages();
    return NextResponse.json({ plate: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save gallery item";
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
    return NextResponse.json({ error: "Missing gallery plate id" }, { status: 400 });
  }

  try {
    const { deletedImageUrl } = await deletePortfolioGalleryPlate(id);
    const blobAuth = getBlobAuthOptions();
    const blobTarget = deletedImageUrl
      ? extractBlobTargetForDelete(deletedImageUrl)
      : null;
    if (blobTarget && blobAuth) {
      const authOpts = blobAuth.token
        ? { token: blobAuth.token }
        : { storeId: blobAuth.storeId };
      await del(blobTarget, authOpts).catch(() => {});
    }
    revalidatePortfolioPages();
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete gallery item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
