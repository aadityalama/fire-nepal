import { NextResponse } from "next/server";
import { FN_PENDING_VERIFY_COOKIE } from "@/auth/constants";
import { getAuthSecret } from "@/auth/server/env";
import { buildPendingSignupCookie, OTP_TTL_MS } from "@/auth/server/pending-verify-cookie";
import { sendSignupVerificationOtpEmail } from "@/auth/server/verification-email";
import { isEmailRegistered } from "@/auth/server/user-store";
import { isResendApiKeyConfigured } from "@/lib/resend-api";

export const runtime = "nodejs";

const MAX_AVATAR_CHARS = 6_800_000; // ~5MB base64 data URL headroom

type Body = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  avatarUrl?: string | null;
};

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

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  let avatarUrl: string | null =
    typeof body.avatarUrl === "string" && body.avatarUrl.length > 0 ? body.avatarUrl : null;
  if (avatarUrl && avatarUrl.length > MAX_AVATAR_CHARS) {
    return NextResponse.json({ error: "Profile image is too large (max 5MB)." }, { status: 400 });
  }

  if (name.length < 2) {
    return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Use at least 6 characters for your password." }, { status: 400 });
  }
  if (confirmPassword !== password) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  if (isEmailRegistered(email)) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
  }

  const secret = getAuthSecret();
  const built = buildPendingSignupCookie({ secret, name, email, password, avatarUrl });
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }

  const isProd = process.env.NODE_ENV === "production";
  const minutes = Math.ceil(OTP_TTL_MS / 60_000);

  if (isProd && !isResendApiKeyConfigured()) {
    console.error(
      "[FIRE Nepal auth][signup]",
      JSON.stringify({
        event: "blocked_missing_resend",
        reason: "RESEND_API_KEY is required in production to deliver verification OTPs.",
      }),
    );
    return NextResponse.json(
      {
        error:
          "Email verification is not configured on the server. Add RESEND_API_KEY and RESEND_FROM_EMAIL (or EMAIL_FROM) in Vercel project settings.",
      },
      { status: 503 },
    );
  }

  if (!isProd && !isResendApiKeyConfigured()) {
    console.info(`[FIRE Nepal auth][signup] dev OTP (no RESEND_API_KEY) for ${built.email}: ${built.otp}`);
  } else {
    const sendRes = await sendSignupVerificationOtpEmail({
      toEmail: built.email,
      name,
      otp: built.otp,
      expiresInMinutes: minutes,
    });
    if (!sendRes.ok) {
      return NextResponse.json(
        { error: `Verification email could not be sent. ${sendRes.message}` },
        { status: 502 },
      );
    }
  }

  const resBody: {
    needsVerification: true;
    email: string;
    expiresAt: number;
    devCode?: string;
  } = {
    needsVerification: true,
    email: built.email,
    expiresAt: built.expiresAt,
  };
  if (process.env.NODE_ENV !== "production") {
    resBody.devCode = built.otp;
  }

  const res = NextResponse.json(resBody);
  res.cookies.set(FN_PENDING_VERIFY_COOKIE, built.cookieValue, pendingCookieOptions());
  return res;
}
