import { NextResponse } from "next/server";
import { signLoanAgreement } from "@/lib/fire-lending/agreement-signatures";
import {
  loadFireLendingStoreForUser,
  saveFireLendingStoreForUser,
} from "@/lib/fire-lending/fire-lending-snapshot-server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LoanRole } from "@/lib/fire-lending/types";

/**
 * POST /api/fire-lending/agreements/sign
 * Body: { loanId, as: "lender" | "borrower" }
 * Role is enforced from authenticated user's party id vs loan lender/borrower ids.
 * Client-supplied `as` that does not match the actor's real role is rejected.
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
    as?: string;
    /** Ignored — role must be derived server-side from party membership. */
    role?: string;
  } | null;

  const loanId = String(body?.loanId ?? "").trim();
  const asRaw = String(body?.as ?? "").trim().toLowerCase();
  if (!loanId) {
    return NextResponse.json({ ok: false, error: "loanId is required" }, { status: 400 });
  }
  if (asRaw !== "lender" && asRaw !== "borrower") {
    return NextResponse.json({ ok: false, error: "as must be lender or borrower" }, { status: 400 });
  }
  const as = asRaw as LoanRole;

  const loaded = await loadFireLendingStoreForUser(user.id);
  if (!loaded.ok) {
    return NextResponse.json({ ok: false, error: loaded.error }, { status: loaded.status });
  }

  // Actor is always the store's current user party — never a forged party id from the body.
  const result = signLoanAgreement(loaded.store, {
    loanId,
    actorPartyId: loaded.store.currentUserId,
    as,
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
    loan: result.loan,
    store: result.store,
    updatedAt: saved.updatedAt,
  });
}
