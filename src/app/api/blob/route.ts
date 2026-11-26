import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getBlobAuthOptions } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawPath = searchParams.get("path")?.trim() ?? "";

  // Strictly limit delivery to uploaded portfolio media pathnames
  if (
    !rawPath.startsWith("portfolio/") ||
    rawPath.includes("..") ||
    rawPath.includes("\\") ||
    rawPath.length > 260
  ) {
    return NextResponse.json({ error: "Invalid blob pathname" }, { status: 400 });
  }

  const blobAuth = getBlobAuthOptions();
  if (!blobAuth) {
    return NextResponse.json(
      { error: "Blob storage not configured" },
      { status: 503 }
    );
  }

  const ifNoneMatch = request.headers.get("if-none-match") ?? undefined;
  const authOpts = blobAuth.token
    ? { token: blobAuth.token }
    : { storeId: blobAuth.storeId };

  const primaryAccess = blobAuth.preferPrivate ? "private" : "public";
  const secondaryAccess = blobAuth.preferPrivate ? "public" : "private";

  try {
    let result = await get(rawPath, {
      ...authOpts,
      access: primaryAccess,
      ifNoneMatch,
    }).catch(() => null);

    if (!result) {
      result = await get(rawPath, {
        ...authOpts,
        access: secondaryAccess,
        ifNoneMatch,
      }).catch(() => null);
    }

    if (!result) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    return new NextResponse(result.stream, {
      status: 200,
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        ETag: result.blob.etag,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to stream blob" },
      { status: 500 }
    );
  }
}
