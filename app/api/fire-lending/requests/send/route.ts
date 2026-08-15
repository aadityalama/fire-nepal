import { NextResponse } from "next/server";
import {
  loadFireLendingStoreForUser,
  saveFireLendingStoreForUser,
} from "@/lib/fire-lending/fire-lending-snapshot-server";
import { sendLoanRequest } from "@/lib/fire-lending/loan-request-approval";
import { sendLoanRequestNotificationEmail } from "@/lib/fire-lending/send-loan-request-email";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/fire-lending/requests/send
 * Body: { loanId, message? }
 * Creates a pending request from borrower to lender and an in-app notification.
 * Best-effort email is also sent when the lender has a verified account email.
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 503 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    loanId?: string;
    message?: string;
    toPartyId?: string;
    role?: string;
  } | null;

  const loanId = String(body?.loanId ?? "").trim();
  if (!loanId) {
    return NextResponse.json({ ok: false, error: "loanId is required" }, { status: 400 });
  }

  const loaded = await loadFireLendingStoreForUser(user.id);
  if (!loaded.ok) {
    return NextResponse.json({ ok: false, error: loaded.error }, { status: loaded.status });
  }

  // Ignore client toPartyId / role — recipient is always loan.lenderId; sender must be borrower.
  void body?.toPartyId;
  void body?.role;

  const result = sendLoanRequest(loaded.store, {
    loanId,
    actorPartyId: loaded.store.currentUserId,
    message: typeof body?.message === "string" ? body.message : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status ?? 400 },
    );
  }

  const saved = await saveFireLendingStoreForUser(user.id, result.store);
  if (!saved.ok) {
    return NextResponse.json({ ok: false, error: saved.error }, { status: saved.status });
  }

  const loan = result.store.loans.find((l) => l.id === loanId);
  if (loan) {
    void sendLoanRequestNotificationEmail({
      store: result.store,
      loan,
    }).catch((err) => {
      console.error("[FIRE Nepal loan-request-email]", err);
    });
  }

  return NextResponse.json({
    ok: true,
    request: result.request,
    store: result.store,
    updatedAt: saved.updatedAt,
  });
}
