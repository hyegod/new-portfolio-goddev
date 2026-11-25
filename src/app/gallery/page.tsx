import type { Metadata } from "next";
import { ContactFooter } from "@/components/ContactFooter";
import { GallerySection } from "@/components/GallerySection";
import { Navbar } from "@/components/Navbar";
import { PortfolioExperience } from "@/components/PortfolioExperience";
import { PORTFOLIO_PROFILE } from "@/data/portfolio";

export const metadata: Metadata = {
  title: `Gallery — ${PORTFOLIO_PROFILE.fullName}`,
  description:
    "Interactive 3D LiDAR point-cloud studio and complete technical blueprint drawing archive.",
};

export default function GalleryPage() {
  return (
    <PortfolioExperience>
      <Navbar />
      <main>
        <GallerySection standalone />
      </main>
      <ContactFooter />
    </PortfolioExperience>
  );
}
