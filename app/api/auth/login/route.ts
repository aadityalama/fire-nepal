import { NextResponse } from "next/server";
import { FN_SESSION_COOKIE, FN_SESSION_MAX_AGE_SEC, FN_SESSION_SHORT_AGE_SEC } from "@/auth/constants";
import { getAuthSecret } from "@/auth/server/env";
import { signUserSession } from "@/auth/server/session-token";
import { assertLogin, hasPendingVerification, toPublicUser, toSessionClaims } from "@/auth/server/user-store";
import type { ProductAuthUser } from "@/lib/product-auth-storage";

export const runtime = "nodejs";

type Body = {
  email?: string;
  password?: string;
  rememberMe?: boolean;
};

export async function POST(req: Request) {
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

  if (hasPendingVerification(email)) {
    return NextResponse.json(
      { error: "Verify your email to activate this account. Use the link from sign up, or open the verification page." },
      { status: 403 },
    );
  }

  const stored = assertLogin(email, password);
  if (!stored) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const user: ProductAuthUser = toPublicUser(stored);
  const token = signUserSession(toSessionClaims(stored), getAuthSecret());
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
