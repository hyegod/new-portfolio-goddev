import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  allowedDevOrigins: ["10.225.194.225"],
  experimental: {
    optimizePackageImports: ["motion/react"],
  },
};

export default nextConfig;
