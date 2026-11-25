"use client";

import dynamic from "next/dynamic";
import type { GatherPointCloudProps } from "./GatherPointCloud";

export const LazyGatherPointCloud = dynamic<GatherPointCloudProps>(
  () => import("./GatherPointCloud").then((mod) => mod.GatherPointCloud),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="h-full w-full bg-transparent"
      />
    ),
  }
);
