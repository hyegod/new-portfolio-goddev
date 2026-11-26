import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import {
  GALLERY_PLATES,
  PHOTO_GALLERY,
  PROJECTS,
  type GalleryPlate,
  type PhotoBentoSize,
  type PhotoCategory,
  type PhotoGalleryItem,
  type PhotoTone,
  type PointPresetId,
  type ProjectArchitectureBlock,
  type ProjectItem,
} from "@/data/portfolio";

let cachedSql: NeonQueryFunction<false, false> | null = null;
let tablesReady = false;

export interface BlobAuthOptions {
  token?: string;
  storeId?: string;
  preferPrivate: boolean;
}

export function getDatabaseUrl(): string | null {
  const direct =
    process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();
  if (direct) return direct;

  for (const [key, raw] of Object.entries(process.env)) {
    const val = raw?.trim();
    if (!val) continue;
    if (
      (key.endsWith("_DATABASE_URL") || key.endsWith("_POSTGRES_URL")) &&
      (val.startsWith("postgres://") || val.startsWith("postgresql://"))
    ) {
      return val;
    }
  }
  return null;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

/**
 * Supports modern Vercel Blob OIDC (`BLOB_STORE_ID` — default for Private stores),
 * classic read-write tokens (`BLOB_READ_WRITE_TOKEN`), and custom Storage prefixes.
 */
export function getBlobAuthOptions(): BlobAuthOptions | null {
  const directStoreId = process.env.BLOB_STORE_ID?.trim();
  const directToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const hasOidcRuntime = Boolean(
    process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL
  );

  if (directStoreId && (hasOidcRuntime || !directToken)) {
    return { storeId: directStoreId, preferPrivate: true };
  }
  if (directToken) {
    return { token: directToken, preferPrivate: Boolean(directStoreId) };
  }

  for (const [key, raw] of Object.entries(process.env)) {
    const val = raw?.trim();
    if (!val) continue;
    if (key.endsWith("_STORE_ID") && val.startsWith("store_")) {
      return { storeId: val, preferPrivate: true };
    }
    if (key.endsWith("_READ_WRITE_TOKEN") && val.startsWith("vercel_blob_rw_")) {
      return { token: val, preferPrivate: false };
    }
  }

  return null;
}

export function isBlobConfigured(): boolean {
  return Boolean(getBlobAuthOptions());
}

export function extractBlobTargetForDelete(imageUrl: string): string | null {
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;
  if (trimmed.includes(".blob.vercel-storage.com")) {
    return trimmed;
  }
  if (trimmed.startsWith("/api/blob?")) {
    try {
      const parsed = new URL(trimmed, "https://local.invalid");
      const pathname = parsed.searchParams.get("path")?.trim();
      if (pathname && pathname.startsWith("portfolio/")) {
        return pathname;
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Lazy Neon SQL initializer — safe at build time when DATABASE_URL is not yet provisioned.
 */
export function getSql(): NeonQueryFunction<false, false> | null {
  const url = getDatabaseUrl();
  if (!url) return null;
  if (!cachedSql) {
    cachedSql = neon(url);
  }
  return cachedSql;
}

export async function ensurePortfolioTables(): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  if (tablesReady) return true;

  await sql`
    CREATE TABLE IF NOT EXISTS portfolio_projects (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      index_label TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      category TEXT NOT NULL,
      discipline TEXT NOT NULL,
      year TEXT NOT NULL,
      role TEXT NOT NULL,
      client TEXT NOT NULL,
      duration TEXT NOT NULL,
      preset TEXT NOT NULL DEFAULT 'bridge',
      accent TEXT NOT NULL DEFAULT 'cobalt',
      summary TEXT NOT NULL,
      challenge TEXT NOT NULL,
      outcome TEXT NOT NULL,
      deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
      architecture_highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
      metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
      stack JSONB NOT NULL DEFAULT '[]'::jsonb,
      live_url TEXT NOT NULL DEFAULT '/gallery?preset=bridge',
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS portfolio_gallery_plates (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      filter_group TEXT NOT NULL DEFAULT 'STRUCTURAL',
      scale TEXT NOT NULL,
      coords TEXT NOT NULL,
      year TEXT NOT NULL,
      preset TEXT NOT NULL DEFAULT 'bridge',
      visual_type TEXT NOT NULL DEFAULT 'bridge-elevation',
      caption TEXT NOT NULL,
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS portfolio_photos (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      frame_label TEXT NOT NULL DEFAULT '01',
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      taken_date TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'STREET',
      camera TEXT NOT NULL DEFAULT '',
      bento_size TEXT NOT NULL DEFAULT 'square',
      tone TEXT NOT NULL DEFAULT 'obsidian',
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  tablesReady = true;
  return true;
}

function parseJsonArray<T>(raw: unknown, fallback: T[]): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

const VALID_PRESETS: PointPresetId[] = ["bridge", "tower", "terrain", "shell"];
const VALID_DISCIPLINES: ProjectItem["discipline"][] = [
  "STRUCTURAL / WEBGL",
  "CIVIL × SOFTWARE",
  "COMPUTATIONAL BIM",
  "SOFTWARE / GIS",
];
const VALID_FILTER_GROUPS: GalleryPlate["filterGroup"][] = [
  "STRUCTURAL",
  "GEOSPATIAL",
  "COMPUTATIONAL",
  "SOFTWARE",
];
const VALID_VISUAL_TYPES: GalleryPlate["visualType"][] = [
  "bridge-elevation",
  "tower-section",
  "lidar-contour",
  "shell-grid",
  "rebar-detail",
  "bim-pipeline",
];
const VALID_PHOTO_CATEGORIES: PhotoCategory[] = [
  "STREET",
  "ARCHITECTURE",
  "LANDSCAPE",
  "STAGE",
  "MONOCHROME",
];
const VALID_BENTO_SIZES: PhotoBentoSize[] = ["hero", "wide", "tall", "square"];
const VALID_PHOTO_TONES: PhotoTone[] = [
  "cobalt",
  "obsidian",
  "concrete",
  "amber",
  "slate",
];

function mapProjectRow(row: Record<string, unknown>): ProjectItem {
  const presetRaw = String(row.preset ?? "bridge") as PointPresetId;
  const preset = VALID_PRESETS.includes(presetRaw) ? presetRaw : "bridge";
  const discRaw = String(row.discipline ?? "CIVIL × SOFTWARE") as ProjectItem["discipline"];
  const discipline = VALID_DISCIPLINES.includes(discRaw) ? discRaw : "CIVIL × SOFTWARE";

  return {
    id: String(row.id),
    index: String(row.index_label ?? "01"),
    title: String(row.title ?? ""),
    subtitle: String(row.subtitle ?? ""),
    category: String(row.category ?? discipline),
    discipline,
    year: String(row.year ?? "2026"),
    role: String(row.role ?? "Civil & Software Developer"),
    client: String(row.client ?? "Independent R&D"),
    duration: String(row.duration ?? "2 MONTHS"),
    preset,
    accent: String(row.accent) === "pink" ? "pink" : "cobalt",
    summary: String(row.summary ?? ""),
    challenge: String(row.challenge ?? ""),
    outcome: String(row.outcome ?? ""),
    deliverables: parseJsonArray<string>(row.deliverables, []),
    architectureHighlights: parseJsonArray<ProjectArchitectureBlock>(
      row.architecture_highlights,
      []
    ),
    metrics: parseJsonArray<{ label: string; value: string }>(row.metrics, []),
    stack: parseJsonArray<string>(row.stack, []),
    liveUrl: String(row.live_url ?? `/works?preset=${preset}#lab`),
    imageUrl: typeof row.image_url === "string" && row.image_url.trim() ? row.image_url : null,
  };
}

function mapPhotoRow(row: Record<string, unknown>): PhotoGalleryItem {
  const catRaw = String(row.category ?? "STREET").toUpperCase() as PhotoCategory;
  const category = VALID_PHOTO_CATEGORIES.includes(catRaw) ? catRaw : "STREET";
  const sizeRaw = String(row.bento_size ?? "square").toLowerCase() as PhotoBentoSize;
  const bentoSize = VALID_BENTO_SIZES.includes(sizeRaw) ? sizeRaw : "square";
  const toneRaw = String(row.tone ?? "obsidian").toLowerCase() as PhotoTone;
  const tone = VALID_PHOTO_TONES.includes(toneRaw) ? toneRaw : "obsidian";
  const cameraStr = typeof row.camera === "string" ? row.camera.trim() : "";

  return {
    id: String(row.id),
    frame: String(row.frame_label ?? "01"),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    takenDate: String(row.taken_date ?? ""),
    location: String(row.location ?? ""),
    category,
    camera: cameraStr || undefined,
    bentoSize,
    tone,
    imageUrl:
      typeof row.image_url === "string" && row.image_url.trim()
        ? row.image_url
        : null,
  };
}

function mapGalleryRow(row: Record<string, unknown>): GalleryPlate {
  const presetRaw = String(row.preset ?? "bridge") as PointPresetId;
  const preset = VALID_PRESETS.includes(presetRaw) ? presetRaw : "bridge";
  const fgRaw = String(row.filter_group ?? "STRUCTURAL") as GalleryPlate["filterGroup"];
  const filterGroup = VALID_FILTER_GROUPS.includes(fgRaw) ? fgRaw : "STRUCTURAL";
  const vtRaw = String(row.visual_type ?? "bridge-elevation") as GalleryPlate["visualType"];
  const visualType = VALID_VISUAL_TYPES.includes(vtRaw) ? vtRaw : "bridge-elevation";

  return {
    id: String(row.id),
    code: String(row.code ?? "FIG. 01"),
    title: String(row.title ?? ""),
    category: String(row.category ?? filterGroup),
    filterGroup,
    scale: String(row.scale ?? "SCALE 1:100"),
    coords: String(row.coords ?? "-5.1477° S, 119.4327° E"),
    year: String(row.year ?? "2026"),
    preset,
    visualType,
    caption: String(row.caption ?? ""),
    imageUrl: typeof row.image_url === "string" && row.image_url.trim() ? row.image_url : null,
  };
}

export async function getPortfolioProjects(): Promise<ProjectItem[]> {
  const sql = getSql();
  if (!sql) return PROJECTS;

  try {
    await ensurePortfolioTables();
    const rows = await sql`
      SELECT * FROM portfolio_projects
      ORDER BY sort_order ASC, created_at DESC
    `;
    if (!Array.isArray(rows) || rows.length === 0) {
      return PROJECTS;
    }
    return rows.map((row) => mapProjectRow(row as Record<string, unknown>));
  } catch {
    return PROJECTS;
  }
}

export async function getPortfolioProjectsStrict(): Promise<ProjectItem[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensurePortfolioTables();
  const rows = await sql`
    SELECT * FROM portfolio_projects
    ORDER BY sort_order ASC, created_at DESC
  `;
  return rows.map((row) => mapProjectRow(row as Record<string, unknown>));
}

export async function getPortfolioProjectBySlug(
  slug: string
): Promise<ProjectItem | undefined> {
  const list = await getPortfolioProjects();
  return list.find((p) => p.id === slug);
}

export async function getPortfolioGalleryPlates(): Promise<GalleryPlate[]> {
  const sql = getSql();
  if (!sql) return GALLERY_PLATES;

  try {
    await ensurePortfolioTables();
    const rows = await sql`
      SELECT * FROM portfolio_gallery_plates
      ORDER BY sort_order ASC, created_at DESC
    `;
    if (!Array.isArray(rows) || rows.length === 0) {
      return GALLERY_PLATES;
    }
    return rows.map((row) => mapGalleryRow(row as Record<string, unknown>));
  } catch {
    return GALLERY_PLATES;
  }
}

export async function getPortfolioGalleryPlatesStrict(): Promise<GalleryPlate[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensurePortfolioTables();
  const rows = await sql`
    SELECT * FROM portfolio_gallery_plates
    ORDER BY sort_order ASC, created_at DESC
  `;
  return rows.map((row) => mapGalleryRow(row as Record<string, unknown>));
}

export async function getPortfolioPhotos(): Promise<PhotoGalleryItem[]> {
  const sql = getSql();
  if (!sql) return PHOTO_GALLERY;

  try {
    await ensurePortfolioTables();
    const rows = await sql`
      SELECT * FROM portfolio_photos
      ORDER BY sort_order ASC, created_at DESC
    `;
    if (!Array.isArray(rows) || rows.length === 0) {
      return PHOTO_GALLERY;
    }
    return rows.map((row) => mapPhotoRow(row as Record<string, unknown>));
  } catch {
    return PHOTO_GALLERY;
  }
}

export async function getPortfolioPhotosStrict(): Promise<PhotoGalleryItem[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensurePortfolioTables();
  const rows = await sql`
    SELECT * FROM portfolio_photos
    ORDER BY sort_order ASC, created_at DESC
  `;
  return rows.map((row) => mapPhotoRow(row as Record<string, unknown>));
}

export async function upsertPortfolioPhoto(
  item: PhotoGalleryItem,
  sortOrder?: number
): Promise<PhotoGalleryItem> {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured");
  await ensurePortfolioTables();

  const orderVal =
    typeof sortOrder === "number" && Number.isFinite(sortOrder)
      ? sortOrder
      : Number.parseInt(item.frame, 10) || 10;

  const rows = await sql`
    INSERT INTO portfolio_photos (
      id, sort_order, frame_label, title, description, taken_date, location,
      category, camera, bento_size, tone, image_url, updated_at
    )
    VALUES (
      ${item.id}, ${orderVal}, ${item.frame}, ${item.title}, ${item.description},
      ${item.takenDate}, ${item.location}, ${item.category}, ${item.camera ?? ""},
      ${item.bentoSize}, ${item.tone ?? "obsidian"}, ${item.imageUrl ?? null}, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      sort_order = EXCLUDED.sort_order,
      frame_label = EXCLUDED.frame_label,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      taken_date = EXCLUDED.taken_date,
      location = EXCLUDED.location,
      category = EXCLUDED.category,
      camera = EXCLUDED.camera,
      bento_size = EXCLUDED.bento_size,
      tone = EXCLUDED.tone,
      image_url = EXCLUDED.image_url,
      updated_at = NOW()
    RETURNING *
  `;

  return mapPhotoRow(rows[0] as Record<string, unknown>);
}

export async function deletePortfolioPhoto(
  id: string
): Promise<{ deletedImageUrl: string | null }> {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured");
  await ensurePortfolioTables();

  const rows = await sql`
    DELETE FROM portfolio_photos
    WHERE id = ${id}
    RETURNING image_url
  `;
  const url = rows[0]?.image_url;
  return { deletedImageUrl: typeof url === "string" ? url : null };
}

export async function seedDefaultPortfolioData(): Promise<{
  projectsInserted: number;
  platesInserted: number;
  photosInserted: number;
}> {
  const sql = getSql();
  if (!sql) {
    throw new Error("DATABASE_URL is not configured");
  }
  await ensurePortfolioTables();

  let projectsInserted = 0;
  for (let i = 0; i < PROJECTS.length; i++) {
    const p = PROJECTS[i];
    const res = await sql`
      INSERT INTO portfolio_projects (
        id, sort_order, index_label, title, subtitle, category, discipline,
        year, role, client, duration, preset, accent, summary, challenge, outcome,
        deliverables, architecture_highlights, metrics, stack, live_url, image_url
      )
      VALUES (
        ${p.id}, ${i + 1}, ${p.index}, ${p.title}, ${p.subtitle}, ${p.category},
        ${p.discipline}, ${p.year}, ${p.role}, ${p.client}, ${p.duration},
        ${p.preset}, ${p.accent}, ${p.summary}, ${p.challenge}, ${p.outcome},
        ${JSON.stringify(p.deliverables)}::jsonb,
        ${JSON.stringify(p.architectureHighlights)}::jsonb,
        ${JSON.stringify(p.metrics)}::jsonb,
        ${JSON.stringify(p.stack)}::jsonb,
        ${p.liveUrl}, ${p.imageUrl ?? null}
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;
    if (res.length > 0) projectsInserted++;
  }

  let platesInserted = 0;
  for (let i = 0; i < GALLERY_PLATES.length; i++) {
    const g = GALLERY_PLATES[i];
    const res = await sql`
      INSERT INTO portfolio_gallery_plates (
        id, sort_order, code, title, category, filter_group, scale, coords,
        year, preset, visual_type, caption, image_url
      )
      VALUES (
        ${g.id}, ${i + 1}, ${g.code}, ${g.title}, ${g.category}, ${g.filterGroup},
        ${g.scale}, ${g.coords}, ${g.year}, ${g.preset}, ${g.visualType},
        ${g.caption}, ${g.imageUrl ?? null}
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;
    if (res.length > 0) platesInserted++;
  }

  let photosInserted = 0;
  for (let i = 0; i < PHOTO_GALLERY.length; i++) {
    const ph = PHOTO_GALLERY[i];
    const res = await sql`
      INSERT INTO portfolio_photos (
        id, sort_order, frame_label, title, description, taken_date, location,
        category, camera, bento_size, tone, image_url
      )
      VALUES (
        ${ph.id}, ${i + 1}, ${ph.frame}, ${ph.title}, ${ph.description},
        ${ph.takenDate}, ${ph.location}, ${ph.category}, ${ph.camera ?? ""},
        ${ph.bentoSize}, ${ph.tone ?? "obsidian"}, ${ph.imageUrl ?? null}
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;
    if (res.length > 0) photosInserted++;
  }

  return { projectsInserted, platesInserted, photosInserted };
}

export async function upsertPortfolioProject(
  p: ProjectItem,
  sortOrder?: number
): Promise<ProjectItem> {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured");
  await ensurePortfolioTables();

  const orderVal =
    typeof sortOrder === "number" && Number.isFinite(sortOrder)
      ? sortOrder
      : Number.parseInt(p.index, 10) || 10;

  const rows = await sql`
    INSERT INTO portfolio_projects (
      id, sort_order, index_label, title, subtitle, category, discipline,
      year, role, client, duration, preset, accent, summary, challenge, outcome,
      deliverables, architecture_highlights, metrics, stack, live_url, image_url, updated_at
    )
    VALUES (
      ${p.id}, ${orderVal}, ${p.index}, ${p.title}, ${p.subtitle}, ${p.category},
      ${p.discipline}, ${p.year}, ${p.role}, ${p.client}, ${p.duration},
      ${p.preset}, ${p.accent}, ${p.summary}, ${p.challenge}, ${p.outcome},
      ${JSON.stringify(p.deliverables)}::jsonb,
      ${JSON.stringify(p.architectureHighlights)}::jsonb,
      ${JSON.stringify(p.metrics)}::jsonb,
      ${JSON.stringify(p.stack)}::jsonb,
      ${p.liveUrl}, ${p.imageUrl ?? null}, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      sort_order = EXCLUDED.sort_order,
      index_label = EXCLUDED.index_label,
      title = EXCLUDED.title,
      subtitle = EXCLUDED.subtitle,
      category = EXCLUDED.category,
      discipline = EXCLUDED.discipline,
      year = EXCLUDED.year,
      role = EXCLUDED.role,
      client = EXCLUDED.client,
      duration = EXCLUDED.duration,
      preset = EXCLUDED.preset,
      accent = EXCLUDED.accent,
      summary = EXCLUDED.summary,
      challenge = EXCLUDED.challenge,
      outcome = EXCLUDED.outcome,
      deliverables = EXCLUDED.deliverables,
      architecture_highlights = EXCLUDED.architecture_highlights,
      metrics = EXCLUDED.metrics,
      stack = EXCLUDED.stack,
      live_url = EXCLUDED.live_url,
      image_url = EXCLUDED.image_url,
      updated_at = NOW()
    RETURNING *
  `;

  return mapProjectRow(rows[0] as Record<string, unknown>);
}

export async function deletePortfolioProject(
  id: string
): Promise<{ deletedImageUrl: string | null }> {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured");
  await ensurePortfolioTables();

  const rows = await sql`
    DELETE FROM portfolio_projects
    WHERE id = ${id}
    RETURNING image_url
  `;
  const url = rows[0]?.image_url;
  return { deletedImageUrl: typeof url === "string" ? url : null };
}

export async function upsertPortfolioGalleryPlate(
  g: GalleryPlate,
  sortOrder?: number
): Promise<GalleryPlate> {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured");
  await ensurePortfolioTables();

  const orderVal =
    typeof sortOrder === "number" && Number.isFinite(sortOrder) ? sortOrder : 10;

  const rows = await sql`
    INSERT INTO portfolio_gallery_plates (
      id, sort_order, code, title, category, filter_group, scale, coords,
      year, preset, visual_type, caption, image_url, updated_at
    )
    VALUES (
      ${g.id}, ${orderVal}, ${g.code}, ${g.title}, ${g.category}, ${g.filterGroup},
      ${g.scale}, ${g.coords}, ${g.year}, ${g.preset}, ${g.visualType},
      ${g.caption}, ${g.imageUrl ?? null}, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      sort_order = EXCLUDED.sort_order,
      code = EXCLUDED.code,
      title = EXCLUDED.title,
      category = EXCLUDED.category,
      filter_group = EXCLUDED.filter_group,
      scale = EXCLUDED.scale,
      coords = EXCLUDED.coords,
      year = EXCLUDED.year,
      preset = EXCLUDED.preset,
      visual_type = EXCLUDED.visual_type,
      caption = EXCLUDED.caption,
      image_url = EXCLUDED.image_url,
      updated_at = NOW()
    RETURNING *
  `;

  return mapGalleryRow(rows[0] as Record<string, unknown>);
}

export async function deletePortfolioGalleryPlate(
  id: string
): Promise<{ deletedImageUrl: string | null }> {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured");
  await ensurePortfolioTables();

  const rows = await sql`
    DELETE FROM portfolio_gallery_plates
    WHERE id = ${id}
    RETURNING image_url
  `;
  const url = rows[0]?.image_url;
  return { deletedImageUrl: typeof url === "string" ? url : null };
}

export async function getStorageStatus() {
  const dbConfigured = isDatabaseConfigured();
  const blobConfigured = isBlobConfigured();
  let dbConnected = false;
  let projectCount = 0;
  let plateCount = 0;
  let photoCount = 0;

  if (dbConfigured) {
    try {
      const sql = getSql();
      if (sql) {
        await ensurePortfolioTables();
        const [pRows, gRows, phRows] = await Promise.all([
          sql`SELECT COUNT(*)::int AS count FROM portfolio_projects`,
          sql`SELECT COUNT(*)::int AS count FROM portfolio_gallery_plates`,
          sql`SELECT COUNT(*)::int AS count FROM portfolio_photos`,
        ]);
        dbConnected = true;
        projectCount = Number(pRows[0]?.count ?? 0);
        plateCount = Number(gRows[0]?.count ?? 0);
        photoCount = Number(phRows[0]?.count ?? 0);
      }
    } catch {
      dbConnected = false;
    }
  }

  return {
    dbConfigured,
    dbConnected,
    blobConfigured,
    projectCount,
    plateCount,
    photoCount,
  };
}
