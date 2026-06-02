import { NextResponse } from "next/server";
import { FN_PENDING_RESET_COOKIE } from "@/auth/constants";
import { getAuthSecret } from "@/auth/server/env";
import { isLegacyAuthBlockedInProduction, legacyAuthNotPersistedResponse } from "@/auth/server/legacy-auth-production";
import { OTP_TTL_MS } from "@/auth/server/pending-verify-cookie";
import { buildPendingResetCookie } from "@/auth/server/pending-reset-cookie";
import { sendPasswordResetOtpEmail } from "@/auth/server/password-reset-email";
import { getVerifiedUserByEmail } from "@/auth/server/user-store";
import { isResendApiKeyConfigured } from "@/lib/resend-api";

export const runtime = "nodejs";

type Body = { email?: string };

const RESET_COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: Math.floor(OTP_TTL_MS / 1000),
  secure: process.env.NODE_ENV === "production",
};

function resetCookieOptions(): typeof RESET_COOKIE_BASE {
  return RESET_COOKIE_BASE;
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
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const secret = getAuthSecret();
  const stored = getVerifiedUserByEmail(email);
  const isProd = process.env.NODE_ENV === "production";
  const minutes = Math.ceil(OTP_TTL_MS / 60_000);

  if (!stored) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ ok: true });
  }

  const built = buildPendingResetCookie({ secret, email });
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }

  if (isProd && !isResendApiKeyConfigured()) {
    console.error(
      "[FIRE Nepal auth][forgot-password]",
      JSON.stringify({ event: "blocked_missing_resend", reason: "RESEND_API_KEY required for password reset emails." }),
    );
    return NextResponse.json(
      {
        error:
          "Password reset email is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL (or EMAIL_FROM) in project settings.",
      },
      { status: 503 },
    );
  }

  if (!isProd && !isResendApiKeyConfigured()) {
    console.info(`[FIRE Nepal auth][forgot-password] dev OTP (no RESEND_API_KEY) for ${built.email}: ${built.otp}`);
  } else {
    const sendRes = await sendPasswordResetOtpEmail({
      toEmail: built.email,
      otp: built.otp,
      expiresInMinutes: minutes,
    });
    if (!sendRes.ok) {
      return NextResponse.json({ error: `Reset email could not be sent. ${sendRes.message}` }, { status: 502 });
    }
  }

  const payload: { ok: true; expiresAt: number; devCode?: string } = {
    ok: true,
    expiresAt: built.expiresAt,
  };
  if (process.env.NODE_ENV !== "production") {
    payload.devCode = built.otp;
  }

  const res = NextResponse.json(payload);
  res.cookies.set(FN_PENDING_RESET_COOKIE, built.cookieValue, resetCookieOptions());
  return res;
}
