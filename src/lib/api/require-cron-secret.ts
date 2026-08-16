import { NextResponse } from "next/server";

/**
 * When `CRON_SECRET` is configured, require `Authorization: Bearer <CRON_SECRET>`.
 * Matches ensure-admin-content: if the secret is unset, allow (local/dev DX).
 */
export function requireCronSecretIfConfigured(req: Request): NextResponse | null {
  const cron = (process.env.CRON_SECRET ?? "").trim();
  if (!cron) return null;
  const auth = req.headers.get("authorization")?.trim() ?? "";
  if (auth === `Bearer ${cron}`) return null;
  return NextResponse.json(
    { ok: false, error: "Unauthorized — pass Authorization: Bearer <CRON_SECRET>." },
    { status: 401 },
  );
}
