import { NextResponse } from "next/server";
import {
  loadFireLendingStoreForUser,
  saveFireLendingStoreForUser,
} from "@/lib/fire-lending/fire-lending-snapshot-server";
import {
  findPendingRequestForLoan,
  sendLoanRequest,
} from "@/lib/fire-lending/loan-request-approval";
import { deliverLoanRequestToRecipientAccount } from "@/lib/fire-lending/loan-request-delivery-server";
import { sendLoanRequestNotificationEmail } from "@/lib/fire-lending/send-loan-request-email";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/fire-lending/requests/send
 * Body: { loanId, message? }
 * Creates a pending request for the loan counterparty in the sender's snapshot,
 * mirrors it into the recipient's fire_lending snapshot (so their Requests UI
 * sees it), and best-effort emails when the recipient has a verified account email.
 *
 * Idempotent: if a pending request already exists (e.g. optimistic client write),
 * still delivers it to the recipient account.
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
  } | null;

  const loanId = String(body?.loanId ?? "").trim();
  if (!loanId) {
    return NextResponse.json({ ok: false, error: "loanId is required" }, { status: 400 });
  }

  const loaded = await loadFireLendingStoreForUser(user.id);
  if (!loaded.ok) {
    return NextResponse.json({ ok: false, error: loaded.error }, { status: loaded.status });
  }

  // Ignore client toPartyId — recipient is always loan.counterpartyId.
  void body?.toPartyId;

  let store = loaded.store;
  let request = findPendingRequestForLoan(store, loanId);
  let createdNow = false;

  if (!request) {
    const result = sendLoanRequest(store, {
      loanId,
      actorPartyId: store.currentUserId,
      message: typeof body?.message === "string" ? body.message : undefined,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status ?? 400 },
      );
    }

    store = result.store;
    request = result.request;
    createdNow = true;

    const saved = await saveFireLendingStoreForUser(user.id, store);
    if (!saved.ok) {
      return NextResponse.json({ ok: false, error: saved.error }, { status: saved.status });
    }
  }

  // Critical: persist into the recipient's own snapshot so their Requests UI
  // (toPartyId === session currentUserId) can see the pending request.
  const delivery = await deliverLoanRequestToRecipientAccount({
    senderStore: store,
    request,
    senderUserId: user.id,
  });
  if (!delivery.ok) {
    console.error("[FIRE Nepal loan-request-delivery]", delivery.error);
  }

  const loan = store.loans.find((l) => l.id === loanId);
  const requester = store.parties.find((p) => p.id === request.fromPartyId);
  const recipient = store.parties.find((p) => p.id === request.toPartyId);
  if (createdNow && loan && requester && recipient) {
    void sendLoanRequestNotificationEmail({
      store,
      loan,
      requester,
      recipient,
    }).catch((err) => {
      console.error("[FIRE Nepal loan-request-email]", err);
    });
  }

  return NextResponse.json({
    ok: true,
    request,
    store,
    createdNow,
    delivery: delivery.ok
      ? delivery.delivered
        ? {
            delivered: true,
            recipientUserId: delivery.recipientUserId,
            alreadyPresent: delivery.alreadyPresent,
          }
        : { delivered: false, skipped: delivery.skipped }
      : { delivered: false, error: delivery.error },
  });
}
