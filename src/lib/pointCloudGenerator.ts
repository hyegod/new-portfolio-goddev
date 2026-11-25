import type { PointPresetId } from "@/data/portfolio";

export interface PointCloudData {
  id: string;
  label: string;
  positions: Float32Array;
  colors: Float32Array;
  anchors: [number, number, number][];
  thumbnail: string;
}

// Deterministic fast PRNG (Mulberry32) so presets are reproducible and SSR-safe
function createRng(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export interface PresetMeta {
  id: string;
  preset: PointPresetId;
  label: string;
  thumbnail: string;
}

const PRESET_LABELS: Record<PointPresetId, string> = {
  bridge: "BRIDGE",
  tower: "TOWER",
  terrain: "TERRAIN",
  shell: "SHELL",
};

export function getPresetMeta(preset: PointPresetId): PresetMeta {
  return {
    id: `preset-${preset}`,
    preset,
    label: PRESET_LABELS[preset],
    thumbnail: generateThumbnail(preset),
  };
}

function generateThumbnail(preset: PointPresetId): string {
  let inner = "";
  if (preset === "bridge") {
    inner = `
      <line x1="6" y1="42" x2="58" y2="42" stroke="#f2ece0" stroke-width="2"/>
      <line x1="20" y1="14" x2="20" y2="52" stroke="#3c6bff" stroke-width="2"/>
      <line x1="44" y1="14" x2="44" y2="52" stroke="#3c6bff" stroke-width="2"/>
      <line x1="20" y1="16" x2="8" y2="42" stroke="#c8dcff" stroke-width="0.8" opacity="0.8"/>
      <line x1="20" y1="22" x2="13" y2="42" stroke="#c8dcff" stroke-width="0.8" opacity="0.8"/>
      <line x1="20" y1="16" x2="32" y2="42" stroke="#c8dcff" stroke-width="0.8" opacity="0.8"/>
      <line x1="44" y1="16" x2="32" y2="42" stroke="#c8dcff" stroke-width="0.8" opacity="0.8"/>
      <line x1="44" y1="22" x2="51" y2="42" stroke="#c8dcff" stroke-width="0.8" opacity="0.8"/>
      <line x1="44" y1="16" x2="56" y2="42" stroke="#c8dcff" stroke-width="0.8" opacity="0.8"/>
    `;
  } else if (preset === "tower") {
    inner = `
      <rect x="21" y="10" width="22" height="44" fill="none" stroke="#f2ece0" stroke-width="1.3"/>
      <line x1="21" y1="10" x2="43" y2="32" stroke="#3c6bff" stroke-width="1"/>
      <line x1="43" y1="10" x2="21" y2="32" stroke="#3c6bff" stroke-width="1"/>
      <line x1="21" y1="32" x2="43" y2="54" stroke="#3c6bff" stroke-width="1"/>
      <line x1="43" y1="32" x2="21" y2="54" stroke="#3c6bff" stroke-width="1"/>
      <line x1="32" y1="4" x2="32" y2="10" stroke="#ffe9c4" stroke-width="1.4"/>
    `;
  } else if (preset === "terrain") {
    inner = `
      <path d="M8 46 Q20 26 32 34 T56 28" fill="none" stroke="#3de8a5" stroke-width="1.2" opacity="0.9"/>
      <path d="M8 38 Q22 18 34 26 T56 20" fill="none" stroke="#88a4ff" stroke-width="1.1" opacity="0.75"/>
      <path d="M8 52 Q24 38 36 44 T56 40" fill="none" stroke="#f2ece0" stroke-width="1" opacity="0.55"/>
    `;
  } else {
    inner = `
      <path d="M10 42 Q32 10 54 42" fill="none" stroke="#f2ece0" stroke-width="1.4"/>
      <path d="M14 44 Q32 20 50 44" fill="none" stroke="#3c6bff" stroke-width="1.1" opacity="0.9"/>
      <path d="M10 42 Q32 32 54 42" fill="none" stroke="#c8dcff" stroke-width="1" opacity="0.7"/>
      <line x1="32" y1="26" x2="32" y2="44" stroke="#3c6bff" stroke-width="0.9" opacity="0.7"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#08090c"/>${inner}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Preset 1: BRIDGE — 3D Cable-Stayed Structural Bridge Point Cloud
 * Twin concrete A-frame pylons, box-girder bridge deck, tension stay cables, and subtle water reflection.
 */
function buildBridge(count: number): PointCloudData {
  const rng = createRng(202611);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const deckY = -0.18;
  const pylonXs = [-0.56, 0.56];
  const pylonTop = 0.78;
  const pylonBase = -0.72;
  const deckHalfW = 0.16;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const part = rng();

    let x = 0;
    let y = 0;
    let z = 0;
    let lum = 0.85;
    let isCobalt = false;

    if (part < 0.34) {
      // Main structural bridge deck & box girder span
      x = (rng() * 2 - 1) * 1.38;
      const onEdge = rng() < 0.42;
      z = onEdge
        ? (rng() < 0.5 ? -1 : 1) * deckHalfW + (rng() - 0.5) * 0.025
        : (rng() * 2 - 1) * deckHalfW;
      // Subtle structural camber arch along deck center
      const camber = Math.cos((x / 1.4) * Math.PI * 0.5) * 0.065;
      y = deckY + camber + (rng() - 0.5) * 0.042;
      lum = onEdge ? 0.98 : 0.68 + rng() * 0.22;
    } else if (part < 0.58) {
      // Twin A-frame concrete pylons + cross beams
      const px = pylonXs[rng() < 0.5 ? 0 : 1];
      const sub = rng();
      if (sub < 0.82) {
        // Two inclined tower legs converging near pylon peak
        const h = rng(); // 0 at base -> 1 at peak
        y = pylonBase + h * (pylonTop - pylonBase);
        const legSide = rng() < 0.5 ? -1 : 1;
        const spreadZ = (1 - h * 0.78) * 0.24;
        z = legSide * spreadZ + (rng() - 0.5) * 0.048;
        x = px + (rng() - 0.5) * 0.065;
        lum = 0.72 + h * 0.28;
      } else {
        // Horizontal structural cross-struts between legs
        const strutLevels = [-0.46, -0.18, 0.28, 0.62];
        const sy = strutLevels[Math.floor(rng() * strutLevels.length)];
        const h = (sy - pylonBase) / (pylonTop - pylonBase);
        const halfZ = (1 - h * 0.78) * 0.24;
        x = px + (rng() - 0.5) * 0.055;
        y = sy + (rng() - 0.5) * 0.035;
        z = (rng() * 2 - 1) * halfZ;
        lum = 0.9;
      }
    } else if (part < 0.9) {
      // Fan/harp steel tension stay cables (radiating from both pylons to deck)
      const pylonIdx = rng() < 0.5 ? 0 : 1;
      const px = pylonXs[pylonIdx];
      const side = rng() < 0.5 ? -1 : 1; // left or right of pylon
      const cableSlot = 1 + Math.floor(rng() * 8); // 8 cables per side
      const cableFrac = cableSlot / 8;

      const anchorTopY = 0.34 + cableFrac * (pylonTop - 0.38);
      const anchorTopZ = (rng() < 0.5 ? -1 : 1) * (1 - ((anchorTopY - pylonBase) / (pylonTop - pylonBase)) * 0.78) * 0.22;

      const spanReach = side === (pylonIdx === 0 ? 1 : -1) ? 0.54 : 0.74;
      const deckX = px + side * (0.09 + cableFrac * spanReach);
      const camber = Math.cos((deckX / 1.4) * Math.PI * 0.5) * 0.065;
      const deckAnchorY = deckY + camber;
      const deckAnchorZ = Math.sign(anchorTopZ) * deckHalfW;

      const t = rng();
      x = px + (deckX - px) * t + (rng() - 0.5) * 0.012;
      // Realistic slight catenary sag on steel cables
      const sag = Math.sin(t * Math.PI) * 0.022 * cableFrac;
      y = anchorTopY + (deckAnchorY - anchorTopY) * t - sag + (rng() - 0.5) * 0.01;
      z = anchorTopZ + (deckAnchorZ - anchorTopZ) * t + (rng() - 0.5) * 0.012;

      lum = 0.7 + (1 - t) * 0.28;
      isCobalt = true;
    } else {
      // Subtle datum water plane / foundation pier mist below deck
      x = (rng() * 2 - 1) * 1.42;
      z = (rng() * 2 - 1) * 0.62;
      y = pylonBase + Math.sin(x * 7 + z * 5) * 0.018 + (rng() - 0.5) * 0.02;
      lum = 0.22 + rng() * 0.2;
      isCobalt = rng() < 0.55;
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    if (isCobalt) {
      colors[i3] = clamp(lum * 0.55, 0, 1);
      colors[i3 + 1] = clamp(lum * 0.76, 0, 1);
      colors[i3 + 2] = clamp(lum * 1.18, 0, 1);
    } else {
      colors[i3] = clamp(lum * 1.03, 0, 1);
      colors[i3 + 1] = clamp(lum * 0.99, 0, 1);
      colors[i3 + 2] = clamp(lum * 0.93, 0, 1);
    }
  }

  return {
    id: "bridge",
    label: "BRIDGE",
    positions,
    colors,
    anchors: [
      [-0.56, 0.76, 0.06],
      [0.56, 0.76, -0.06],
      [0.0, -0.12, 0.16],
      [-1.12, -0.17, 0.15],
      [1.12, -0.17, -0.15],
      [-0.56, -0.58, 0.22],
      [0.56, -0.58, -0.22],
      [0.24, 0.26, 0.12],
    ],
    thumbnail: generateThumbnail("bridge"),
  };
}

/**
 * Preset 2: TOWER — 42-Story Structural Diagrid High-Rise Frame
 * Tapering steel exoskeleton diagrid, concrete floor plates, central shear-wall core, and spire.
 */
function buildTower(count: number): PointCloudData {
  const rng = createRng(202612);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const baseY = -1.02;
  const topY = 0.92;
  const totalH = topY - baseY;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const part = rng();

    let x = 0;
    let y = 0;
    let z = 0;
    let lum = 0.85;
    let isCobalt = false;

    if (part < 0.44) {
      // Exterior diagrid bracing trusses on 4 tapering faces
      const h = rng(); // 0..1
      y = baseY + h * totalH;
      const halfW = 0.48 * (1 - h * 0.28);
      const face = Math.floor(rng() * 4);

      // Quantize onto diagrid diagonal lines (X-bracing modules)
      const modules = 6;
      const phase = h * modules;
      const diagDir = rng() < 0.5 ? 1 : -1;
      const uRaw = ((phase * diagDir + Math.floor(rng() * 2) * 0.5) % 1 + 1) % 1;
      const u = uRaw * 2 - 1; // -1..1 along face

      const jitter = (rng() - 0.5) * 0.025;
      if (face === 0) {
        x = u * halfW;
        z = halfW + jitter;
      } else if (face === 1) {
        x = u * halfW;
        z = -halfW + jitter;
      } else if (face === 2) {
        x = halfW + jitter;
        z = u * halfW;
      } else {
        x = -halfW + jitter;
        z = u * halfW;
      }

      lum = 0.72 + h * 0.28;
      isCobalt = rng() < 0.48;
    } else if (part < 0.72) {
      // Horizontal floor slabs (16 primary structural stories)
      const floor = Math.floor(rng() * 17);
      const h = floor / 16;
      y = baseY + h * totalH + (rng() - 0.5) * 0.015;
      const halfW = 0.48 * (1 - h * 0.28);
      const onRim = rng() < 0.55;
      if (onRim) {
        const edge = Math.floor(rng() * 4);
        const s = rng() * 2 - 1;
        x = edge < 2 ? s * halfW : (edge === 2 ? 1 : -1) * halfW;
        z = edge >= 2 ? s * halfW : (edge === 0 ? 1 : -1) * halfW;
        lum = 0.96;
      } else {
        x = (rng() * 2 - 1) * halfW;
        z = (rng() * 2 - 1) * halfW;
        lum = 0.48 + rng() * 0.25;
      }
    } else if (part < 0.88) {
      // Central reinforced concrete shear-wall core + rooftop spire
      if (rng() < 0.85) {
        const h = rng();
        y = baseY + h * totalH;
        const coreW = 0.16;
        const wall = Math.floor(rng() * 4);
        const s = rng() * 2 - 1;
        x = wall < 2 ? s * coreW : (wall === 2 ? 1 : -1) * coreW;
        z = wall >= 2 ? s * coreW : (wall === 0 ? 1 : -1) * coreW;
        lum = 0.82;
      } else {
        // Communications / structural spire above crown
        const s = rng();
        y = topY + s * 0.34;
        const r = (1 - s) * 0.032;
        const a = rng() * Math.PI * 2;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        lum = 1.0;
        isCobalt = true;
      }
    } else {
      // Ground foundation plinth / podium datum grid
      x = (rng() * 2 - 1) * 0.95;
      z = (rng() * 2 - 1) * 0.95;
      y = baseY - (rng() * 0.06);
      lum = 0.26 + rng() * 0.22;
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    if (isCobalt) {
      colors[i3] = clamp(lum * 0.52, 0, 1);
      colors[i3 + 1] = clamp(lum * 0.74, 0, 1);
      colors[i3 + 2] = clamp(lum * 1.15, 0, 1);
    } else {
      colors[i3] = clamp(lum * 1.02, 0, 1);
      colors[i3 + 1] = clamp(lum * 0.98, 0, 1);
      colors[i3 + 2] = clamp(lum * 0.92, 0, 1);
    }
  }

  return {
    id: "tower",
    label: "TOWER",
    positions,
    colors,
    anchors: [
      [0.0, 1.24, 0.0],
      [0.35, 0.88, 0.35],
      [-0.38, 0.42, 0.38],
      [0.42, -0.05, -0.42],
      [-0.45, -0.54, 0.45],
      [0.48, -0.98, 0.48],
      [0.0, 0.14, 0.16],
      [-0.74, -1.02, -0.45],
    ],
    thumbnail: generateThumbnail("tower"),
  };
}

/**
 * Preset 3: TERRAIN — UAV LiDAR Topographic Contour Digital Elevation Model
 * Multi-ridge valley topography with luminous iso-elevation contour lines.
 */
function buildTerrain(count: number): PointCloudData {
  const rng = createRng(202613);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const elevation = (x: number, z: number) => {
    const peak1 = 0.68 * Math.exp(-((x - 0.36) ** 2 + (z + 0.18) ** 2) * 2.4);
    const peak2 = 0.52 * Math.exp(-((x + 0.48) ** 2 + (z - 0.34) ** 2) * 2.8);
    const valley = -0.34 * Math.exp(-((x + 0.05) ** 2 + (z + 0.1) ** 2) * 3.6);
    const ridge = Math.sin(x * 3.4 + z * 2.1) * 0.11 + Math.cos(z * 4.5 - x * 1.8) * 0.07;
    return peak1 + peak2 + valley + ridge - 0.18;
  };

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const x = (rng() * 2 - 1) * 1.22;
    const z = (rng() * 2 - 1) * 1.22;
    const y = elevation(x, z) + (rng() - 0.5) * 0.016;

    // Emphasize crisp topographic iso-elevation contour lines (every 0.12 units)
    const contourBand = Math.abs((((y + 1.0) * 8.5) % 1) - 0.5);
    const onContour = contourBand < 0.075;
    const normElev = clamp((y + 0.45) / 1.05, 0, 1);

    // Tilt terrain forward slightly into camera view (stored nicely in x,y,z)
    positions[i3] = x;
    positions[i3 + 1] = y * 0.92 + z * 0.36;
    positions[i3 + 2] = z * 0.88 - y * 0.34;

    const lum = onContour
      ? clamp(0.75 + normElev * 0.25, 0, 1)
      : clamp(0.18 + normElev * 0.52, 0.1, 0.72);

    if (onContour) {
      // Bright blueprint cyan/jade contour rings
      colors[i3] = clamp(lum * (0.45 + normElev * 0.55), 0, 1);
      colors[i3 + 1] = clamp(lum * 0.98, 0, 1);
      colors[i3 + 2] = clamp(lum * (1.12 - normElev * 0.2), 0, 1);
    } else {
      colors[i3] = clamp(lum * 0.95, 0, 1);
      colors[i3 + 1] = clamp(lum * 0.96, 0, 1);
      colors[i3 + 2] = clamp(lum * 1.02, 0, 1);
    }
  }

  return {
    id: "terrain",
    label: "TERRAIN",
    positions,
    colors,
    anchors: [
      [0.36, 0.42, -0.34],
      [-0.48, 0.44, 0.18],
      [-0.04, -0.34, -0.02],
      [0.86, 0.05, 0.45],
      [-0.86, -0.18, -0.52],
      [0.12, 0.26, 0.72],
      [-0.22, -0.22, -0.74],
      [0.72, -0.28, -0.48],
    ],
    thumbnail: generateThumbnail("terrain"),
  };
}

/**
 * Preset 4: SHELL — Parametric Double-Curved Thin-Shell Concrete Pavilion
 * Hyperbolic paraboloid saddle vault with structural ribs and radial perimeter arches.
 */
function buildShell(count: number): PointCloudData {
  const rng = createRng(202614);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const R = 1.16;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const isRib = rng() < 0.36;

    let u = 0;
    let v = 0;

    if (isRib) {
      // Concentrate points cleanly along structural rib grid lines
      const gridLines = 12;
      if (rng() < 0.5) {
        u = (Math.floor(rng() * (gridLines + 1)) / gridLines) * 2 - 1;
        v = rng() * 2 - 1;
      } else {
        u = rng() * 2 - 1;
        v = (Math.floor(rng() * (gridLines + 1)) / gridLines) * 2 - 1;
      }
      // Keep inside circular/elliptical plan footprint
      const rad = Math.hypot(u, v);
      if (rad > 1) {
        u /= rad;
        v /= rad;
      }
    } else {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng());
      u = Math.cos(a) * r;
      v = Math.sin(a) * r;
    }

    const x = u * R;
    const z = v * R;
    // Classic hyperbolic paraboloid (hypar) + dome shell compression profile
    const r2 = u * u + v * v;
    const hypar = (u * u - v * v) * 0.42;
    const vault = (1 - r2) * 0.48;
    const y = vault + hypar - 0.14 + (rng() - 0.5) * 0.022;

    const rim = Math.abs(Math.hypot(u, v) - 1) < 0.045;
    const lum = isRib || rim ? 0.92 : clamp(0.32 + (y + 0.5) * 0.65, 0.15, 0.88);
    const isCobalt = rim || (isRib && rng() < 0.45);

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    if (isCobalt) {
      colors[i3] = clamp(lum * 0.48, 0, 1);
      colors[i3 + 1] = clamp(lum * 0.72, 0, 1);
      colors[i3 + 2] = clamp(lum * 1.18, 0, 1);
    } else {
      colors[i3] = clamp(lum * 1.03, 0, 1);
      colors[i3 + 1] = clamp(lum * 0.99, 0, 1);
      colors[i3 + 2] = clamp(lum * 0.94, 0, 1);
    }
  }

  return {
    id: "shell",
    label: "SHELL",
    positions,
    colors,
    anchors: [
      [0.0, 0.34, 0.0],
      [1.14, 0.28, 0.0],
      [-1.14, 0.28, 0.0],
      [0.0, -0.56, 1.14],
      [0.0, -0.56, -1.14],
      [0.64, 0.18, 0.64],
      [-0.64, 0.18, -0.64],
      [0.64, 0.18, -0.64],
    ],
    thumbnail: generateThumbnail("shell"),
  };
}

export function generatePresetPointCloud(
  preset: PointPresetId,
  count: number
): PointCloudData {
  switch (preset) {
    case "tower":
      return buildTower(count);
    case "terrain":
      return buildTerrain(count);
    case "shell":
      return buildShell(count);
    case "bridge":
    default:
      return buildBridge(count);
  }
}

/**
 * Converts any user-uploaded Image / Blueprint / Site Photo into a 3D depth-relief point cloud client-side.
 * Uses importance sampling weighted by luminance + Sobel edge magnitude for crisp LiDAR-like clarity.
 */
export async function imageFileToPointCloud(
  file: File,
  count: number
): Promise<PointCloudData> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not decode image"));
      el.src = url;
    });

    const maxDim = 240;
    const aspect = img.width / Math.max(1, img.height);
    const width = aspect >= 1 ? maxDim : Math.max(48, Math.round(maxDim * aspect));
    const height = aspect >= 1 ? Math.max(48, Math.round(maxDim / aspect)) : maxDim;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("2D context unavailable");

    ctx.drawImage(img, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);

    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = 64;
    thumbCanvas.height = 64;
    const tCtx = thumbCanvas.getContext("2d");
    let thumbnail = "";
    if (tCtx) {
      tCtx.fillStyle = "#08090c";
      tCtx.fillRect(0, 0, 64, 64);
      const scale = Math.max(64 / img.width, 64 / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      tCtx.drawImage(img, (64 - dw) / 2, (64 - dh) / 2, dw, dh);
      thumbnail = thumbCanvas.toDataURL("image/jpeg", 0.8);
    }

    const totalPixels = width * height;
    const luma = new Float32Array(totalPixels);
    const edge = new Float32Array(totalPixels);
    const weights = new Float32Array(totalPixels);

    for (let p = 0; p < totalPixels; p++) {
      const idx = p * 4;
      const a = data[idx + 3] / 255;
      luma[p] =
        ((0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255) * a;
    }

    const cdf = new Float32Array(totalPixels);
    let cumulative = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        let grad = 0;
        if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
          const gx =
            -luma[(y - 1) * width + (x - 1)] +
            luma[(y - 1) * width + (x + 1)] -
            2 * luma[y * width + (x - 1)] +
            2 * luma[y * width + (x + 1)] -
            luma[(y + 1) * width + (x - 1)] +
            luma[(y + 1) * width + (x + 1)];
          const gy =
            -luma[(y - 1) * width + (x - 1)] -
            2 * luma[(y - 1) * width + x] -
            luma[(y - 1) * width + (x + 1)] +
            luma[(y + 1) * width + (x - 1)] +
            2 * luma[(y + 1) * width + x] +
            luma[(y + 1) * width + (x + 1)];
          grad = clamp(Math.hypot(gx, gy), 0, 1);
        }
        edge[p] = grad;
        const w = 0.08 + Math.pow(luma[p], 1.15) * 0.95 + grad * 1.45;
        weights[p] = w;
        cumulative += w;
        cdf[p] = cumulative;
      }
    }

    const rng = createRng(file.size ^ Date.now());
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const worldW = aspect >= 1 ? 2.15 : 2.15 * aspect;
    const worldH = aspect >= 1 ? 2.15 / aspect : 2.15;

    for (let i = 0; i < count; i++) {
      const target = rng() * cumulative;
      let lo = 0;
      let hi = totalPixels - 1;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (cdf[mid] < target) lo = mid + 1;
        else hi = mid;
      }

      const px = lo % width;
      const py = (lo - px) / width;

      const u = (px + rng() - 0.5) / width;
      const v = (py + rng() - 0.5) / height;

      const nx = (u - 0.5) * worldW;
      const ny = (0.5 - v) * worldH;

      const distCenter = Math.hypot((u - 0.5) * 2, (v - 0.5) * 2);
      const radialDome = Math.max(0, 1 - distCenter * distCenter * 0.45);
      const nz =
        (luma[lo] - 0.42) * 0.72 +
        edge[lo] * 0.24 +
        radialDome * 0.22 +
        (rng() - 0.5) * 0.035;

      const i3 = i * 3;
      positions[i3] = nx;
      positions[i3 + 1] = ny;
      positions[i3 + 2] = nz;

      const rgba = lo * 4;
      colors[i3] = clamp(data[rgba] / 255, 0.08, 1);
      colors[i3 + 1] = clamp(data[rgba + 1] / 255, 0.08, 1);
      colors[i3 + 2] = clamp(data[rgba + 2] / 255, 0.08, 1);
    }

    const anchors: [number, number, number][] = [];
    const grid = 3;
    for (let gy = 0; gy < grid; gy++) {
      for (let gx = 0; gx < grid; gx++) {
        if (anchors.length >= 8) break;
        const x0 = Math.floor((gx / grid) * width);
        const x1 = Math.floor(((gx + 1) / grid) * width);
        const y0 = Math.floor((gy / grid) * height);
        const y1 = Math.floor(((gy + 1) / grid) * height);
        let bestP = y0 * width + x0;
        let bestScore = -1;
        for (let y = y0; y < y1; y += 2) {
          for (let x = x0; x < x1; x += 2) {
            const p = y * width + x;
            const score = weights[p];
            if (score > bestScore) {
              bestScore = score;
              bestP = p;
            }
          }
        }
        const bx = bestP % width;
        const by = (bestP - bx) / width;
        const ax = (bx / width - 0.5) * worldW;
        const ay = (0.5 - by / height) * worldH;
        const az = (luma[bestP] - 0.42) * 0.72 + 0.18;
        anchors.push([ax, ay, az]);
      }
    }

    const cleanName = file.name.replace(/\.[^.]+$/, "").slice(0, 12).toUpperCase() || "SCAN";

    return {
      id: `custom-${Date.now()}`,
      label: cleanName,
      positions,
      colors,
      anchors,
      thumbnail,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
