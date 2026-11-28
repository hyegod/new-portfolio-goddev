import { AboutSection } from "@/components/AboutSection";
import { ContactFooter } from "@/components/ContactFooter";
import { HeroSection } from "@/components/HeroSection";
import { HomeGitHubHubSection } from "@/components/HomeGitHubHubSection";
import { Navbar } from "@/components/Navbar";
import { PortfolioExperience } from "@/components/PortfolioExperience";
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
        <HomeGitHubHubSection />
        <ContactFooter />
      </main>
    </PortfolioExperience>
  );
}
