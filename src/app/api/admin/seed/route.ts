import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { isDatabaseConfigured, seedDefaultPortfolioData } from "@/lib/db";
import { revalidatePortfolioPages } from "@/lib/revalidate";

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "DATABASE_URL belum terhubung. Hubungkan Neon Postgres di Vercel Storage lalu redeploy.",
      },
      { status: 503 }
    );
  }

  try {
    const result = await seedDefaultPortfolioData();
    revalidatePortfolioPages();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to initialize Neon tables";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
