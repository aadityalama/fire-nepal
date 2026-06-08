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

const LOG_PREFIX = "[FIRE Nepal auth][forgot-password]";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "(invalid)";
  const safeLocal = local.length <= 2 ? "***" : `${local.slice(0, 2)}…`;
  return `${safeLocal}@${domain}`;
}

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

  console.info(LOG_PREFIX, JSON.stringify({ event: "reset_request_received", email: maskEmail(email), mode: "legacy" }));

  const secret = getAuthSecret();
  const stored = getVerifiedUserByEmail(email);
  const isProd = process.env.NODE_ENV === "production";
  const minutes = Math.ceil(OTP_TTL_MS / 60_000);

  if (!stored) {
    console.info(LOG_PREFIX, JSON.stringify({ event: "no_legacy_user_ok_response", email: maskEmail(email) }));
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ ok: true });
  }

  const built = buildPendingResetCookie({ secret, email });
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }

  if (isProd && !isResendApiKeyConfigured()) {
    console.error(
      LOG_PREFIX,
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
    console.info(LOG_PREFIX, `dev OTP (no RESEND_API_KEY) for ${maskEmail(built.email)}: ${built.otp}`);
  } else {
    console.info(LOG_PREFIX, JSON.stringify({ event: "email_send_attempted", email: maskEmail(built.email) }));
    const sendRes = await sendPasswordResetOtpEmail({
      toEmail: built.email,
      otp: built.otp,
      expiresInMinutes: minutes,
    });
    if (!sendRes.ok) {
      console.error(
        LOG_PREFIX,
        JSON.stringify({ event: "email_send_failed", email: maskEmail(built.email), message: sendRes.message }),
      );
      return NextResponse.json({ error: `Reset email could not be sent. ${sendRes.message}` }, { status: 502 });
    }
    console.info(LOG_PREFIX, JSON.stringify({ event: "email_send_success", email: maskEmail(built.email) }));
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
