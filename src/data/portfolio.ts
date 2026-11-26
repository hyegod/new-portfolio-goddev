export type PointPresetId = "bridge" | "tower" | "terrain" | "shell";

export interface ProjectArchitectureBlock {
  code: string;
  title: string;
  detail: string;
}

export interface ProjectItem {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  category: string;
  discipline: "CIVIL × SOFTWARE" | "SOFTWARE / GIS" | "STRUCTURAL / WEBGL" | "COMPUTATIONAL BIM";
  year: string;
  role: string;
  client: string;
  duration: string;
  preset: PointPresetId;
  accent: "cobalt" | "pink";
  summary: string;
  challenge: string;
  outcome: string;
  deliverables: string[];
  architectureHighlights: ProjectArchitectureBlock[];
  metrics: { label: string; value: string }[];
  stack: string[];
  liveUrl: string;
  imageUrl?: string | null;
}

export type SkillTier = "CORE" | "DAILY" | "SPEC";

export interface SkillItem {
  name: string;
  tier: SkillTier;
  detail: string;
  tools: string[];
}

export interface SkillPillar {
  id: "civil" | "software" | "bridge";
  num: string;
  title: string;
  jp: string;
  tagline: string;
  skills: SkillItem[];
}

export interface GalleryPlate {
  id: string;
  code: string;
  title: string;
  category: string;
  filterGroup: "STRUCTURAL" | "GEOSPATIAL" | "COMPUTATIONAL" | "SOFTWARE";
  scale: string;
  coords: string;
  year: string;
  preset: PointPresetId;
  visualType: "bridge-elevation" | "tower-section" | "lidar-contour" | "shell-grid" | "rebar-detail" | "bim-pipeline";
  caption: string;
  imageUrl?: string | null;
}

export type PhotoBentoSize = "hero" | "wide" | "tall" | "square";

export type PhotoCategory =
  | "STREET"
  | "ARCHITECTURE"
  | "LANDSCAPE"
  | "STAGE"
  | "MONOCHROME";

export type PhotoTone = "cobalt" | "obsidian" | "concrete" | "amber" | "slate";

export interface PhotoGalleryItem {
  id: string;
  frame: string;
  title: string;
  description: string;
  takenDate: string;
  location: string;
  category: PhotoCategory;
  camera?: string;
  bentoSize: PhotoBentoSize;
  tone?: PhotoTone;
  imageUrl?: string | null;
}

export interface GatherSwatch {
  id: string;
  name: string;
  hex: string;
}

export const PORTFOLIO_PROFILE = {
  brand: "GODDEV",
  fullName: "Godlift Farrelio",
  githubUsername: "hyegod",
  jpMark: "構造・開発",
  tagline: "CIVIL ENGINEERING × SOFTWARE DEVELOPMENT",
  location: "MAKASSAR, INDONESIA · AVAILABLE WORLDWIDE",
  availability: "OPEN FOR ENGINEERING & SOFTWARE ROLES",
  email: "godliftmailbox@gmail.com",
  socials: [
    { label: "GITHUB", href: "https://github.com/hyegod" },
    { label: "LINKEDIN", href: "https://linkedin.com/in/godlift-farrelio" },
    { label: "INSTAGRAM", href: "https://instagram.com/godliftfarrelio" },
  ],
};

export const ABOUT_STATS = [
  { label: "DUAL TRACK", value: "CIVIL × SWE" },
  { label: "CODING SINCE", value: "2021 — NOW" },
  { label: "UNIVERSITY", value: "BOSOWA UNIV." },
  { label: "CREATIVE", value: "BASS · PHOTO" },
];

// Technical Spec Sheet pillars — easily extensible by adding items or appending strings to `tools`.
export const SKILL_PILLARS: SkillPillar[] = [
  {
    id: "civil",
    num: "01",
    title: "CIVIL & STRUCTURAL",
    jp: "土木・構造設計",
    tagline:
      "Seismic structural analysis, concrete & steel detailing, infrastructure grading, and BIM coordination.",
    skills: [
      {
        name: "Structural & Seismic Analysis",
        tier: "CORE",
        detail:
          "3D modal, response-spectrum, and lateral drift verification for frames & bridges.",
        tools: ["ETABS", "SAP2000", "Robot Structural", "SNI 1726", "ACI 318"],
      },
      {
        name: "BIM & 3D Structural Modeling",
        tier: "DAILY",
        detail:
          "LOD 350–400 concrete/steel coordination, architectural massing, and shop detailing.",
        tools: ["Revit", "AutoCAD", "SketchUp", "ISO 19650"],
      },
      {
        name: "Terrain, Grading & Surfacing",
        tier: "CORE",
        detail:
          "Corridors, road alignments, topographic contour mapping, and cut/fill volumes.",
        tools: ["Civil 3D", "Surfer", "LandXML", "WGS84"],
      },
      {
        name: "RC & Steel Member Design",
        tier: "SPEC",
        detail:
          "Ductile shear walls, beam-column joints, foundations, and steel connection checks.",
        tools: ["SNI 2847", "AISC 360", "Excel Calc"],
      },
      {
        name: "Engineering Docs & Reporting",
        tier: "SPEC",
        detail:
          "Structured calculation sheets, BOQ automation, and technical client presentations.",
        tools: ["Excel", "Word", "PowerPoint"],
      },
    ],
  },
  {
    id: "software",
    num: "02",
    title: "SOFTWARE ENGINEERING",
    jp: "ソフトウェア開発",
    tagline:
      "Production web & mobile applications, backend APIs, cloud databases, and scalable multi-language systems.",
    skills: [
      {
        name: "Core Programming Languages",
        tier: "DAILY",
        detail:
          "Polyglot engineering across web, mobile, backend services, and computational scripts.",
        tools: ["TypeScript", "JavaScript", "Python", "C#", "Go", "Dart", "Kotlin", "Swift", "Java", "PHP", "Ruby"],
      },
      {
        name: "Full-Stack Web Systems",
        tier: "CORE",
        detail:
          "Type-safe SSR apps, reactive frontends, REST/GraphQL backends, and design systems.",
        tools: ["Next.js", "React", "Vue.js", "Node.js", "Express.js", "Django", "Laravel"],
      },
      {
        name: "Cross-Platform & Native Mobile",
        tier: "DAILY",
        detail:
          "High-craft mobile apps for iOS & Android with native performance and clean UI.",
        tools: ["React Native", "Flutter", "SwiftUI", "Jetpack Compose", "Expo", "NativeWind"],
      },
      {
        name: "Databases & Cloud Infra",
        tier: "CORE",
        detail:
          "Relational & NoSQL architecture, auth/realtime backends, and cloud deployment.",
        tools: ["PostgreSQL", "MongoDB", "MySQL", "Supabase", "Firebase", "AWS", "Azure", "GCP"],
      },
      {
        name: "DevOps, Auth & Tooling",
        tier: "SPEC",
        detail:
          "Containerized builds, auth protocols, real-time sockets, API testing, and version control.",
        tools: ["Docker", "Kubernetes", "Git", "GitHub", "GitLab", "Bitbucket", "Postman", "GraphQL", "JWT / OAuth", "WebSockets"],
      },
    ],
  },
  {
    id: "bridge",
    num: "03",
    title: "COMPUTATIONAL & CREATIVE",
    jp: "コンピュテーショナル",
    tagline:
      "Where civil engineering meets code — real-time 3D WebGL visualizers, BIM automation, and digital craft.",
    skills: [
      {
        name: "3D WebGL & LiDAR Point Clouds",
        tier: "CORE",
        detail:
          "GPU-accelerated custom shaders, interactive 3D structural twins, and scan viewers.",
        tools: ["Three.js", "WebGL2", "GLSL", "LiDAR"],
      },
      {
        name: "BIM & Analysis Automation",
        tier: "DAILY",
        detail:
          "Scripting structural checks, automated rebar/sheet workflows, and OpenBIM data sync.",
        tools: ["Revit API", "C#", "Python", "ETABS API", "IFC"],
      },
      {
        name: "Geospatial & Surface Tooling",
        tier: "CORE",
        detail:
          "Browser terrain contour rendering, DEM elevation meshes, and spatial data APIs.",
        tools: ["PostGIS", "REST API", "Civil 3D", "Surfer"],
      },
      {
        name: "Interactive Motion & UI Craft",
        tier: "SPEC",
        detail:
          "Smooth scroll choreography, compositor-first micro-interactions, and modern Web APIs.",
        tools: ["GSAP", "Lenis", "Motion", "Tailwind v4"],
      },
      {
        name: "Music, Bass & Visual Media",
        tier: "SPEC",
        detail:
          "Bass-driven music production, DAW sound design, and visual storytelling through photography & film.",
        tools: ["Ableton Live", "FL Studio", "Bass Guitar", "Photography", "Videography"],
      },
    ],
  },
];

export const PROJECTS: ProjectItem[] = [
  {
    id: "struxflow",
    index: "01",
    title: "STRUXFLOW SPAN",
    subtitle: "WebGL Cable-Stayed Bridge & Structural Telemetry Platform",
    category: "STRUCTURAL / WEBGL",
    discipline: "STRUCTURAL / WEBGL",
    year: "2026",
    role: "Civil & Software Developer",
    client: "Computational Structural R&D",
    duration: "4 MONTHS",
    preset: "bridge",
    accent: "cobalt",
    summary:
      "Browser-based 3D structural digital twin visualizing stay-cable tension, deck deflection envelopes, and real-time sensor telemetry across long-span bridges.",
    challenge:
      "Structural monitoring teams relied on fragmented desktop spreadsheets and static CAD PDFs that couldn't visualize live load redistribution across 40+ stay cables.",
    outcome:
      "Engineered a Three.js + GLSL point-cloud & mesh twin backed by a Python FastAPI solver, slashing engineering inspection review time by 68% while maintaining 60 FPS.",
    deliverables: [
      "Real-Time 3D WebGL Bridge Twin",
      "FastAPI Structural Telemetry API",
      "Cable Tension & Deflection Envelope Views",
      "Automated ETABS Extraction Bridge",
    ],
    architectureHighlights: [
      {
        code: "ARC 01 // STRUCTURAL MODEL",
        title: "Parametric Stay-Cable & Deck Camber Envelope",
        detail:
          "Maps stay-cable tension forces, A-frame pylon axial stresses, and live traffic deflection profiles directly from ETABS API exports into normalized 3D coordinates.",
      },
      {
        code: "ARC 02 // GPU RENDERING",
        title: "Custom GLSL Point-Cloud & Strain Shaders",
        detail:
          "Streams tens of thousands of structural vertices at 60 FPS using custom vertex/fragment shaders with zero per-frame garbage collection and adaptive DPR scaling.",
      },
      {
        code: "ARC 03 // DATA PIPELINE",
        title: "Low-Latency Python FastAPI Telemetry Stream",
        detail:
          "Aggregates 120+ bridge sensor nodes into lightweight binary frames, flagging threshold exceedances against SNI & AASHTO serviceability limits in real time.",
      },
    ],
    metrics: [
      { label: "REVIEW SPEEDUP", value: "68% FASTER" },
      { label: "RENDER BUDGET", value: "60 FPS" },
      { label: "TELEMETRY NODES", value: "120+ LIVE" },
    ],
    stack: ["Next.js", "Three.js", "GLSL", "Python", "ETABS API"],
    liveUrl: "/works?preset=bridge#lab",
  },
  {
    id: "terragrid",
    index: "02",
    title: "TERRAGRID LIDAR",
    subtitle: "Real-Time Cut/Fill Grading & Topographic Point-Cloud Engine",
    category: "CIVIL × SOFTWARE",
    discipline: "SOFTWARE / GIS",
    year: "2026",
    role: "Lead Full-Stack & Civil Developer",
    client: "Site Civil & Geospatial Survey Lab",
    duration: "3 MONTHS",
    preset: "terrain",
    accent: "pink",
    summary:
      "Interactive geospatial web platform converting drone LiDAR point clouds and DEM surfaces into instant earthwork cut/fill volume estimates and contour overlays.",
    challenge:
      "Project engineers needed rapid preliminary grading comparisons during site meetings without waiting hours for heavy desktop Civil 3D surface rebuilds.",
    outcome:
      "Built a WebGL contour & point-cloud engine with TypeScript volume integration and PostGIS storage, computing 12-hectare earthwork deltas in under 1.2 seconds.",
    deliverables: [
      "Browser LiDAR & DEM Contour Viewer",
      "Instant Cut/Fill Earthwork Calculator",
      "PostGIS Spatial Datum Backend",
      "Civil 3D LandXML Surface Importer",
    ],
    architectureHighlights: [
      {
        code: "ARC 01 // GEOSPATIAL KERNEL",
        title: "Grid-Cell Prismoidal Earthwork Integration",
        detail:
          "Compares existing UAV LiDAR ground elevations against proposed finished-grade planes across UTM 48S / WGS84 coordinates with ±0.8% volume parity against Civil 3D.",
      },
      {
        code: "ARC 02 // VISUALIZATION",
        title: "Elevation-Coded WebGL2 Terrain Mesh",
        detail:
          "Renders topographic elevation bands, watershed slopes, and cut/fill heat deltas smoothly across desktop and field tablets with multi-touch pinch inspection.",
      },
      {
        code: "ARC 03 // INTEROPERABILITY",
        title: "LandXML & Civil 3D Sync Workflow",
        detail:
          "Imports LandXML / CSV survey files directly in the browser and exports summarized earthwork BOQ tables for site estimation teams.",
      },
    ],
    metrics: [
      { label: "VOLUME CALC", value: "< 1.2 SEC" },
      { label: "LIDAR DENSITY", value: "72K+ PTS" },
      { label: "EARTHWORK DELTA", value: "±0.8% ACC" },
    ],
    stack: ["TypeScript", "WebGL2", "Civil 3D", "PostGIS", "Tailwind v4"],
    liveUrl: "/works?preset=terrain#lab",
  },
  {
    id: "towercore",
    index: "03",
    title: "TOWERCORE SEISMIC",
    subtitle: "High-Rise Diagrid Drift Auditor & Automated BIM Pipeline",
    category: "COMPUTATIONAL BIM",
    discipline: "COMPUTATIONAL BIM",
    year: "2025",
    role: "Structural & BIM Developer",
    client: "Seismic & BIM Automation Lab",
    duration: "5 MONTHS",
    preset: "tower",
    accent: "cobalt",
    summary:
      "Automated structural QA suite linking ETABS seismic story-drift outputs directly to a 3D interactive web dashboard and Revit model parameter syncing.",
    challenge:
      "Verifying SNI 1726 / ASCE 7 inter-story drift ratios across 42 floors and 36 seismic load combinations took days of manual table filtering and prone-to-error formatting.",
    outcome:
      "Created a Python/C# bridge plus Next.js interactive diagrid visualizer that auto-flags over-stressed members, generates compliance PDFs, and pushes tags straight back to Revit.",
    deliverables: [
      "ETABS-to-Web Seismic Drift Auditor",
      "Revit API C# Parameter Sync Add-In",
      "SNI 1726 & ACI 318 Compliance Report Engine",
      "42-Story Diagrid 3D Inspection Portal",
    ],
    architectureHighlights: [
      {
        code: "ARC 01 // SEISMIC CODE CHECK",
        title: "Automated 36-Combination Drift Verification",
        detail:
          "Parses modal response spectrum & P-Delta story displacements from ETABS and evaluates every floor against SNI 1726 & ASCE 7 allowable drift envelopes in seconds.",
      },
      {
        code: "ARC 02 // BIM AUTOMATION",
        title: "Bi-Directional Revit API Tagging",
        detail:
          "C# Revit add-in writes utilization ratios, ductility classes, and QA pass/fail flags back onto structural shear walls and diagrid columns automatically.",
      },
      {
        code: "ARC 03 // EXECUTIVE VIEW",
        title: "Interactive 3D Story-by-Story Web Review",
        detail:
          "Allows principal engineers and clients to orbit the 42-story core wall and inspect governing seismic combinations without needing an ETABS license installed.",
      },
    ],
    metrics: [
      { label: "AUDIT TIME", value: "3D → 8 MIN" },
      { label: "LOAD COMBOS", value: "36 AUTO" },
      { label: "CODE CHECKS", value: "SNI / ACI" },
    ],
    stack: ["Revit API", "Python", "React 19", "Three.js", "ETABS"],
    liveUrl: "/works?preset=tower#lab",
  },
  {
    id: "archshell",
    index: "04",
    title: "SHELLFORM PARAMETRIC",
    subtitle: "Thin-Shell Concrete Geometry & Web Finite-Element Explorer",
    category: "CIVIL × SOFTWARE",
    discipline: "CIVIL × SOFTWARE",
    year: "2025",
    role: "Computational Engineer",
    client: "Architectural Pavilion Research",
    duration: "3 MONTHS",
    preset: "shell",
    accent: "pink",
    summary:
      "Parametric browser sandbox for exploring double-curved concrete shell pavilions, rib spacing optimization, and live structural stress-field point visualization.",
    challenge:
      "Architects and structural engineers struggled to iterate early-stage shell curvature while keeping bending moments minimal and formwork constructible.",
    outcome:
      "Developed an interactive parametric surface generator with real-time curvature/compression visualization and direct DXF/IFC geometry export for downstream fabrication.",
    deliverables: [
      "Parametric Hyperbolic Shell Sandbox",
      "Gaussian Curvature & Membrane Visualizer",
      "DXF / IFC Formwork Geometry Exporter",
      "Rib Spacing & Concrete Volume Optimizer",
    ],
    architectureHighlights: [
      {
        code: "ARC 01 // FORM-FINDING",
        title: "Compression-Dominant Thin-Shell Solver",
        detail:
          "Evaluates funicular arch thrust lines and shell thickness distribution (down to 140 mm) to keep concrete primarily in axial compression under gravity loads.",
      },
      {
        code: "ARC 02 // INTERACTIVE SANDBOX",
        title: "Sub-16ms Real-Time Geometry Updates",
        detail:
          "Adjusting rise-to-span ratio, edge arch stiffness, or rib grid density updates the 3D WebGL stress-field preview within a single animation frame.",
      },
      {
        code: "ARC 03 // FABRICATION EXPORT",
        title: "Clean CAD / OpenBIM Handoff",
        detail:
          "Generates rationalized formwork centerlines and structural node coordinates ready for AutoCAD, Grasshopper, and downstream finite-element verification.",
      },
    ],
    metrics: [
      { label: "MATERIAL SAVED", value: "-19% VOL" },
      { label: "EXPORT FORMATS", value: "DXF / IFC" },
      { label: "INTERACTION", value: "14 MS INP" },
    ],
    stack: ["TypeScript", "GLSL Shaders", "Next.js", "Grasshopper", "AutoCAD"],
    liveUrl: "/works?preset=shell#lab",
  },
];

export function getProjectBySlug(slug: string): ProjectItem | undefined {
  return PROJECTS.find((p) => p.id === slug);
}

export function getAdjacentProjects(slug: string): {
  prev: ProjectItem;
  next: ProjectItem;
} {
  const idx = PROJECTS.findIndex((p) => p.id === slug);
  const safeIdx = idx >= 0 ? idx : 0;
  const prev = PROJECTS[(safeIdx - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(safeIdx + 1) % PROJECTS.length];
  return { prev, next };
}

export const GALLERY_PLATES: GalleryPlate[] = [
  {
    id: "plate-01",
    code: "FIG. 01 // STR-BRG",
    title: "CABLE-STAYED PYLON ELEVATION",
    category: "STRUCTURAL / BRIDGE",
    filterGroup: "STRUCTURAL",
    scale: "SCALE 1:500",
    coords: "-5.1477° S, 119.4327° E",
    year: "2026",
    preset: "bridge",
    visualType: "bridge-elevation",
    caption:
      "Parametric twin-pylon harp cable layout studied for aerodynamic deck stability and balanced dead-load tensioning.",
  },
  {
    id: "plate-02",
    code: "FIG. 02 // STR-TWR",
    title: "42-STORY DIAGRID CORE SECTION",
    category: "HIGH-RISE / BIM",
    filterGroup: "STRUCTURAL",
    scale: "SCALE 1:250",
    coords: "ZONE 4 SEISMIC · SNI 1726",
    year: "2026",
    preset: "tower",
    visualType: "tower-section",
    caption:
      "Composite steel-concrete diagrid exoskeleton coupled with a central reinforced core wall for lateral drift control.",
  },
  {
    id: "plate-03",
    code: "FIG. 03 // GEO-DEM",
    title: "LIDAR TOPOGRAPHIC CONTOUR MESH",
    category: "GEOSPATIAL / CIVIL 3D",
    filterGroup: "GEOSPATIAL",
    scale: "INTERVAL 0.50 M",
    coords: "UTM 50S · WGS84",
    year: "2025",
    preset: "terrain",
    visualType: "lidar-contour",
    caption:
      "High-density UAV LiDAR point cloud processed into graded cut/fill contour bands and drainage watershed vectors.",
  },
  {
    id: "plate-04",
    code: "FIG. 04 // PAR-SHL",
    title: "HYPERBOLIC CONCRETE SHELL GRID",
    category: "COMPUTATIONAL DESIGN",
    filterGroup: "COMPUTATIONAL",
    scale: "THICKNESS 140 MM",
    coords: "MEMBRANE COMPRESSION",
    year: "2025",
    preset: "shell",
    visualType: "shell-grid",
    caption:
      "Double-curved thin-shell pavilion optimized for axial membrane action using custom TypeScript & GLSL curvature solvers.",
  },
  {
    id: "plate-05",
    code: "FIG. 05 // DET-RC",
    title: "DUCTILE BEAM-COLUMN JOINT DETAIL",
    category: "CONCRETE DETAILING",
    filterGroup: "STRUCTURAL",
    scale: "SCALE 1:20",
    coords: "ACI 318 SPECIAL MOMENT",
    year: "2025",
    preset: "tower",
    visualType: "rebar-detail",
    caption:
      "Automated Revit API confinement hoop layout and seismic anchorage detailing generated directly from analysis forces.",
  },
  {
    id: "plate-06",
    code: "FIG. 06 // SWE-BIM",
    title: "BIM-TO-WEBGL STREAMING PIPELINE",
    category: "SOFTWARE ARCHITECTURE",
    filterGroup: "SOFTWARE",
    scale: "LATENCY < 16 MS",
    coords: "NEXT.JS · THREE.JS · API",
    year: "2026",
    preset: "bridge",
    visualType: "bim-pipeline",
    caption:
      "End-to-end engineering software architecture bridging Revit/ETABS extraction scripts with browser GPU point-cloud rendering.",
  },
];

// Curated photography hobby frames (6 tiles pack cleanly into a 4x3 desktop Bento Grid with zero gaps)
export const PHOTO_GALLERY: PhotoGalleryItem[] = [
  {
    id: "photo-01",
    frame: "01",
    title: "BLUE HOUR ALONG LOSARI PIER",
    description:
      "Long-exposure coastal frame right after dusk when the harbor lights settle into calm cobalt reflections along the concrete breakwater.",
    takenDate: "2026-11-12",
    location: "Pantai Losari, Makassar",
    category: "LANDSCAPE",
    camera: "35mm · f/2.0 · 1/15s",
    bentoSize: "hero",
    tone: "cobalt",
  },
  {
    id: "photo-02",
    frame: "02",
    title: "EXPOSED CONCRETE & MORNING SHADOWS",
    description:
      "Sharp architectural geometry across raw brutalist colonnades during early campus light — studying how structural rhythm shapes shadow.",
    takenDate: "2026-10-28",
    location: "Bosowa University, Makassar",
    category: "ARCHITECTURE",
    camera: "50mm · f/4.0 · 1/400s",
    bentoSize: "wide",
    tone: "concrete",
  },
  {
    id: "photo-03",
    frame: "03",
    title: "AFTER-RAIN ASPHALT REFLECTIONS",
    description:
      "Late-night street walk catching neon reflections and blurred headlights across wet pavement after a sudden tropical downpour.",
    takenDate: "2026-10-14",
    location: "Jl. Pettarani, Makassar",
    category: "STREET",
    camera: "28mm · f/1.8 · 1/60s",
    bentoSize: "square",
    tone: "obsidian",
  },
  {
    id: "photo-04",
    frame: "04",
    title: "LOW-END STAGE LIGHTS · BASS CHECK",
    description:
      "Vertical frame from soundcheck before an evening gig — tungsten rim light cutting through stage haze across the bass headstock.",
    takenDate: "2026-09-22",
    location: "Makassar Music Space",
    category: "STAGE",
    camera: "85mm · f/1.8 · 1/125s",
    bentoSize: "tall",
    tone: "amber",
  },
  {
    id: "photo-05",
    frame: "05",
    title: "MONOCHROME STEEL TRUSS STUDY",
    description:
      "High-contrast black-and-white study looking straight up through riveted steel diagonals and overhead tension members.",
    takenDate: "2026-08-30",
    location: "Makassar New Port Corridor",
    category: "MONOCHROME",
    camera: "35mm · f/5.6 · 1/640s",
    bentoSize: "square",
    tone: "slate",
  },
  {
    id: "photo-06",
    frame: "06",
    title: "GOLDEN HORIZON OVER CPI BRIDGE",
    description:
      "Wide golden-hour perspective capturing cable silhouettes and harbor breeze sweeping across the waterfront promenade.",
    takenDate: "2026-08-09",
    location: "Center Point of Indonesia, Makassar",
    category: "LANDSCAPE",
    camera: "24mm · f/2.8 · 1/250s",
    bentoSize: "wide",
    tone: "cobalt",
  },
];

export const EXPERIENCE = [
  {
    period: "2024 — NOW",
    role: "CIVIL ENGINEERING STUDENT",
    company: "BOSOWA UNIVERSITY · MAKASSAR",
    note: "Studying structural analysis, concrete & steel design, and construction systems while merging civil engineering logic with modern computational software.",
  },
  {
    period: "2024 — 2025",
    role: "FULL-STACK DEVELOPER",
    company: "PT. LINY JAYA INFORMATIKA",
    note: "Engineered production web applications, backend APIs, and database-driven platforms across modern frontend architecture and server infrastructure.",
  },
  {
    period: "2021 — 2025",
    role: "FREELANCE SOFTWARE DEVELOPER",
    company: "INDEPENDENT",
    note: "Built custom full-stack web apps, cross-platform mobile interfaces, and interactive visual experiences for clients and personal open-source releases.",
  },
  {
    period: "2021 — 2024",
    role: "SOFTWARE ENGINEERING (RPL)",
    company: "TELKOM VOCATIONAL SCHOOL",
    note: "Grounded in polyglot programming, web & mobile frameworks, relational & NoSQL databases, API design, and collaborative software delivery.",
  },
];

export const GATHER_SWATCHES: GatherSwatch[] = [
  { id: "cobalt", name: "Blueprint Cobalt", hex: "#3c6bff" },
  { id: "bone", name: "Concrete Bone", hex: "#ffe9c4" },
  { id: "ice", name: "Survey Ice", hex: "#c8e4ff" },
  { id: "amber", name: "Safety Amber", hex: "#ffaa44" },
  { id: "ember", name: "Stress Ember", hex: "#ff564a" },
  { id: "jade", name: "Terrain Jade", hex: "#3de8a5" },
  { id: "violet", name: "Laser Violet", hex: "#b084ff" },
];
