import { createHmac, timingSafeEqual } from "node:crypto";
import { getAuthSecret } from "@/auth/server/env";
import { FIRE_NEPAL_CANONICAL_ORIGIN } from "@/lib/brand/site-seo";

const PURPOSE = "plan_selection" as const;
/** Invite links remain valid for 14 days. */
export const PLAN_SELECTION_INVITE_TTL_SEC = 14 * 24 * 60 * 60;

type InvitePayload = {
  v: 1;
  purpose: typeof PURPOSE;
  uid: string;
  exp: number;
};

function signPayload(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

/**
 * Opaque HMAC invite token — identifies the intended member without putting
 * email or raw secrets in the URL. Payload is base64url JSON + signature.
 */
export function createPlanSelectionInviteToken(
  userId: string,
  nowSec = Math.floor(Date.now() / 1000),
  secret = getAuthSecret(),
): string {
  const payload: InvitePayload = {
    v: 1,
    purpose: PURPOSE,
    uid: userId,
    exp: nowSec + PLAN_SELECTION_INVITE_TTL_SEC,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = signPayload(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export function verifyPlanSelectionInviteToken(
  token: string,
  secret = getAuthSecret(),
  nowSec = Math.floor(Date.now() / 1000),
): { ok: true; userId: string; exp: number } | { ok: false; reason: string } {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return { ok: false, reason: "malformed" };
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = signPayload(payloadB64, secret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: "bad_signature" };
    }
  } catch {
    return { ok: false, reason: "bad_signature" };
  }
  try {
    const raw = Buffer.from(payloadB64, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as InvitePayload;
    if (parsed?.v !== 1 || parsed.purpose !== PURPOSE || typeof parsed.uid !== "string" || !parsed.uid) {
      return { ok: false, reason: "invalid_payload" };
    }
    if (typeof parsed.exp !== "number" || parsed.exp < nowSec) {
      return { ok: false, reason: "expired" };
    }
    return { ok: true, userId: parsed.uid, exp: parsed.exp };
  } catch {
    return { ok: false, reason: "invalid_payload" };
  }
}

/** Login-gated membership plan-selection page with opaque invite token. */
export function buildPlanSelectionUrl(userId: string, siteOrigin?: string): string {
  const origin = (siteOrigin || FIRE_NEPAL_CANONICAL_ORIGIN).replace(/\/+$/, "");
  const token = createPlanSelectionInviteToken(userId);
  const url = new URL(`${origin}/dashboard/membership`);
  url.searchParams.set("invite", token);
  url.hash = "membership-plan-selection";
  return url.toString();
}
