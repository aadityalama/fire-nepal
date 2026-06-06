import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  MEMBERSHIP_PAYMENT_BUCKET,
  type MembershipPaymentMethod,
  type MembershipRequestPlan,
} from "@/lib/membership-payment";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { ensureMembershipPaymentProofsBucket } from "@/lib/supabase/ensure-membership-payment-bucket";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

function formatPostgrestError(err: {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
}): string {
  const parts = [err.message, err.details, err.hint].filter((p) => typeof p === "string" && p.trim().length > 0);
  const base = parts.join(" — ").trim();
  if (base) return err.code ? `${base} (${err.code})` : base;
  return err.code ? `Database error (${err.code})` : "Database error";
}

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/** List the signed-in user's membership payment requests. */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user?.id) {
      console.error("MEMBERSHIP_AUTH_ERROR", userErr ?? new Error("missing session user"));
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("membership_requests")
      .select(
        "id, email, plan_type, payment_method, reference, created_at, status, reviewed_at, proof_url",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Submit a membership payment request with proof image. */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user?.id) {
      console.error("MEMBERSHIP_AUTH_ERROR", userErr ?? new Error("missing session user"));
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const planRaw = String(form.get("plan") ?? "");
    const methodRaw = String(form.get("payment_method") ?? "");
    const referenceRaw = form.get("reference");
    const reference =
      typeof referenceRaw === "string" && referenceRaw.trim().length > 0 ? referenceRaw.trim().slice(0, 500) : null;
    const file = form.get("file");

    if (planRaw !== "premium" && planRaw !== "elite") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    const plan = planRaw as MembershipRequestPlan;
    if (methodRaw !== "khalti_qr" && methodRaw !== "esewa_qr" && methodRaw !== "global_ime_qr") {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }
    const payment_method = methodRaw as MembershipPaymentMethod;

    if (!(file instanceof File) || file.size < 1) {
      return NextResponse.json({ error: "Proof image is required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 5 MB or smaller" }, { status: 400 });
    }
    const mime = (file.type || "image/jpeg").toLowerCase();
    if (!ALLOWED_TYPES.has(mime)) {
      return NextResponse.json({ error: "Use JPEG, PNG, or WebP" }, { status: 400 });
    }

    const email = (user.email ?? "").toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Account email is required" }, { status: 400 });
    }

    const ensured = await ensureMembershipPaymentProofsBucket();
    if (!ensured.ok) {
      return NextResponse.json({ error: ensured.message }, { status: 503 });
    }

    const admin = createSupabaseServiceRoleClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Server storage is not configured (missing SUPABASE_SERVICE_ROLE_KEY)." },
        { status: 503 },
      );
    }

    const id = randomUUID();
    const proof_url = `${user.id}/${id}.${extFromMime(mime)}`;
    const buf = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await admin.storage.from(MEMBERSHIP_PAYMENT_BUCKET).upload(proof_url, buf, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) {
      console.error("MEMBERSHIP_UPLOAD_ERROR", upErr);
      const msg = upErr.message?.trim() || "Storage upload failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // Service-role insert: proof is already stored with service role; RLS `to authenticated` can block
    // the user-scoped PostgREST client in some server contexts even when `getUser()` succeeds.
    const { data: row, error: insErr } = await admin
      .from("membership_requests")
      .insert({
        id,
        user_id: user.id,
        email,
        plan_type: plan,
        payment_method,
        proof_url,
        reference,
        status: "pending",
      })
      .select("id, created_at, status")
      .single();

    if (insErr) {
      console.error("MEMBERSHIP_INSERT_ERROR", insErr);
      await admin.storage.from(MEMBERSHIP_PAYMENT_BUCKET).remove([proof_url]);
      return NextResponse.json({ error: formatPostgrestError(insErr) }, { status: 500 });
    }

    return NextResponse.json({ request: row });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("MEMBERSHIP_POST_UNHANDLED", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
