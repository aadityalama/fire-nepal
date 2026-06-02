import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  FN_PENDING_VERIFY_COOKIE,
  FN_SESSION_COOKIE,
  FN_SESSION_MAX_AGE_SEC,
  FN_SESSION_SHORT_AGE_SEC,
} from "@/auth/constants";
import { getAuthSecret } from "@/auth/server/env";
import { pendingCookieActiveForEmail } from "@/auth/server/pending-verify-cookie";
import { signUserSession } from "@/auth/server/session-token";
import { assertLogin, toPublicUser, toSessionClaims } from "@/auth/server/user-store";
import { isLegacyAuthBlockedInProduction, legacyAuthNotPersistedResponse } from "@/auth/server/legacy-auth-production";
import type { ProductAuthUser } from "@/lib/product-auth-storage";

export const runtime = "nodejs";

type Body = {
  email?: string;
  password?: string;
  rememberMe?: boolean;
};

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

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const rememberMe = body.rememberMe === true;

  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const secret = getAuthSecret();
  const cookieStore = await cookies();
  const pendingRaw = cookieStore.get(FN_PENDING_VERIFY_COOKIE)?.value;
  if (pendingCookieActiveForEmail(pendingRaw, secret, email)) {
    return NextResponse.json(
      {
        error:
          "Verify your email to activate this account. Use the code we sent, or open the verification page and resend.",
      },
      { status: 403 },
    );
  }

  const stored = assertLogin(email, password);
  if (!stored) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const user: ProductAuthUser = toPublicUser(stored);
  const token = signUserSession(toSessionClaims(stored), secret);
  const maxAge = rememberMe ? FN_SESSION_MAX_AGE_SEC : FN_SESSION_SHORT_AGE_SEC;
  const res = NextResponse.json({ user });
  res.cookies.set(FN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
