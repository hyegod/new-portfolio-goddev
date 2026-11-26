"use client";

import dynamic from "next/dynamic";
import type { VgpuCanvasProps } from "./VgpuCanvas";

const DynamicVgpuCanvas = dynamic<VgpuCanvasProps>(
  () => import("./VgpuCanvas").then((mod) => mod.VgpuCanvas),
  { ssr: false }
);

export function LazyVgpuCanvas(props: VgpuCanvasProps) {
  return <DynamicVgpuCanvas {...props} />;
}
