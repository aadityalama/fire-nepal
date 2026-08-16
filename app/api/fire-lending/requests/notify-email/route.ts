import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { loadFireLendingStoreForUser } from "@/lib/fire-lending/fire-lending-snapshot-server";
import { sendLoanRequestNotificationEmail } from "@/lib/fire-lending/send-loan-request-email";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/fire-lending/requests/notify-email
 * Body: { loanId }
 * Sends the professional FIRE Nepal loan-request email to the counterparty.
 * Does not mutate lending state (in-app notification is created by sendLoanRequest).
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 503 });
  }

  const rl = checkRateLimit(req, { windowMs: 60_000, max: 12, keyPrefix: "fire-lending-notify-email" });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { loanId?: string } | null;
  const loanId = String(body?.loanId ?? "").trim();
  if (!loanId) {
    return NextResponse.json({ ok: false, error: "loanId is required" }, { status: 400 });
  }

  const loaded = await loadFireLendingStoreForUser(user.id);
  if (!loaded.ok) {
    return NextResponse.json({ ok: false, error: loaded.error }, { status: loaded.status });
  }

  const loan = loaded.store.loans.find((l) => l.id === loanId);
  if (!loan) {
    return NextResponse.json({ ok: false, error: "Loan not found." }, { status: 404 });
  }

  const requester = loaded.store.parties.find((p) => p.id === loaded.store.currentUserId);
  const recipient = loaded.store.parties.find((p) => p.id === loan.counterpartyId);
  if (!requester || !recipient) {
    return NextResponse.json({ ok: false, error: "Could not resolve parties." }, { status: 400 });
  }

  const result = await sendLoanRequestNotificationEmail({
    store: loaded.store,
    loan,
    requester,
    recipient,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, skipped: result.skipped ?? null });
}
