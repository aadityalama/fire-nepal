import { NextResponse } from "next/server";
import { FN_SESSION_COOKIE, FN_SESSION_MAX_AGE_SEC } from "@/auth/constants";
import { getAuthSecret } from "@/auth/server/env";
import { signUserSession } from "@/auth/server/session-token";
import { toPublicUser, toSessionClaims, verifyOtpAndActivate } from "@/auth/server/user-store";
import type { ProductAuthUser } from "@/lib/product-auth-storage";

export const runtime = "nodejs";

type Body = {
  email?: string;
  code?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const code = typeof body.code === "string" ? body.code : "";
  const result = verifyOtpAndActivate(email, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const user: ProductAuthUser = toPublicUser(result.user);
  const token = signUserSession(toSessionClaims(result.user), getAuthSecret());
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
