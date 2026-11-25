# new-portfolio-goddev

Minimalist architectural portfolio built with **Next.js 16**, **React 19**, **Tailwind CSS v4**, **Three.js + Custom GLSL Shaders**, **GSAP ScrollTrigger**, **Lenis**, and **Motion**.

## Highlights

- **Concrete × Electric Cobalt Architectural UI** with selective frosted vellum & obsidian glass surfaces.
- **Interactive 3D LiDAR Point-Cloud Engine** (`GatherPointCloud`) with multi-touch orbit, pinch-to-zoom, image-to-point-cloud synthesis, and adaptive cross-device GPU budgets.
- **Multi-Page Portfolio Architecture**:
  - `/` — Editorial showcase (Hero, About, Slogan + Architectural Vernier Datum Scale, Technical Skills, Featured Works preview, Structural Gallery preview, Contact).
  - `/works` — Filterable full project archive + live GitHub contribution heatmap & synced public repositories (`/api/github`).
  - `/works/[slug]` — Dedicated statically prerendered case study page per project.
  - `/gallery` — Full 3D LiDAR Studio & filterable blueprint plate archive with `?preset=` deep-linking.
- **Minimalist Optical Lens Page & Section Transitions** + **Precision CAD Custom Cursor** on desktop fine-pointer devices.

## Development

```bash
pnpm install
pnpm run dev
```

## Production Build

```bash
pnpm run typecheck
pnpm run build
pnpm run start
```
