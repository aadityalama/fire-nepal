import { NextResponse } from "next/server";
import { FN_SESSION_COOKIE, FN_SESSION_MAX_AGE_SEC } from "@/auth/constants";
import { getAuthSecret } from "@/auth/server/env";
import { signUserSession } from "@/auth/server/session-token";
import { canSyncLegacySession, getVerifiedUserByEmail, toPublicUser, toSessionClaims } from "@/auth/server/user-store";
import type { ProductAuthSession } from "@/lib/product-auth-storage";

export const runtime = "nodejs";

/**
 * One-way migration: promote a valid client-stored session into an httpOnly cookie.
 * Only allowed when the user already exists in the server directory (same id + email).
 */
export async function POST(req: Request) {
  let body: { session?: ProductAuthSession };
  try {
    body = (await req.json()) as { session?: ProductAuthSession };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const s = body.session;
  if (!s || s.version !== 1 || !s.user?.id || !s.user.email) {
    return NextResponse.json({ error: "Invalid session payload." }, { status: 400 });
  }

  if (!canSyncLegacySession(s.user.email, s.user.id)) {
    return NextResponse.json({ error: "Session is not recognized. Please sign in again." }, { status: 401 });
  }

  const stored = getVerifiedUserByEmail(s.user.email);
  if (!stored) {
    return NextResponse.json({ error: "Session is not recognized. Please sign in again." }, { status: 401 });
  }

  const token = signUserSession(toSessionClaims(stored), getAuthSecret());
  const user = toPublicUser(stored);
  const res = NextResponse.json({ user });
  res.cookies.set(FN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: FN_SESSION_MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
