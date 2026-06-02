import { NextResponse } from "next/server";
import { runScheduledRemindersCron } from "@/lib/scheduled-reminders/cron-dispatch";

/**
 * Vercel Cron: every minute. Checks reminders due in the current UTC minute and sends via Resend.
 * Headers: Authorization: Bearer $CRON_SECRET
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runScheduledRemindersCron(new Date());
    const status = result.ok ? 200 : 503;
    return NextResponse.json(
      {
        ...result,
        mode: secret ? "authenticated" : "dev-open",
        schedule: "* * * * *",
        provider: "resend",
      },
      { status },
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 },
    );
  }
}
