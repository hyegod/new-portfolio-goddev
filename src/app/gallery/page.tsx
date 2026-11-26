import type { Metadata } from "next";
import { ContactFooter } from "@/components/ContactFooter";
import { GallerySection } from "@/components/GallerySection";
import { Navbar } from "@/components/Navbar";
import { PortfolioExperience } from "@/components/PortfolioExperience";
import { PORTFOLIO_PROFILE } from "@/data/portfolio";
import { getPortfolioPhotos } from "@/lib/db";

export const revalidate = 60;

export const metadata: Metadata = {
  title: `Photo Gallery — ${PORTFOLIO_PROFILE.fullName}`,
  description:
    "Personal photography bento gallery — street, architecture, coastal light, and stage frames with story, date, and location.",
};

export default async function GalleryPage() {
  const photos = await getPortfolioPhotos();

  return (
    <PortfolioExperience>
      <Navbar />
      <main>
        <GallerySection standalone photos={photos} />
      </main>
      <ContactFooter />
    </PortfolioExperience>
  );
}
