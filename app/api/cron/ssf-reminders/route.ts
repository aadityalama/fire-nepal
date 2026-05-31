import { NextResponse } from "next/server";
import { buildSsfReminderEmailBody, SSF_EMAIL_SUBJECT } from "@/lib/ssf-pension/email-template";

/**
 * Cron-safe endpoint for SSF reminder digests.
 * Configure in Vercel Cron or system crontab:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/ssf-reminders
 *
 * Wire to Supabase user prefs + transactional email (Resend, etc.) when backend is ready.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const dueDateLabel = "next payroll cycle";
  const body = buildSsfReminderEmailBody({ dueDateLabel, memberName: undefined });

  return NextResponse.json({
    ok: true,
    mode: secret ? "authenticated" : "dev-open",
    dispatched: 0,
    sample: {
      subject: SSF_EMAIL_SUBJECT,
      bodyPreview: body.slice(0, 220),
    },
    note: "Connect Supabase + email provider to send real digests; this route is a safe cron hook.",
  });
}
