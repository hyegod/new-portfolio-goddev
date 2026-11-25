import { AboutSection } from "@/components/AboutSection";
import { ContactFooter } from "@/components/ContactFooter";
import { GallerySection } from "@/components/GallerySection";
import { HeroSection } from "@/components/HeroSection";
import { Navbar } from "@/components/Navbar";
import { PortfolioExperience } from "@/components/PortfolioExperience";
import { SelectedWorksSection } from "@/components/SelectedWorksSection";
import { SkillSection } from "@/components/SkillSection";
import { SloganSection } from "@/components/SloganSection";

export default function HomePage() {
  return (
    <PortfolioExperience>
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <SloganSection />
        <SkillSection />
        <SelectedWorksSection />
        <GallerySection />
        <ContactFooter />
      </main>
    </PortfolioExperience>
  );
}
