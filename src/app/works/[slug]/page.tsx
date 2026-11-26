import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactFooter } from "@/components/ContactFooter";
import { Navbar } from "@/components/Navbar";
import { PortfolioExperience } from "@/components/PortfolioExperience";
import { WorkCaseStudyClient } from "@/components/WorkCaseStudyClient";
import { PORTFOLIO_PROFILE, PROJECTS } from "@/data/portfolio";
import { getPortfolioProjects } from "@/lib/db";

export const revalidate = 60;

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const projects = await getPortfolioProjects();
  const project = projects.find((p) => p.id === slug);
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
  const projects = await getPortfolioProjects();
  const idx = projects.findIndex((p) => p.id === slug);
  if (idx < 0) {
    notFound();
  }

  const project = projects[idx];
  const prev = projects[(idx - 1 + projects.length) % projects.length];
  const next = projects[(idx + 1) % projects.length];

  return (
    <PortfolioExperience>
      <Navbar />
      <main>
        <WorkCaseStudyClient
          project={project}
          prevProject={prev}
          nextProject={next}
          totalProjects={projects.length}
        />
      </main>
      <ContactFooter />
    </PortfolioExperience>
  );
}
