import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminCookieOptions,
  isAdminAuthenticated,
  isAdminPasswordConfigured,
  verifyAdminPassword,
} from "@/lib/adminAuth";
import { getStorageStatus } from "@/lib/db";

export async function GET() {
  const authenticated = await isAdminAuthenticated();
  const adminConfigured = isAdminPasswordConfigured();
  const storage = await getStorageStatus();

  return NextResponse.json({
    authenticated,
    adminConfigured,
    storage,
  });
}

export async function POST(request: Request) {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json(
      {
        error:
          "ADMIN_PASSWORD belum diset. Tambahkan environment variable ADMIN_PASSWORD di Vercel Project Settings lalu redeploy.",
      },
      { status: 503 }
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }

  const token = createAdminSessionToken();
  const res = NextResponse.json({ authenticated: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, getAdminCookieOptions());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ authenticated: false });
  res.cookies.set(ADMIN_COOKIE_NAME, "", {
    ...getAdminCookieOptions(),
    maxAge: 0,
  });
  return res;
}
