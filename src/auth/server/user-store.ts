/**
 * In-memory verified user directory (legacy cookie auth).
 * Pending verification lives in a signed httpOnly cookie (see pending-verify-cookie.ts) so OTP works on Vercel.
 */

import { randomUUID } from "node:crypto";
import type { ProductAuthUser } from "@/lib/product-auth-storage";
import { OTP_TTL_MS, verifyOtpAgainstProof, type PendingVerifyPayload } from "@/auth/server/pending-verify-cookie";
import { hashPassword, verifyPassword } from "@/auth/server/password-hash";

export type StoredUser = {
  id: string;
  email: string;
  name: string;
  salt: string;
  passwordHash: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
};

const verifiedByEmail = new Map<string, StoredUser>();

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isEmailRegistered(email: string): boolean {
  return verifiedByEmail.has(normEmail(email));
}

export type VerifyOtpResult =
  | { ok: true; user: StoredUser }
  | { ok: false; error: string };

export function verifyOtpAndActivate(
  emailRaw: string,
  codeRaw: string,
  pending: PendingVerifyPayload | null,
  secret: string,
): VerifyOtpResult {
  const email = normEmail(emailRaw);
  const code = String(codeRaw ?? "").replace(/\D/g, "").slice(0, 6);
  if (code.length !== 6) {
    return { ok: false, error: "Enter the 6-digit code." };
  }
  if (!pending) {
    return { ok: false, error: "No pending verification for this email. Sign up again." };
  }
  if (pending.email !== email) {
    return { ok: false, error: "No pending verification for this email. Sign up again." };
  }
  if (pending.expMs < Date.now()) {
    return { ok: false, error: "That code has expired. Request a new one." };
  }
  if (!verifyOtpAgainstProof(secret, email, code, pending.otpProof)) {
    return { ok: false, error: "Invalid verification code." };
  }

  if (verifiedByEmail.has(email)) {
    return { ok: false, error: "This email is already verified." };
  }

  const id = randomUUID();
  const user: StoredUser = {
    id,
    email,
    name: pending.name,
    salt: pending.salt,
    passwordHash: pending.passwordHash,
    avatarUrl: pending.avatarUrl,
    emailVerified: true,
    createdAt: new Date().toISOString(),
  };
  verifiedByEmail.set(email, user);
  return { ok: true, user };
}

export function getVerifiedUserByEmail(email: string): StoredUser | null {
  return verifiedByEmail.get(normEmail(email)) ?? null;
}

export function assertLogin(emailRaw: string, password: string): StoredUser | null {
  const email = normEmail(emailRaw);
  const u = verifiedByEmail.get(email);
  if (!u || !u.emailVerified) return null;
  if (!verifyPassword(password, u.salt, u.passwordHash)) return null;
  return u;
}

export function updateVerifiedUserPassword(emailRaw: string, newPassword: string): StoredUser | null {
  const email = normEmail(emailRaw);
  const u = verifiedByEmail.get(email);
  if (!u || !u.emailVerified) return null;
  const { salt, passwordHash } = hashPassword(newPassword);
  const updated: StoredUser = { ...u, salt, passwordHash };
  verifiedByEmail.set(email, updated);
  return updated;
}

/** Full profile for API responses (may include data URL avatar). */
export function toPublicUser(u: StoredUser): ProductAuthUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.createdAt,
    emailVerified: u.emailVerified,
    avatarUrl: u.avatarUrl,
  };
}

/** Minimal claims in the httpOnly cookie — never embed large `data:` URLs. */
export function toSessionClaims(u: StoredUser): ProductAuthUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.createdAt,
    emailVerified: u.emailVerified,
  };
}

export function canSyncLegacySession(email: string, userId: string): boolean {
  const u = verifiedByEmail.get(normEmail(email));
  return !!u && u.id === userId;
}

export function otpTtlMs(): number {
  return OTP_TTL_MS;
}
