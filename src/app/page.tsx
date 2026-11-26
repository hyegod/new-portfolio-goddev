import { AboutSection } from "@/components/AboutSection";
import { ContactFooter } from "@/components/ContactFooter";
import { GallerySection } from "@/components/GallerySection";
import { HeroSection } from "@/components/HeroSection";
import { Navbar } from "@/components/Navbar";
import { PortfolioExperience } from "@/components/PortfolioExperience";
import { SelectedWorksSection } from "@/components/SelectedWorksSection";
import { SkillSection } from "@/components/SkillSection";
import { SloganSection } from "@/components/SloganSection";
import {
  getPortfolioPhotos,
  getPortfolioProjects,
} from "@/lib/db";

export const revalidate = 60;

export default async function HomePage() {
  const [projects, photos] = await Promise.all([
    getPortfolioProjects(),
    getPortfolioPhotos(),
  ]);

  return (
    <PortfolioExperience>
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <SloganSection />
        <SkillSection />
        <SelectedWorksSection projects={projects.slice(0, 4)} />
        <GallerySection photos={photos.slice(0, 6)} />
        <ContactFooter />
      </main>
    </PortfolioExperience>
  );
}
