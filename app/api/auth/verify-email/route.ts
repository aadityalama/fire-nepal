import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { FN_PENDING_VERIFY_COOKIE, FN_SESSION_COOKIE, FN_SESSION_MAX_AGE_SEC } from "@/auth/constants";
import { getAuthSecret } from "@/auth/server/env";
import { parsePendingVerifyCookie } from "@/auth/server/pending-verify-cookie";
import { signUserSession } from "@/auth/server/session-token";
import { toPublicUser, toSessionClaims, verifyOtpAndActivate } from "@/auth/server/user-store";
import { isLegacyAuthBlockedInProduction, legacyAuthNotPersistedResponse } from "@/auth/server/legacy-auth-production";
import type { ProductAuthUser } from "@/lib/product-auth-storage";

export const runtime = "nodejs";

type Body = {
  email?: string;
  code?: string;
};

function clearPendingCookie(res: NextResponse) {
  res.cookies.set(FN_PENDING_VERIFY_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function POST(req: Request) {
  if (isLegacyAuthBlockedInProduction()) {
    return legacyAuthNotPersistedResponse();
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const code = typeof body.code === "string" ? body.code : "";
  const secret = getAuthSecret();
  const cookieStore = await cookies();
  const raw = cookieStore.get(FN_PENDING_VERIFY_COOKIE)?.value;
  const pending = parsePendingVerifyCookie(raw, secret);

  const result = verifyOtpAndActivate(email, code, pending, secret);

  if (!result.ok) {
    const res = NextResponse.json({ error: result.error }, { status: 400 });
    if (!pending && raw) {
      clearPendingCookie(res);
    }
    return res;
  }

  const user: ProductAuthUser = toPublicUser(result.user);
  const token = signUserSession(toSessionClaims(result.user), secret);
  const res = NextResponse.json({ user });
  clearPendingCookie(res);
  res.cookies.set(FN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: FN_SESSION_MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
