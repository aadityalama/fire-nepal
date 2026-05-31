/**
 * Signed httpOnly cookie holds pending email verification (OTP proof + credentials).
 * Required for Vercel/serverless: in-memory Maps are not shared across invocations.
 */

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { hashPassword } from "@/auth/server/password-hash";

export const OTP_TTL_MS = 5 * 60 * 1000;

export type PendingVerifyPayload = {
  v: 1;
  email: string;
  name: string;
  salt: string;
  passwordHash: string;
  avatarUrl: string | null;
  expMs: number;
  /** HMAC-SHA256 hex digest of the 6-digit OTP (never store plaintext OTP in the cookie). */
  otpProof: string;
};

function randomOtp6(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

function otpProof(secret: string, email: string, otp: string): string {
  return createHmac("sha256", secret).update(`otp|v1|${email}|${otp}`).digest("hex");
}

export function verifyOtpAgainstProof(secret: string, email: string, code6: string, proofHex: string): boolean {
  const expected = otpProof(secret, email, code6);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(proofHex, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function signPendingJson(payload: unknown, secret: string): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(`fnpend|${payloadB64}`).digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function parsePendingVerifyCookie(raw: string | undefined, secret: string): PendingVerifyPayload | null {
  if (!raw || raw.length < 16) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(`fnpend|${payloadB64}`).digest("base64url");
  if (sig.length !== expected.length || sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as PendingVerifyPayload;
    if (parsed?.v !== 1 || typeof parsed.email !== "string" || typeof parsed.otpProof !== "string") return null;
    if (typeof parsed.expMs !== "number" || parsed.expMs < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export type BuildPendingSignupResult =
  | { ok: true; cookieValue: string; email: string; otp: string; expiresAt: number }
  | { ok: false; error: string };

/**
 * Creates a new pending signup token (password is hashed; OTP exists only in memory until emailed).
 */
export function buildPendingSignupCookie(params: {
  secret: string;
  name: string;
  email: string;
  password: string;
  avatarUrl: string | null;
}): BuildPendingSignupResult {
  const email = normEmail(params.email);
  if (params.name.trim().length < 2) {
    return { ok: false, error: "Enter your full name." };
  }
  const { salt, passwordHash } = hashPassword(params.password);
  const otp = randomOtp6();
  const expMs = Date.now() + OTP_TTL_MS;
  const payload: PendingVerifyPayload = {
    v: 1,
    email,
    name: params.name.trim(),
    salt,
    passwordHash,
    avatarUrl: params.avatarUrl,
    expMs,
    otpProof: otpProof(params.secret, email, otp),
  };
  return {
    ok: true,
    cookieValue: signPendingJson(payload, params.secret),
    email,
    otp,
    expiresAt: expMs,
  };
}

export type RotateOtpResult =
  | { ok: true; cookieValue: string; otp: string; expiresAt: number }
  | { ok: false; error: string };

export function rotatePendingOtp(secret: string, prev: PendingVerifyPayload): RotateOtpResult {
  const otp = randomOtp6();
  const expMs = Date.now() + OTP_TTL_MS;
  const next: PendingVerifyPayload = {
    ...prev,
    expMs,
    otpProof: otpProof(secret, prev.email, otp),
  };
  return {
    ok: true,
    cookieValue: signPendingJson(next, secret),
    otp,
    expiresAt: expMs,
  };
}

export function pendingCookieActiveForEmail(
  raw: string | undefined,
  secret: string,
  emailRaw: string,
): boolean {
  const p = parsePendingVerifyCookie(raw, secret);
  if (!p) return false;
  return p.email === normEmail(emailRaw);
}
