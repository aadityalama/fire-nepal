/**
 * Signed httpOnly cookie for legacy password reset OTP (same serverless constraints as signup OTP).
 */

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { OTP_TTL_MS } from "@/auth/server/pending-verify-cookie";

export type PendingResetPayload = {
  v: 1;
  email: string;
  expMs: number;
  /** HMAC digest of the 6-digit reset OTP (distinct prefix from signup OTP). */
  otpProof: string;
};

function randomOtp6(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

function resetOtpProof(secret: string, email: string, otp: string): string {
  return createHmac("sha256", secret).update(`pwdreset|v1|${email}|${otp}`).digest("hex");
}

export function verifyResetOtpAgainstProof(secret: string, email: string, code6: string, proofHex: string): boolean {
  const expected = resetOtpProof(secret, email, code6);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(proofHex, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function signResetJson(payload: unknown, secret: string): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(`fnpendrst|${payloadB64}`).digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function parsePendingResetCookie(raw: string | undefined, secret: string): PendingResetPayload | null {
  if (!raw || raw.length < 16) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(`fnpendrst|${payloadB64}`).digest("base64url");
  if (sig.length !== expected.length || sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as PendingResetPayload;
    if (parsed?.v !== 1 || typeof parsed.email !== "string" || typeof parsed.otpProof !== "string") return null;
    if (typeof parsed.expMs !== "number" || parsed.expMs < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export type BuildPendingResetResult =
  | { ok: true; cookieValue: string; email: string; otp: string; expiresAt: number }
  | { ok: false; error: string };

export function buildPendingResetCookie(params: { secret: string; email: string }): BuildPendingResetResult {
  const email = normEmail(params.email);
  if (!email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const otp = randomOtp6();
  const expMs = Date.now() + OTP_TTL_MS;
  const payload: PendingResetPayload = {
    v: 1,
    email,
    expMs,
    otpProof: resetOtpProof(params.secret, email, otp),
  };
  return {
    ok: true,
    cookieValue: signResetJson(payload, params.secret),
    email,
    otp,
    expiresAt: expMs,
  };
}
