import type { Metadata } from "next";
import { ContactFooter } from "@/components/ContactFooter";
import { GallerySection } from "@/components/GallerySection";
import { Navbar } from "@/components/Navbar";
import { PortfolioExperience } from "@/components/PortfolioExperience";
import { PORTFOLIO_PROFILE } from "@/data/portfolio";
import { getPortfolioGalleryPlates } from "@/lib/db";

export const revalidate = 60;

export const metadata: Metadata = {
  title: `Gallery — ${PORTFOLIO_PROFILE.fullName}`,
  description:
    "Interactive 3D LiDAR point-cloud studio and complete technical blueprint & visual photography archive.",
};

export default async function GalleryPage() {
  const plates = await getPortfolioGalleryPlates();

  return (
    <PortfolioExperience>
      <Navbar />
      <main>
        <GallerySection standalone plates={plates} />
      </main>
      <ContactFooter />
    </PortfolioExperience>
  );
}
