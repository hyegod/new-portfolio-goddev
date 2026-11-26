import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import type {
  PhotoBentoSize,
  PhotoCategory,
  PhotoGalleryItem,
  PhotoTone,
} from "@/data/portfolio";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import {
  deletePortfolioPhoto,
  extractBlobTargetForDelete,
  getBlobAuthOptions,
  getPortfolioPhotosStrict,
  isDatabaseConfigured,
  upsertPortfolioPhoto,
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

const VALID_CATEGORIES = new Set<PhotoCategory>([
  "STREET",
  "ARCHITECTURE",
  "LANDSCAPE",
  "STAGE",
  "MONOCHROME",
]);
const VALID_SIZES = new Set<PhotoBentoSize>(["hero", "wide", "tall", "square"]);
const VALID_TONES = new Set<PhotoTone>([
  "cobalt",
  "obsidian",
  "concrete",
  "amber",
  "slate",
]);

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ photos: [], dbConfigured: false });
  }

  try {
    const photos = await getPortfolioPhotosStrict();
    return NextResponse.json({ photos, dbConfigured: true });
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
    const raw = (await request.json()) as Partial<PhotoGalleryItem> & {
      sortOrder?: number;
    };

    const title = String(raw.title ?? "").trim();
    if (!title) {
      return NextResponse.json(
        { error: "Photo title is required." },
        { status: 400 }
      );
    }

    const id = slugify(String(raw.id || `photo-${title}`));
    if (!id) {
      return NextResponse.json({ error: "Invalid photo id." }, { status: 400 });
    }

    const catRaw = String(raw.category ?? "STREET").toUpperCase() as PhotoCategory;
    const category = VALID_CATEGORIES.has(catRaw) ? catRaw : "STREET";

    const sizeRaw = String(raw.bentoSize ?? "square").toLowerCase() as PhotoBentoSize;
    const bentoSize = VALID_SIZES.has(sizeRaw) ? sizeRaw : "square";

    const toneRaw = String(raw.tone ?? "obsidian").toLowerCase() as PhotoTone;
    const tone = VALID_TONES.has(toneRaw) ? toneRaw : "obsidian";

    const photo: PhotoGalleryItem = {
      id,
      frame: String(raw.frame ?? "01").trim().toUpperCase() || "01",
      title: title.toUpperCase(),
      description: String(raw.description ?? "").trim(),
      takenDate:
        String(raw.takenDate ?? "").trim() ||
        new Date().toISOString().slice(0, 10),
      location: String(raw.location ?? "").trim() || "Makassar, Indonesia",
      category,
      camera: String(raw.camera ?? "").trim() || undefined,
      bentoSize,
      tone,
      imageUrl:
        typeof raw.imageUrl === "string" && raw.imageUrl.trim()
          ? raw.imageUrl.trim()
          : null,
    };

    const saved = await upsertPortfolioPhoto(photo, raw.sortOrder);
    revalidatePortfolioPages();
    return NextResponse.json({ photo: saved });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save photo";
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
    return NextResponse.json({ error: "Missing photo id" }, { status: 400 });
  }

  try {
    const { deletedImageUrl } = await deletePortfolioPhoto(id);
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
    const message =
      err instanceof Error ? err.message : "Failed to delete photo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
