import { NextResponse } from "next/server";
import {
  loadFireLendingStoreForUser,
  saveFireLendingStoreForUser,
} from "@/lib/fire-lending/fire-lending-snapshot-server";
import { createLoanInStore } from "@/lib/fire-lending/loan-creation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LoanWizardDraft } from "@/lib/fire-lending/types";

/**
 * POST /api/fire-lending/loans/create
 * Body: { draft: LoanWizardDraft }
 * Creates a peer loan with durable distinct lenderId/borrowerId.
 * Rejects self-loans. Never trusts client-supplied lenderId/borrowerId.
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
    draft?: LoanWizardDraft;
    lenderId?: string;
    borrowerId?: string;
  } | null;

  if (!body?.draft || typeof body.draft !== "object") {
    return NextResponse.json({ ok: false, error: "draft is required" }, { status: 400 });
  }

  // Explicitly ignore any client-supplied lenderId/borrowerId.
  void body.lenderId;
  void body.borrowerId;

  const loaded = await loadFireLendingStoreForUser(user.id);
  if (!loaded.ok) {
    return NextResponse.json({ ok: false, error: loaded.error }, { status: loaded.status });
  }

  const result = createLoanInStore(loaded.store, body.draft);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  const saved = await saveFireLendingStoreForUser(user.id, result.store);
  if (!saved.ok) {
    return NextResponse.json({ ok: false, error: saved.error }, { status: saved.status });
  }

  return NextResponse.json({
    ok: true,
    loan: result.loan,
    store: result.store,
    updatedAt: saved.updatedAt,
  });
}
