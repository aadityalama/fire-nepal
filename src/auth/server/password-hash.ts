import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

export function hashPassword(password: string): { salt: string; passwordHash: string } {
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
