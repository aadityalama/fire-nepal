import { NextResponse } from "next/server";
import {
  loadFireLendingStoreForUser,
  saveFireLendingStoreForUser,
} from "@/lib/fire-lending/fire-lending-snapshot-server";
import {
  respondToLoanRequest,
  type LoanRequestAction,
} from "@/lib/fire-lending/loan-request-approval";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ACTIONS = new Set<LoanRequestAction>(["accepted", "rejected", "changes_requested"]);

/**
 * POST /api/fire-lending/requests/respond
 * Body: { requestId, action: "accepted" | "rejected" | "changes_requested", note? }
 * Only the counterparty may respond, and only after both signatures (when a loan is linked).
 * Self-approval is rejected.
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
    requestId?: string;
    action?: string;
    note?: string;
  } | null;

  const requestId = String(body?.requestId ?? "").trim();
  const actionRaw = String(body?.action ?? "").trim() as LoanRequestAction;
  if (!requestId) {
    return NextResponse.json({ ok: false, error: "requestId is required" }, { status: 400 });
  }
  if (!ACTIONS.has(actionRaw)) {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }

  const loaded = await loadFireLendingStoreForUser(user.id);
  if (!loaded.ok) {
    return NextResponse.json({ ok: false, error: loaded.error }, { status: loaded.status });
  }

  const result = respondToLoanRequest(loaded.store, {
    requestId,
    actorPartyId: loaded.store.currentUserId,
    action: actionRaw,
    note: typeof body?.note === "string" ? body.note : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status ?? 403 },
    );
  }

  const saved = await saveFireLendingStoreForUser(user.id, result.store);
  if (!saved.ok) {
    return NextResponse.json({ ok: false, error: saved.error }, { status: saved.status });
  }

  return NextResponse.json({
    ok: true,
    request: result.request,
    store: result.store,
    updatedAt: saved.updatedAt,
  });
}
