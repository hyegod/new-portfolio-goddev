"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Database,
  HardDrive,
  ImagePlus,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import type {
  GalleryPlate,
  PointPresetId,
  ProjectItem,
} from "@/data/portfolio";

interface StorageStatus {
  dbConfigured: boolean;
  dbConnected: boolean;
  blobConfigured: boolean;
  projectCount: number;
  plateCount: number;
}

interface AdminStudioClientProps {
  initialAuthenticated: boolean;
  adminConfigured: boolean;
  initialStorage: StorageStatus;
  initialProjects: ProjectItem[];
  initialPlates: GalleryPlate[];
}

type ActiveTab = "works" | "gallery";

interface ProjectFormState {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  category: string;
  discipline: ProjectItem["discipline"];
  year: string;
  role: string;
  client: string;
  duration: string;
  preset: PointPresetId;
  summary: string;
  challenge: string;
  outcome: string;
  deliverablesText: string;
  metricsText: string;
  stackText: string;
  liveUrl: string;
  imageUrl: string;
}

interface GalleryFormState {
  id: string;
  code: string;
  title: string;
  category: string;
  filterGroup: GalleryPlate["filterGroup"];
  scale: string;
  coords: string;
  year: string;
  preset: PointPresetId;
  visualType: GalleryPlate["visualType"];
  caption: string;
  imageUrl: string;
}

function emptyProjectForm(nextIndex: number): ProjectFormState {
  return {
    id: "",
    index: String(nextIndex).padStart(2, "0"),
    title: "",
    subtitle: "",
    category: "CIVIL × SOFTWARE",
    discipline: "CIVIL × SOFTWARE",
    year: String(new Date().getFullYear()),
    role: "Civil & Software Developer",
    client: "Independent Build",
    duration: "2 MONTHS",
    preset: "bridge",
    summary: "",
    challenge: "",
    outcome: "",
    deliverablesText: "Interactive Web Platform\nTechnical Documentation",
    metricsText: "PERFORMANCE: 60 FPS\nSTATUS: PRODUCTION",
    stackText: "Next.js, TypeScript, Tailwind CSS",
    liveUrl: "",
    imageUrl: "",
  };
}

function projectToForm(p: ProjectItem): ProjectFormState {
  return {
    id: p.id,
    index: p.index,
    title: p.title,
    subtitle: p.subtitle,
    category: p.category,
    discipline: p.discipline,
    year: p.year,
    role: p.role,
    client: p.client,
    duration: p.duration,
    preset: p.preset,
    summary: p.summary,
    challenge: p.challenge,
    outcome: p.outcome,
    deliverablesText: p.deliverables.join("\n"),
    metricsText: p.metrics.map((m) => `${m.label}: ${m.value}`).join("\n"),
    stackText: p.stack.join(", "),
    liveUrl: p.liveUrl,
    imageUrl: p.imageUrl ?? "",
  };
}

function emptyGalleryForm(nextIndex: number): GalleryFormState {
  return {
    id: "",
    code: `FIG. ${String(nextIndex).padStart(2, "0")} // ARCHIVE`,
    title: "",
    category: "STRUCTURAL / PHOTO",
    filterGroup: "STRUCTURAL",
    scale: "PHOTO / PLATE",
    coords: "-5.1477° S, 119.4327° E",
    year: String(new Date().getFullYear()),
    preset: "bridge",
    visualType: "bridge-elevation",
    caption: "",
    imageUrl: "",
  };
}

function plateToForm(g: GalleryPlate): GalleryFormState {
  return {
    id: g.id,
    code: g.code,
    title: g.title,
    category: g.category,
    filterGroup: g.filterGroup,
    scale: g.scale,
    coords: g.coords,
    year: g.year,
    preset: g.preset,
    visualType: g.visualType,
    caption: g.caption,
    imageUrl: g.imageUrl ?? "",
  };
}

export function AdminStudioClient({
  initialAuthenticated,
  adminConfigured,
  initialStorage,
  initialProjects,
  initialPlates,
}: AdminStudioClientProps) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [storage, setStorage] = useState<StorageStatus>(initialStorage);
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [tab, setTab] = useState<ActiveTab>("works");
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects);
  const [plates, setPlates] = useState<GalleryPlate[]>(initialPlates);

  const [projectForm, setProjectForm] = useState<ProjectFormState>(() =>
    emptyProjectForm(initialProjects.length + 1)
  );
  const [galleryForm, setGalleryForm] = useState<GalleryFormState>(() =>
    emptyGalleryForm(initialPlates.length + 1)
  );

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const refreshAll = async () => {
    const [statusRes, projRes, plateRes] = await Promise.all([
      fetch("/api/admin/auth"),
      fetch("/api/admin/projects"),
      fetch("/api/admin/gallery"),
    ]);

    if (statusRes.ok) {
      const s = (await statusRes.json()) as {
        authenticated: boolean;
        storage: StorageStatus;
      };
      setAuthenticated(s.authenticated);
      setStorage(s.storage);
    }
    if (projRes.ok) {
      const p = (await projRes.json()) as { projects?: ProjectItem[] };
      if (Array.isArray(p.projects)) setProjects(p.projects);
    }
    if (plateRes.ok) {
      const g = (await plateRes.json()) as { plates?: GalleryPlate[] };
      if (Array.isArray(g.plates)) setPlates(g.plates);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setAuthLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setNotice({ type: "err", text: json.error ?? "Login gagal." });
        return;
      }
      setPassword("");
      setAuthenticated(true);
      await refreshAll();
    } catch {
      setNotice({ type: "err", text: "Gagal menghubungi server auth." });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthenticated(false);
    setProjects([]);
    setPlates([]);
    setNotice(null);
  };

  const handleSeed = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/seed", { method: "POST" });
      const json = (await res.json()) as {
        error?: string;
        projectsInserted?: number;
        platesInserted?: number;
      };
      if (!res.ok) {
        setNotice({ type: "err", text: json.error ?? "Seed gagal." });
        return;
      }
      await refreshAll();
      setNotice({
        type: "ok",
        text: `Neon Postgres siap! Ditambahkan ${json.projectsInserted ?? 0} Works & ${json.platesInserted ?? 0} Gallery plates.`,
      });
    } catch {
      setNotice({ type: "err", text: "Gagal menghubungi /api/admin/seed." });
    } finally {
      setBusy(false);
    }
  };

  const handleImageUpload = async (
    file: File | undefined,
    folder: "projects" | "gallery"
  ) => {
    if (!file) return;
    setUploading(true);
    setNotice(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setNotice({
          type: "err",
          text: json.error ?? "Upload ke Vercel Blob gagal.",
        });
        return;
      }
      if (folder === "projects") {
        setProjectForm((prev) => ({ ...prev, imageUrl: json.url! }));
      } else {
        setGalleryForm((prev) => ({ ...prev, imageUrl: json.url! }));
      }
      setNotice({
        type: "ok",
        text: "Gambar berhasil di-upload ke Vercel Blob!",
      });
    } catch {
      setNotice({ type: "err", text: "Upload gagal karena error jaringan." });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProject = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const deliverables = projectForm.deliverablesText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const metrics = projectForm.metricsText
        .split("\n")
        .map((line) => {
          const [label, ...rest] = line.split(":");
          return {
            label: (label ?? "").trim(),
            value: rest.join(":").trim(),
          };
        })
        .filter((m) => m.label && m.value);
      const stack = projectForm.stackText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: projectForm.id,
          index: projectForm.index,
          title: projectForm.title,
          subtitle: projectForm.subtitle,
          category: projectForm.category,
          discipline: projectForm.discipline,
          year: projectForm.year,
          role: projectForm.role,
          client: projectForm.client,
          duration: projectForm.duration,
          preset: projectForm.preset,
          summary: projectForm.summary,
          challenge: projectForm.challenge,
          outcome: projectForm.outcome,
          deliverables,
          metrics,
          stack,
          liveUrl: projectForm.liveUrl,
          imageUrl: projectForm.imageUrl || null,
        }),
      });
      const json = (await res.json()) as { error?: string; project?: ProjectItem };
      if (!res.ok) {
        setNotice({ type: "err", text: json.error ?? "Gagal menyimpan work." });
        return;
      }
      await refreshAll();
      if (json.project) setProjectForm(projectToForm(json.project));
      setNotice({
        type: "ok",
        text: `Work "${json.project?.title}" tersimpan di Neon Postgres & live di website!`,
      });
    } catch {
      setNotice({ type: "err", text: "Gagal menyimpan work." });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm(`Hapus project "${id}" dari Neon Postgres?`)) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/projects?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setNotice({ type: "err", text: json.error ?? "Gagal menghapus project." });
        return;
      }
      await refreshAll();
      if (projectForm.id === id) {
        setProjectForm(emptyProjectForm(projects.length));
      }
      setNotice({ type: "ok", text: `Project "${id}" berhasil dihapus.` });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveGallery = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: galleryForm.id,
          code: galleryForm.code,
          title: galleryForm.title,
          category: galleryForm.category,
          filterGroup: galleryForm.filterGroup,
          scale: galleryForm.scale,
          coords: galleryForm.coords,
          year: galleryForm.year,
          preset: galleryForm.preset,
          visualType: galleryForm.visualType,
          caption: galleryForm.caption,
          imageUrl: galleryForm.imageUrl || null,
        }),
      });
      const json = (await res.json()) as { error?: string; plate?: GalleryPlate };
      if (!res.ok) {
        setNotice({ type: "err", text: json.error ?? "Gagal menyimpan gallery." });
        return;
      }
      await refreshAll();
      if (json.plate) setGalleryForm(plateToForm(json.plate));
      setNotice({
        type: "ok",
        text: `Gallery "${json.plate?.title}" tersimpan di Neon Postgres & live di /gallery!`,
      });
    } catch {
      setNotice({ type: "err", text: "Gagal menyimpan gallery." });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteGallery = async (id: string) => {
    if (!window.confirm(`Hapus gallery item "${id}"?`)) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/gallery?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setNotice({ type: "err", text: json.error ?? "Gagal menghapus gallery." });
        return;
      }
      await refreshAll();
      if (galleryForm.id === id) {
        setGalleryForm(emptyGalleryForm(plates.length));
      }
      setNotice({ type: "ok", text: `Gallery "${id}" berhasil dihapus.` });
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-[#0D0E12] outline-none transition-colors focus:border-[#0038FF]";
  const labelClass =
    "block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#505562] uppercase mb-1.5";

  return (
    <section className="relative min-h-[85svh] px-3 pt-28 pb-20 min-[380px]:px-4 sm:px-8 sm:pt-32 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        {/* Top Studio Status Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-black/15 pb-6 lg:flex-row lg:items-end">
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] text-[#0038FF] uppercase">
              ADMIN STUDIO // NEON POSTGRES × VERCEL BLOB
            </p>
            <h1 className="mt-2 font-display text-[clamp(1.65rem,5vw,3.4rem)] leading-[0.96] font-extrabold tracking-tight text-[#0D0E12] uppercase">
              CONTENT <span className="text-[#0038FF]">CONSOLE</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 ${
                storage.dbConnected
                  ? "border-[#0038FF]/30 bg-[#0038FF]/10 text-[#0038FF]"
                  : "border-black/15 bg-white/75 text-[#505562]"
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              <span>
                NEON:{" "}
                {storage.dbConnected
                  ? `LIVE (${storage.projectCount}W · ${storage.plateCount}G)`
                  : storage.dbConfigured
                    ? "ERROR"
                    : "NOT CONNECTED"}
              </span>
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 ${
                storage.blobConfigured
                  ? "border-[#0038FF]/30 bg-[#0038FF]/10 text-[#0038FF]"
                  : "border-black/15 bg-white/75 text-[#505562]"
              }`}
            >
              <HardDrive className="h-3.5 w-3.5" />
              <span>BLOB: {storage.blobConfigured ? "READY" : "NOT CONNECTED"}</span>
            </span>

            {authenticated && (
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-[#0D0E12] px-3 py-1.5 text-white transition-colors hover:bg-[#0038FF]"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>LOGOUT</span>
              </button>
            )}
          </div>
        </div>

        {/* Toast / Status Banner */}
        {notice && (
          <div
            role="status"
            className={`mb-6 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 font-mono text-xs ${
              notice.type === "ok"
                ? "border-[#0038FF]/35 bg-[#0038FF]/10 text-[#0038FF]"
                : "border-red-500/35 bg-red-500/10 text-red-700"
            }`}
          >
            <span>{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss notification"
              className="shrink-0 opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Unauthenticated Login Gate */}
        {!authenticated ? (
          <div className="mx-auto max-w-lg">
            <div className="glass-vellum rounded-2xl border border-black/15 p-6 shadow-[0_20px_50px_-20px_rgba(13,14,18,0.14)] sm:p-8">
              <div className="flex items-center gap-2.5 font-mono text-[10.5px] font-semibold tracking-[0.2em] text-[#0038FF] uppercase">
                <Lock className="h-4 w-4" />
                <span>PROTECTED ACCESS</span>
              </div>

              <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-[#0D0E12] uppercase">
                UNLOCK ADMIN STUDIO
              </h2>

              {!adminConfigured && (
                <div className="mt-4 rounded-xl border border-black/12 bg-white/80 p-4 text-xs leading-relaxed text-[#3B404D]">
                  <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#0038FF] uppercase">
                    SETUP CHECKLIST DI VERCEL DASHBOARD
                  </p>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                    <li>
                      Buka Vercel Dashboard → project{" "}
                      <strong>new-portfolio-goddev</strong> → tab{" "}
                      <strong>Storage</strong> → klik <strong>Create Database</strong>{" "}
                      → pilih <strong>Neon</strong> &amp; <strong>Blob</strong>.
                    </li>
                    <li>
                      Masuk ke <strong>Settings → Environment Variables</strong>,
                      tambahkan <code>ADMIN_PASSWORD</code> dengan password pilihan Anda.
                    </li>
                    <li>
                      Klik <strong>Redeploy</strong> sekali agar env var aktif, lalu login di halaman ini.
                    </li>
                  </ol>
                </div>
              )}

              <form onSubmit={(e) => void handleLogin(e)} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="admin-password" className={labelClass}>
                    ADMIN PASSWORD
                  </label>
                  <input
                    id="admin-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter ADMIN_PASSWORD..."
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading || !adminConfigured}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0038FF] px-4 py-3 font-mono text-xs font-semibold tracking-[0.18em] text-white uppercase transition-colors hover:bg-[#0D0E12] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{authLoading ? "VERIFYING..." : "UNLOCK STUDIO"}</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Authenticated CMS Studio */
          <div className="space-y-6">
            {/* Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTab("works")}
                  className={`rounded-lg border px-4 py-2 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors ${
                    tab === "works"
                      ? "border-[#0038FF] bg-[#0038FF] text-white"
                      : "border-black/15 bg-white/80 text-[#0D0E12] hover:border-[#0038FF]"
                  }`}
                >
                  WORKS ({projects.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab("gallery")}
                  className={`rounded-lg border px-4 py-2 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors ${
                    tab === "gallery"
                      ? "border-[#0038FF] bg-[#0038FF] text-white"
                      : "border-black/15 bg-white/80 text-[#0D0E12] hover:border-[#0038FF]"
                  }`}
                >
                  GALLERY ({plates.length})
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy || !storage.dbConfigured}
                  onClick={() => void handleSeed()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#0038FF]/40 bg-[#0038FF]/10 px-3.5 py-2 font-mono text-[10px] font-semibold tracking-[0.15em] text-[#0038FF] uppercase transition-colors hover:bg-[#0038FF] hover:text-white disabled:opacity-45"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
                  <span>INIT &amp; SEED DEFAULTS</span>
                </button>
                <Link
                  href={tab === "works" ? "/works" : "/gallery"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white/80 px-3.5 py-2 font-mono text-[10px] font-semibold tracking-[0.15em] text-[#0D0E12] uppercase hover:border-[#0038FF] hover:text-[#0038FF]"
                >
                  <span>VIEW LIVE</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {tab === "works" ? (
              <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
                {/* Works List */}
                <div className="space-y-2.5 rounded-2xl border border-black/12 bg-white/80 p-4">
                  <div className="flex items-center justify-between pb-2">
                    <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-[#505562] uppercase">
                      NEON WORKS RECORDS
                    </span>
                    <button
                      type="button"
                      onClick={() => setProjectForm(emptyProjectForm(projects.length + 1))}
                      className="inline-flex items-center gap-1 rounded-md bg-[#0D0E12] px-2.5 py-1 font-mono text-[9.5px] font-semibold tracking-[0.14em] text-white uppercase hover:bg-[#0038FF]"
                    >
                      <Plus className="h-3 w-3" />
                      <span>NEW</span>
                    </button>
                  </div>

                  {projects.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-black/15 p-4 text-xs text-[#505562]">
                      Belum ada data di Neon Postgres (website saat ini menampilkan 4 data default). Klik{" "}
                      <strong>INIT &amp; SEED DEFAULTS</strong> untuk menyalin 4 project awal ke database, atau langsung buat project baru di sebelah kanan.
                    </p>
                  ) : (
                    projects.map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between gap-2 rounded-xl border p-3 transition-colors ${
                          projectForm.id === p.id
                            ? "border-[#0038FF] bg-[#0038FF]/[0.06]"
                            : "border-black/10 bg-white hover:border-black/25"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setProjectForm(projectToForm(p))}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="font-mono text-[9.5px] text-[#0038FF] uppercase">
                            {p.index} // {p.year}
                          </p>
                          <p className="truncate font-display text-sm font-extrabold text-[#0D0E12] uppercase">
                            {p.title}
                          </p>
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          <Link
                            href={`/works/${p.id}`}
                            aria-label={`View ${p.title}`}
                            className="grid h-7 w-7 place-items-center rounded-md border border-black/12 text-[#0D0E12] hover:border-[#0038FF] hover:text-[#0038FF]"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleDeleteProject(p.id)}
                            aria-label={`Delete ${p.title}`}
                            className="grid h-7 w-7 place-items-center rounded-md border border-black/12 text-red-600 hover:border-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Works Editor Form */}
                <form
                  onSubmit={(e) => void handleSaveProject(e)}
                  className="space-y-4 rounded-2xl border border-black/12 bg-white/85 p-5 sm:p-7"
                >
                  <div className="flex items-center justify-between border-b border-black/10 pb-3">
                    <h2 className="font-display text-lg font-extrabold text-[#0D0E12] uppercase">
                      {projectForm.id ? `EDIT WORK: ${projectForm.id}` : "CREATE NEW WORK"}
                    </h2>
                    <span className="font-mono text-[10px] text-[#0038FF] uppercase">
                      AUTO-REVALIDATES LIVE SITE
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>TITLE *</label>
                      <input
                        required
                        value={projectForm.title}
                        onChange={(e) =>
                          setProjectForm((p) => ({ ...p, title: e.target.value }))
                        }
                        placeholder="STRUXFLOW SPAN"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>SLUG (AUTO IF EMPTY)</label>
                      <input
                        value={projectForm.id}
                        onChange={(e) =>
                          setProjectForm((p) => ({ ...p, id: e.target.value }))
                        }
                        placeholder="struxflow"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-4">
                    <div>
                      <label className={labelClass}>INDEX</label>
                      <input
                        value={projectForm.index}
                        onChange={(e) =>
                          setProjectForm((p) => ({ ...p, index: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>YEAR</label>
                      <input
                        value={projectForm.year}
                        onChange={(e) =>
                          setProjectForm((p) => ({ ...p, year: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>DISCIPLINE</label>
                      <select
                        value={projectForm.discipline}
                        onChange={(e) =>
                          setProjectForm((p) => ({
                            ...p,
                            discipline: e.target.value as ProjectItem["discipline"],
                            category: e.target.value,
                          }))
                        }
                        className={inputClass}
                      >
                        <option value="STRUCTURAL / WEBGL">STRUCTURAL / WEBGL</option>
                        <option value="CIVIL × SOFTWARE">CIVIL × SOFTWARE</option>
                        <option value="COMPUTATIONAL BIM">COMPUTATIONAL BIM</option>
                        <option value="SOFTWARE / GIS">SOFTWARE / GIS</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>3D SPECIMEN</label>
                      <select
                        value={projectForm.preset}
                        onChange={(e) =>
                          setProjectForm((p) => ({
                            ...p,
                            preset: e.target.value as PointPresetId,
                          }))
                        }
                        className={inputClass}
                      >
                        <option value="bridge">BRIDGE</option>
                        <option value="terrain">TERRAIN</option>
                        <option value="tower">TOWER</option>
                        <option value="shell">SHELL</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>SUBTITLE</label>
                    <input
                      value={projectForm.subtitle}
                      onChange={(e) =>
                        setProjectForm((p) => ({ ...p, subtitle: e.target.value }))
                      }
                      placeholder="Short one-line subtitle..."
                      className={inputClass}
                    />
                  </div>

                  {/* Cover Image Upload -> Vercel Blob */}
                  <div className="rounded-xl border border-dashed border-black/20 bg-[#F6F7F9] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#0D0E12] uppercase">
                        COVER IMAGE (VERCEL BLOB · OPTIONAL)
                      </span>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#0038FF] px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.14em] text-white uppercase hover:bg-[#0D0E12]">
                        <ImagePlus className="h-3.5 w-3.5" />
                        <span>{uploading ? "UPLOADING..." : "UPLOAD IMAGE"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploading}
                          className="sr-only"
                          onChange={(e) => {
                            void handleImageUpload(e.target.files?.[0], "projects");
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>

                    {projectForm.imageUrl && (
                      <div className="mt-3 flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={projectForm.imageUrl}
                          alt="Cover preview"
                          className="h-16 w-28 rounded-lg border border-black/15 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-[10px] text-[#505562]">
                            {projectForm.imageUrl}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setProjectForm((p) => ({ ...p, imageUrl: "" }))
                            }
                            className="mt-1 font-mono text-[10px] font-semibold text-red-600 uppercase hover:underline"
                          >
                            REMOVE IMAGE
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>SUMMARY *</label>
                    <textarea
                      required
                      rows={3}
                      value={projectForm.summary}
                      onChange={(e) =>
                        setProjectForm((p) => ({ ...p, summary: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>CHALLENGE</label>
                      <textarea
                        rows={3}
                        value={projectForm.challenge}
                        onChange={(e) =>
                          setProjectForm((p) => ({ ...p, challenge: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>OUTCOME</label>
                      <textarea
                        rows={3}
                        value={projectForm.outcome}
                        onChange={(e) =>
                          setProjectForm((p) => ({ ...p, outcome: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className={labelClass}>ROLE</label>
                      <input
                        value={projectForm.role}
                        onChange={(e) =>
                          setProjectForm((p) => ({ ...p, role: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>CLIENT / CONTEXT</label>
                      <input
                        value={projectForm.client}
                        onChange={(e) =>
                          setProjectForm((p) => ({ ...p, client: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>DURATION</label>
                      <input
                        value={projectForm.duration}
                        onChange={(e) =>
                          setProjectForm((p) => ({ ...p, duration: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>TECH STACK (COMMA SEPARATED)</label>
                      <input
                        value={projectForm.stackText}
                        onChange={(e) =>
                          setProjectForm((p) => ({ ...p, stackText: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>LIVE / GALLERY URL</label>
                      <input
                        value={projectForm.liveUrl}
                        onChange={(e) =>
                          setProjectForm((p) => ({ ...p, liveUrl: e.target.value }))
                        }
                        placeholder="/gallery?preset=bridge"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>DELIVERABLES (1 PER LINE)</label>
                      <textarea
                        rows={3}
                        value={projectForm.deliverablesText}
                        onChange={(e) =>
                          setProjectForm((p) => ({
                            ...p,
                            deliverablesText: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>METRICS (LABEL: VALUE · 1 PER LINE)</label>
                      <textarea
                        rows={3}
                        value={projectForm.metricsText}
                        onChange={(e) =>
                          setProjectForm((p) => ({
                            ...p,
                            metricsText: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy || !storage.dbConfigured}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0038FF] px-5 py-3 font-mono text-xs font-semibold tracking-[0.18em] text-white uppercase transition-colors hover:bg-[#0D0E12] disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{busy ? "SAVING..." : "SAVE WORK TO NEON"}</span>
                  </button>
                </form>
              </div>
            ) : (
              /* Gallery Manager */
              <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
                <div className="space-y-2.5 rounded-2xl border border-black/12 bg-white/80 p-4">
                  <div className="flex items-center justify-between pb-2">
                    <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-[#505562] uppercase">
                      NEON GALLERY RECORDS
                    </span>
                    <button
                      type="button"
                      onClick={() => setGalleryForm(emptyGalleryForm(plates.length + 1))}
                      className="inline-flex items-center gap-1 rounded-md bg-[#0D0E12] px-2.5 py-1 font-mono text-[9.5px] font-semibold tracking-[0.14em] text-white uppercase hover:bg-[#0038FF]"
                    >
                      <Plus className="h-3 w-3" />
                      <span>NEW</span>
                    </button>
                  </div>

                  {plates.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-black/15 p-4 text-xs text-[#505562]">
                      Belum ada data gallery di Neon. Klik{" "}
                      <strong>INIT &amp; SEED DEFAULTS</strong> atau upload foto/plate baru di sebelah kanan.
                    </p>
                  ) : (
                    plates.map((g) => (
                      <div
                        key={g.id}
                        className={`flex items-center justify-between gap-2 rounded-xl border p-3 transition-colors ${
                          galleryForm.id === g.id
                            ? "border-[#0038FF] bg-[#0038FF]/[0.06]"
                            : "border-black/10 bg-white hover:border-black/25"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setGalleryForm(plateToForm(g))}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="font-mono text-[9.5px] text-[#0038FF] uppercase">
                            {g.code}
                          </p>
                          <p className="truncate font-display text-sm font-extrabold text-[#0D0E12] uppercase">
                            {g.title}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteGallery(g.id)}
                          aria-label={`Delete ${g.title}`}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-black/12 text-red-600 hover:border-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Gallery Form */}
                <form
                  onSubmit={(e) => void handleSaveGallery(e)}
                  className="space-y-4 rounded-2xl border border-black/12 bg-white/85 p-5 sm:p-7"
                >
                  <div className="flex items-center justify-between border-b border-black/10 pb-3">
                    <h2 className="font-display text-lg font-extrabold text-[#0D0E12] uppercase">
                      {galleryForm.id
                        ? `EDIT GALLERY: ${galleryForm.id}`
                        : "ADD PHOTO / BLUEPRINT PLATE"}
                    </h2>
                    <span className="font-mono text-[10px] text-[#0038FF] uppercase">
                      VERCEL BLOB STORAGE
                    </span>
                  </div>

                  {/* Photo / Blueprint Upload -> Vercel Blob */}
                  <div className="rounded-xl border border-dashed border-black/20 bg-[#F6F7F9] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#0D0E12] uppercase">
                        UPLOAD PHOTO OR BLUEPRINT (JPG / PNG / WEBP · MAX 10MB)
                      </span>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#0038FF] px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.14em] text-white uppercase hover:bg-[#0D0E12]">
                        <ImagePlus className="h-3.5 w-3.5" />
                        <span>{uploading ? "UPLOADING..." : "CHOOSE IMAGE"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploading}
                          className="sr-only"
                          onChange={(e) => {
                            void handleImageUpload(e.target.files?.[0], "gallery");
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>

                    {galleryForm.imageUrl && (
                      <div className="mt-3 flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={galleryForm.imageUrl}
                          alt="Gallery preview"
                          className="h-16 w-28 rounded-lg border border-black/15 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-[10px] text-[#505562]">
                            {galleryForm.imageUrl}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setGalleryForm((g) => ({ ...g, imageUrl: "" }))
                            }
                            className="mt-1 font-mono text-[10px] font-semibold text-red-600 uppercase hover:underline"
                          >
                            REMOVE IMAGE
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>TITLE *</label>
                      <input
                        required
                        value={galleryForm.title}
                        onChange={(e) =>
                          setGalleryForm((g) => ({ ...g, title: e.target.value }))
                        }
                        placeholder="MAKASSAR BRIDGE SITE STUDY"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>CODE</label>
                      <input
                        value={galleryForm.code}
                        onChange={(e) =>
                          setGalleryForm((g) => ({ ...g, code: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-4">
                    <div>
                      <label className={labelClass}>FILTER GROUP</label>
                      <select
                        value={galleryForm.filterGroup}
                        onChange={(e) =>
                          setGalleryForm((g) => ({
                            ...g,
                            filterGroup: e.target.value as GalleryPlate["filterGroup"],
                          }))
                        }
                        className={inputClass}
                      >
                        <option value="STRUCTURAL">STRUCTURAL</option>
                        <option value="GEOSPATIAL">GEOSPATIAL</option>
                        <option value="COMPUTATIONAL">COMPUTATIONAL</option>
                        <option value="SOFTWARE">SOFTWARE</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>CATEGORY</label>
                      <input
                        value={galleryForm.category}
                        onChange={(e) =>
                          setGalleryForm((g) => ({ ...g, category: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>YEAR</label>
                      <input
                        value={galleryForm.year}
                        onChange={(e) =>
                          setGalleryForm((g) => ({ ...g, year: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>LINKED 3D PRESET</label>
                      <select
                        value={galleryForm.preset}
                        onChange={(e) =>
                          setGalleryForm((g) => ({
                            ...g,
                            preset: e.target.value as PointPresetId,
                          }))
                        }
                        className={inputClass}
                      >
                        <option value="bridge">BRIDGE</option>
                        <option value="terrain">TERRAIN</option>
                        <option value="tower">TOWER</option>
                        <option value="shell">SHELL</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>SCALE / METADATA</label>
                      <input
                        value={galleryForm.scale}
                        onChange={(e) =>
                          setGalleryForm((g) => ({ ...g, scale: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>COORDINATES / TAG</label>
                      <input
                        value={galleryForm.coords}
                        onChange={(e) =>
                          setGalleryForm((g) => ({ ...g, coords: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>CAPTION *</label>
                    <textarea
                      required
                      rows={3}
                      value={galleryForm.caption}
                      onChange={(e) =>
                        setGalleryForm((g) => ({ ...g, caption: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy || !storage.dbConfigured}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0038FF] px-5 py-3 font-mono text-xs font-semibold tracking-[0.18em] text-white uppercase transition-colors hover:bg-[#0D0E12] disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{busy ? "SAVING..." : "SAVE GALLERY TO NEON"}</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
