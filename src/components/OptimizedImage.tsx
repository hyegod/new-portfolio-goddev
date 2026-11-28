"use client";

import Image from "next/image";

const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/**
 * Determines whether an image URL can safely go through Next.js 16 Image Optimization
 * (AVIF/WebP transcoding + responsive srcset + 31-day CDN caching) without ever throwing
 * an unconfigured-host runtime error on arbitrary external links or inline data URLs.
 */
function isNextImageOptimizable(src: string): boolean {
  const trimmed = src.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return false;

  const lowerPath = trimmed.split("?")[0]?.toLowerCase() ?? "";
  if (lowerPath.endsWith(".svg") || lowerPath.endsWith(".gif")) return false;

  // Local Vercel Blob proxy route (/api/blob?path=...) allowed via images.localPatterns
  if (trimmed.startsWith("/api/blob?")) return true;

  // Static local files under /public (without unexpected query strings)
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("?")) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(BLOB_HOST_SUFFIX)
    );
  } catch {
    return false;
  }
}

export interface OptimizedImageProps {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  quality?: 75 | 85;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  decoding?: "async" | "sync" | "auto";
}

/**
 * Drop-in responsive fill image component. Uses `next/image` (AVIF/WebP + srcset)
 * for all Vercel Blob & local media, and falls back gracefully to native lazy `<img>`
 * for arbitrary external URLs, SVGs, or animated GIFs.
 * Parent element must be positioned (`relative`, `absolute`, or `fixed`) with explicit dimensions.
 */
export function OptimizedImage({
  src,
  alt,
  sizes,
  className = "object-cover",
  quality = 75,
  loading = "lazy",
  fetchPriority,
  decoding = "async",
}: OptimizedImageProps) {
  if (isNextImageOptimizable(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        quality={quality}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding={decoding}
        className={className}
      />
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding={decoding}
      className={`absolute inset-0 h-full w-full ${className}`}
    />
  );
}
