import { NextResponse } from "next/server";
import { dispatchSmartLoanReminders, type SmartLoanReminderInput } from "@/lib/smart-loan/reminders";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { loans?: SmartLoanReminderInput[]; source?: string };
    const loans = Array.isArray(body.loans) ? body.loans : [];
    const result = await dispatchSmartLoanReminders(loans);

    return NextResponse.json({
      ok: true,
      source: body.source ?? "dashboard",
      provider: "resend",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to dispatch smart loan reminders",
      },
      { status: 400 },
    );
  }
}
