import { createHmac } from "node:crypto";
import type { ProductAuthUser } from "@/lib/product-auth-storage";
import { FN_SESSION_MAX_AGE_SEC } from "@/auth/constants";

type SessionPayload = {
  u: ProductAuthUser;
  exp: number;
};

export function signUserSession(user: ProductAuthUser, secret: string): string {
  const exp = Math.floor(Date.now() / 1000) + FN_SESSION_MAX_AGE_SEC;
  const payload = Buffer.from(JSON.stringify({ u: user, exp } satisfies SessionPayload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyUserSession(token: string, secret: string): ProductAuthUser | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  if (sig.length !== expected.length || sig !== expected) return null;
  try {
    const raw = Buffer.from(payloadB64, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as SessionPayload;
    if (!parsed?.u?.id || !parsed.u.email || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed.u;
  } catch {
    return null;
  }
}
