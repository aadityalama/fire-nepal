import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { FN_PENDING_RESET_COOKIE, FN_SESSION_COOKIE, FN_SESSION_MAX_AGE_SEC } from "@/auth/constants";
import { getAuthSecret } from "@/auth/server/env";
import { isLegacyAuthBlockedInProduction, legacyAuthNotPersistedResponse } from "@/auth/server/legacy-auth-production";
import { parsePendingResetCookie, verifyResetOtpAgainstProof } from "@/auth/server/pending-reset-cookie";
import { signUserSession } from "@/auth/server/session-token";
import {
  getVerifiedUserByEmail,
  toPublicUser,
  toSessionClaims,
  updateVerifiedUserPassword,
} from "@/auth/server/user-store";
import type { ProductAuthUser } from "@/lib/product-auth-storage";

export const runtime = "nodejs";

type Body = {
  email?: string;
  code?: string;
  password?: string;
  confirmPassword?: string;
};

function clearResetCookie(res: NextResponse) {
  res.cookies.set(FN_PENDING_RESET_COOKIE, "", {
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

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body.code === "string" ? body.code.replace(/\D/g, "").slice(0, 6) : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (code.length !== 6) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Use at least 6 characters for your password." }, { status: 400 });
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const secret = getAuthSecret();
  const cookieStore = await cookies();
  const raw = cookieStore.get(FN_PENDING_RESET_COOKIE)?.value;
  const pending = parsePendingResetCookie(raw, secret);

  if (!pending || pending.email !== email) {
    const res = NextResponse.json(
      { error: "No active reset for this email. Request a new code from forgot password." },
      { status: 400 },
    );
    if (raw) clearResetCookie(res);
    return res;
  }

  if (!verifyResetOtpAgainstProof(secret, email, code, pending.otpProof)) {
    return NextResponse.json({ error: "Invalid or expired reset code." }, { status: 400 });
  }

  const existing = getVerifiedUserByEmail(email);
  if (!existing) {
    const res = NextResponse.json({ error: "Account not found. Sign up to create one." }, { status: 400 });
    clearResetCookie(res);
    return res;
  }

  const updated = updateVerifiedUserPassword(email, password);
  if (!updated) {
    const res = NextResponse.json({ error: "Could not update password." }, { status: 500 });
    clearResetCookie(res);
    return res;
  }

  const user: ProductAuthUser = toPublicUser(updated);
  const token = signUserSession(toSessionClaims(updated), secret);
  const res = NextResponse.json({ user });
  clearResetCookie(res);
  res.cookies.set(FN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: FN_SESSION_MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
