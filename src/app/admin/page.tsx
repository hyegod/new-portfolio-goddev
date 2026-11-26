import type { Metadata } from "next";
import { AdminStudioClient } from "@/components/AdminStudioClient";
import { Navbar } from "@/components/Navbar";
import { PortfolioExperience } from "@/components/PortfolioExperience";
import { PORTFOLIO_PROFILE } from "@/data/portfolio";
import { isAdminAuthenticated, isAdminPasswordConfigured } from "@/lib/adminAuth";
import {
  getPortfolioPhotosStrict,
  getPortfolioProjectsStrict,
  getStorageStatus,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Admin Studio — ${PORTFOLIO_PROFILE.brand}`,
  description: "Protected Neon Postgres & Vercel Blob content studio.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const [authenticated, adminConfigured, storage] = await Promise.all([
    isAdminAuthenticated(),
    Promise.resolve(isAdminPasswordConfigured()),
    getStorageStatus(),
  ]);

  const [initialProjects, initialPhotos] =
    authenticated && storage.dbConnected
      ? await Promise.all([
          getPortfolioProjectsStrict().catch(() => []),
          getPortfolioPhotosStrict().catch(() => []),
        ])
      : [[], []];

  return (
    <PortfolioExperience>
      <Navbar />
      <main>
        <AdminStudioClient
          initialAuthenticated={authenticated}
          adminConfigured={adminConfigured}
          initialStorage={storage}
          initialProjects={initialProjects}
          initialPhotos={initialPhotos}
        />
      </main>
    </PortfolioExperience>
  );
}
