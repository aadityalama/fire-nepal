import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSiteOriginForServerAuthRedirect } from "@/lib/public-site-url";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

const LOG_PREFIX = "[FIRE Nepal auth][request-password-reset]";

type Body = { email?: string };

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "(invalid)";
  const safeLocal = local.length <= 2 ? "***" : `${local.slice(0, 2)}…`;
  return `${safeLocal}@${domain}`;
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured for this host." }, { status: 503 });
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

  const origin = getSiteOriginForServerAuthRedirect(req);
  if (!origin.startsWith("http")) {
    console.error(LOG_PREFIX, JSON.stringify({ event: "bad_origin", origin }));
    return NextResponse.json(
      {
        error:
          "Set NEXT_PUBLIC_SITE_URL to your public https origin (e.g. https://firenepal.com) so reset links in email are valid.",
      },
      { status: 500 },
    );
  }

  const nextPath = "/dashboard/security?pw=1";
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  console.info(
    LOG_PREFIX,
    JSON.stringify({
      event: "reset_request_received",
      email: maskEmail(email),
      originUsed: origin,
    }),
  );

  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());

  console.info(
    LOG_PREFIX,
    JSON.stringify({
      event: "supabase_reset_attempt",
      email: maskEmail(email),
      redirectToHost: (() => {
        try {
          return new URL(redirectTo).host;
        } catch {
          return "(invalid redirectTo)";
        }
      })(),
    }),
  );

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    const err = error as { message: string; status?: number; code?: string; name?: string };
    console.error(
      LOG_PREFIX,
      JSON.stringify({
        event: "supabase_reset_rejected",
        email: maskEmail(email),
        message: err.message,
        ...(typeof err.status === "number" ? { status: err.status } : {}),
        ...(typeof err.code === "string" && err.code.length > 0 ? { code: err.code } : {}),
        ...(typeof err.name === "string" && err.name.length > 0 ? { name: err.name } : {}),
      }),
    );
    return NextResponse.json(
      {
        error:
          error.message ||
          "Password reset could not be started. Check Supabase redirect URL allowlist and email settings.",
      },
      { status: 400 },
    );
  }

  console.info(
    LOG_PREFIX,
    JSON.stringify({
      event: "supabase_reset_accepted",
      email: maskEmail(email),
      note: "GoTrue accepted the request; delivery depends on Supabase Auth email/SMTP configuration.",
    }),
  );

  return NextResponse.json({ ok: true as const });
}
