import { NextResponse } from "next/server";
import { dispatchSmartLoanReminders, type SmartLoanReminderInput } from "@/lib/smart-loan/reminders";

function readCronLoans() {
  const rawLoans = process.env.SMART_LOAN_CRON_LOANS_JSON;
  if (!rawLoans) return [];
  const parsed = JSON.parse(rawLoans) as unknown;
  return Array.isArray(parsed) ? (parsed as SmartLoanReminderInput[]) : [];
}

/**
 * Daily 9:00 AM cron endpoint for smart loan reminders.
 * Configure in Vercel Cron or system crontab:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/smart-loan-reminders
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
    const loans = readCronLoans();
    const result = await dispatchSmartLoanReminders(loans);
    return NextResponse.json({
      ok: true,
      mode: secret ? "authenticated" : "dev-open",
      schedule: "0 9 * * *",
      provider: "resend",
      ...result,
      note: loans.length
        ? "Cron checked configured smart-loan reminders."
        : "No SMART_LOAN_CRON_LOANS_JSON configured. Offline dashboard loans dispatch from the client at 9:00 AM after the app opens.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to run smart-loan reminder cron",
      },
      { status: 500 },
    );
  }
}
