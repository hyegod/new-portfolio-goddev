import { revalidatePath } from "next/cache";

export function revalidatePortfolioPages(projectSlug?: string) {
  revalidatePath("/");
  revalidatePath("/works");
  revalidatePath("/gallery");
  revalidatePath("/works/[slug]", "page");
  if (projectSlug) {
    revalidatePath(`/works/${projectSlug}`);
  }
}
