import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { FN_PENDING_VERIFY_COOKIE } from "@/auth/constants";
import { getAuthSecret } from "@/auth/server/env";
import {
  OTP_TTL_MS,
  parsePendingVerifyCookie,
  pendingCookieActiveForEmail,
  rotatePendingOtp,
} from "@/auth/server/pending-verify-cookie";
import { sendSignupVerificationOtpEmail } from "@/auth/server/verification-email";
import { isEmailRegistered } from "@/auth/server/user-store";
import { isLegacyAuthBlockedInProduction, legacyAuthNotPersistedResponse } from "@/auth/server/legacy-auth-production";
import { isResendApiKeyConfigured } from "@/lib/resend-api";

export const runtime = "nodejs";

type Body = { email?: string };

const PENDING_COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: Math.floor(OTP_TTL_MS / 1000),
  secure: process.env.NODE_ENV === "production",
};

function pendingCookieOptions(): typeof PENDING_COOKIE_BASE {
  return PENDING_COOKIE_BASE;
}

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

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (isEmailRegistered(email)) {
    const res = NextResponse.json({ error: "This email is already verified. Sign in instead." }, { status: 400 });
    clearPendingCookie(res);
    return res;
  }

  const secret = getAuthSecret();
  const cookieStore = await cookies();
  const raw = cookieStore.get(FN_PENDING_VERIFY_COOKIE)?.value;

  if (!pendingCookieActiveForEmail(raw, secret, email)) {
    console.info(
      "[FIRE Nepal auth][resend-verification]",
      JSON.stringify({ event: "no_pending_cookie", emailMatch: false }),
    );
    return NextResponse.json(
      { error: "No pending verification. Complete the sign-up form on this browser first." },
      { status: 400 },
    );
  }

  const prev = parsePendingVerifyCookie(raw, secret);
  if (!prev) {
    const res = NextResponse.json({ error: "Verification session expired. Sign up again." }, { status: 400 });
    clearPendingCookie(res);
    return res;
  }

  const rotated = rotatePendingOtp(secret, prev);
  if (!rotated.ok) {
    return NextResponse.json({ error: rotated.error }, { status: 400 });
  }

  const isProd = process.env.NODE_ENV === "production";
  const minutes = Math.ceil(OTP_TTL_MS / 60_000);

  if (isProd && !isResendApiKeyConfigured()) {
    console.error("[FIRE Nepal auth][resend-verification]", JSON.stringify({ event: "blocked_missing_resend" }));
    return NextResponse.json(
      {
        error:
          "Email verification is not configured on the server. Add RESEND_API_KEY and RESEND_FROM_EMAIL (or EMAIL_FROM).",
      },
      { status: 503 },
    );
  }

  if (!isProd && !isResendApiKeyConfigured()) {
    console.info(`[FIRE Nepal auth][resend-verification] dev OTP for ${email}: ${rotated.otp}`);
  } else {
    const sendRes = await sendSignupVerificationOtpEmail({
      toEmail: email,
      name: prev.name,
      otp: rotated.otp,
      expiresInMinutes: minutes,
    });
    if (!sendRes.ok) {
      return NextResponse.json({ error: `Could not resend email. ${sendRes.message}` }, { status: 502 });
    }
  }

  const payload: { ok: true; expiresAt: number; devCode?: string } = {
    ok: true,
    expiresAt: rotated.expiresAt,
  };
  if (process.env.NODE_ENV !== "production") {
    payload.devCode = rotated.otp;
  }

  const res = NextResponse.json(payload);
  res.cookies.set(FN_PENDING_VERIFY_COOKIE, rotated.cookieValue, pendingCookieOptions());
  return res;
}
