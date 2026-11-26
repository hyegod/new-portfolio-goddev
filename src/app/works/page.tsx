import type { Metadata } from "next";
import { ContactFooter } from "@/components/ContactFooter";
import { Navbar } from "@/components/Navbar";
import { PortfolioExperience } from "@/components/PortfolioExperience";
import { WorksArchiveClient } from "@/components/WorksArchiveClient";
import { PORTFOLIO_PROFILE } from "@/data/portfolio";
import {
  getPortfolioGalleryPlates,
  getPortfolioProjects,
} from "@/lib/db";

export const revalidate = 60;

export const metadata: Metadata = {
  title: `Works — ${PORTFOLIO_PROFILE.fullName}`,
  description:
    "Complete archive of civil engineering software, BIM pipelines, interactive 3D LiDAR & WebGPU shader lab, technical blueprint plates, and GitHub repositories.",
};

export default async function WorksPage() {
  const [projects, plates] = await Promise.all([
    getPortfolioProjects(),
    getPortfolioGalleryPlates(),
  ]);

  return (
    <PortfolioExperience>
      <Navbar />
      <main>
        <WorksArchiveClient projects={projects} plates={plates} />
      </main>
      <ContactFooter />
    </PortfolioExperience>
  );
}
