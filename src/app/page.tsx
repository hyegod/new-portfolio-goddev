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
  getPortfolioGalleryPlates,
  getPortfolioProjects,
} from "@/lib/db";

export const revalidate = 60;

export default async function HomePage() {
  const [projects, plates] = await Promise.all([
    getPortfolioProjects(),
    getPortfolioGalleryPlates(),
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
        <GallerySection plates={plates.slice(0, 6)} />
        <ContactFooter />
      </main>
    </PortfolioExperience>
  );
}
