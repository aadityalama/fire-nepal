/**
 * In-memory user directory + email OTP pending state.
 * Suitable for local development; replace with a real database for production.
 */

import { randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { ProductAuthUser } from "@/lib/product-auth-storage";

const OTP_TTL_MS = 5 * 60 * 1000;
const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

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

export type PendingSignup = {
  otp: string;
  expiresAt: number;
  name: string;
  salt: string;
  passwordHash: string;
  avatarUrl: string | null;
};

const verifiedByEmail = new Map<string, StoredUser>();
const pendingByEmail = new Map<string, PendingSignup>();

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): { salt: string; passwordHash: string } {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTS).toString("hex");
  return { salt, passwordHash };
}

export function verifyPassword(password: string, salt: string, passwordHash: string): boolean {
  try {
    const derived = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
    const expected = Buffer.from(passwordHash, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function randomOtp6(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function isEmailRegistered(email: string): boolean {
  return verifiedByEmail.has(normEmail(email));
}

export function hasPendingVerification(email: string): boolean {
  const p = pendingByEmail.get(normEmail(email));
  if (!p) return false;
  if (p.expiresAt < Date.now()) {
    pendingByEmail.delete(normEmail(email));
    return false;
  }
  return true;
}

export type StartSignupResult =
  | { ok: true; email: string; otp: string; expiresAt: number }
  | { ok: false; error: string };

/**
 * Creates or replaces pending signup and returns plaintext OTP for logging / dev responses.
 */
export function startOrRefreshSignup(params: {
  name: string;
  email: string;
  password: string;
  avatarUrl: string | null;
}): StartSignupResult {
  const email = normEmail(params.email);
  if (verifiedByEmail.has(email)) {
    return { ok: false, error: "An account with this email already exists." };
  }
  if (params.name.trim().length < 2) {
    return { ok: false, error: "Enter your full name." };
  }
  const { salt, passwordHash } = hashPassword(params.password);
  const otp = randomOtp6();
  const expiresAt = Date.now() + OTP_TTL_MS;
  pendingByEmail.set(email, {
    otp,
    expiresAt,
    name: params.name.trim(),
    salt,
    passwordHash,
    avatarUrl: params.avatarUrl,
  });
  return { ok: true, email, otp, expiresAt };
}

export type VerifyOtpResult =
  | { ok: true; user: StoredUser }
  | { ok: false; error: string };

export function verifyOtpAndActivate(emailRaw: string, codeRaw: string): VerifyOtpResult {
  const email = normEmail(emailRaw);
  const code = String(codeRaw ?? "").replace(/\D/g, "").slice(0, 6);
  if (code.length !== 6) {
    return { ok: false, error: "Enter the 6-digit code." };
  }
  const pending = pendingByEmail.get(email);
  if (!pending) {
    return { ok: false, error: "No pending verification for this email. Sign up again." };
  }
  if (pending.expiresAt < Date.now()) {
    pendingByEmail.delete(email);
    return { ok: false, error: "That code has expired. Request a new one." };
  }
  if (pending.otp !== code) {
    return { ok: false, error: "Invalid verification code." };
  }

  pendingByEmail.delete(email);
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

export type ResendResult =
  | { ok: true; otp: string; expiresAt: number }
  | { ok: false; error: string };

export function resendOtp(emailRaw: string): ResendResult {
  const email = normEmail(emailRaw);
  const pending = pendingByEmail.get(email);
  if (!pending) {
    return { ok: false, error: "No pending verification. Complete the sign-up form first." };
  }
  if (verifiedByEmail.has(email)) {
    pendingByEmail.delete(email);
    return { ok: false, error: "This email is already verified. Sign in instead." };
  }
  const otp = randomOtp6();
  const expiresAt = Date.now() + OTP_TTL_MS;
  pendingByEmail.set(email, { ...pending, otp, expiresAt });
  return { ok: true, otp, expiresAt };
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
