import type { Metadata } from "next";
import { ContactFooter } from "@/components/ContactFooter";
import { Navbar } from "@/components/Navbar";
import { PortfolioExperience } from "@/components/PortfolioExperience";
import { WorksArchiveClient } from "@/components/WorksArchiveClient";
import { PORTFOLIO_PROFILE } from "@/data/portfolio";

export const metadata: Metadata = {
  title: `Works — ${PORTFOLIO_PROFILE.fullName}`,
  description:
    "Complete archive of civil engineering software, BIM automation pipelines, WebGL 3D digital twins, and open-source GitHub repositories.",
};

export default function WorksPage() {
  return (
    <PortfolioExperience>
      <Navbar />
      <main>
        <WorksArchiveClient />
      </main>
      <ContactFooter />
    </PortfolioExperience>
  );
}
