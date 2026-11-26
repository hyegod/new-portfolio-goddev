import type { NextConfig } from "next";
import { wgslTurbopackRule } from "@vgpu/wgsl/next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  allowedDevOrigins: ["10.225.194.225"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.wgsl": wgslTurbopackRule({ minify: true }),
    },
  },
  experimental: {
    optimizePackageImports: ["motion/react"],
  },
};

export default nextConfig;
