import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactFooter } from "@/components/ContactFooter";
import { Navbar } from "@/components/Navbar";
import { PortfolioExperience } from "@/components/PortfolioExperience";
import { WorkCaseStudyClient } from "@/components/WorkCaseStudyClient";
import {
  getAdjacentProjects,
  getProjectBySlug,
  PORTFOLIO_PROFILE,
  PROJECTS,
} from "@/data/portfolio";

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) {
    return {
      title: `Work Not Found — ${PORTFOLIO_PROFILE.fullName}`,
    };
  }
  return {
    title: `${project.title} — Case Study | ${PORTFOLIO_PROFILE.fullName}`,
    description: project.summary,
  };
}

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) {
    notFound();
  }

  const { prev, next } = getAdjacentProjects(slug);

  return (
    <PortfolioExperience>
      <Navbar />
      <main>
        <WorkCaseStudyClient
          project={project}
          prevProject={prev}
          nextProject={next}
          totalProjects={PROJECTS.length}
        />
      </main>
      <ContactFooter />
    </PortfolioExperience>
  );
}
