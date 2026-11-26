import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getBlobAuthOptions } from "@/lib/db";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return base.slice(0, 80) || "upload.jpg";
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blobAuth = getBlobAuthOptions();
  if (!blobAuth) {
    return NextResponse.json(
      {
        error:
          "Vercel Blob belum terhubung (tidak ditemukan BLOB_STORE_ID atau BLOB_READ_WRITE_TOKEN). Hubungkan Vercel Blob Store lalu redeploy.",
      },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folderRaw = String(formData.get("folder") ?? "gallery").trim();
    const folder = folderRaw === "projects" ? "projects" : "gallery";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Format tidak didukung. Gunakan JPG, PNG, WebP, AVIF, atau GIF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 10 MB." },
        { status: 400 }
      );
    }

    const safeName = sanitizeFilename(file.name);
    const pathname = `portfolio/${folder}/${safeName}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const authOpts = blobAuth.token
      ? { token: blobAuth.token }
      : { storeId: blobAuth.storeId };

    const primaryAccess = blobAuth.preferPrivate ? "private" : "public";
    const secondaryAccess = blobAuth.preferPrivate ? "public" : "private";

    let usedAccess: "public" | "private" = primaryAccess;
    let blob;
    try {
      blob = await put(pathname, fileBuffer, {
        ...authOpts,
        access: primaryAccess,
        addRandomSuffix: true,
        contentType: file.type,
      });
    } catch (firstErr) {
      // Auto-retry with opposite access mode when store visibility differs from env heuristic
      const msg = firstErr instanceof Error ? firstErr.message.toLowerCase() : "";
      if (msg.includes("private") || msg.includes("public") || msg.includes("access")) {
        usedAccess = secondaryAccess;
        blob = await put(pathname, fileBuffer, {
          ...authOpts,
          access: secondaryAccess,
          addRandomSuffix: true,
          contentType: file.type,
        });
      } else {
        throw firstErr;
      }
    }

    // Private stores cannot be embedded directly via <img>; serve via cached /api/blob route
    const displayUrl =
      usedAccess === "private"
        ? `/api/blob?path=${encodeURIComponent(blob.pathname)}`
        : blob.url;

    return NextResponse.json({
      url: displayUrl,
      pathname: blob.pathname,
      access: usedAccess,
      size: file.size,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload to Vercel Blob failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
