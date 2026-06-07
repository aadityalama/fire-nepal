import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export type AdminMemberNoteRow = {
  id: string;
  user_id: string;
  body: string;
  author_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminMemberDetail = {
  userId: string;
  email: string;
  name: string;
  createdAt: string | null;
  planType: "free" | "premium" | "elite";
  membershipActivatedAt: string | null;
  expiresAt: string | null;
  suspendedAt: string | null;
  subscription: {
    plan: "premium" | "elite" | null;
    status: string | null;
    current_period_end: string | null;
  } | null;
  notes: AdminMemberNoteRow[];
};

export async function fetchAdminMemberDetail(userId: string): Promise<AdminMemberDetail | null> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) return null;

  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(userId);
  if (authErr || !authData?.user) {
    return null;
  }
  const u = authData.user;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const fromMeta =
    (typeof meta.name === "string" && meta.name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    "";

  const { data: up } = await admin.from("user_profiles").select("display_name").eq("id", userId).maybeSingle();
  const display = up?.display_name?.trim();
  const name = display || fromMeta || u.email?.split("@")[0] || "Member";

  const { data: prof } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  const rawPlan = prof?.plan_type;
  const planType: AdminMemberDetail["planType"] =
    rawPlan === "premium" || rawPlan === "elite" || rawPlan === "free" ? rawPlan : "free";

  const { data: sub } = await admin
    .from("subscriptions")
    .select("plan, status, current_period_end, current_period_start")
    .eq("user_id", userId)
    .maybeSingle();

  const expiresAt = prof?.expires_at ?? sub?.current_period_end ?? null;
  const membershipActivatedAt = prof?.membership_activated_at ?? sub?.current_period_start ?? null;

  const { data: notes, error: nErr } = await admin
    .from("admin_member_notes")
    .select("id, user_id, body, author_id, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const noteRows: AdminMemberNoteRow[] =
    !nErr && notes ? (notes as AdminMemberNoteRow[]) : [];

  return {
    userId,
    email: u.email ?? "—",
    name,
    createdAt: u.created_at ?? null,
    planType,
    membershipActivatedAt: membershipActivatedAt as string | null,
    expiresAt,
    suspendedAt: prof?.suspended_at ?? null,
    subscription: sub
      ? {
          plan: sub.plan,
          status: sub.status,
          current_period_end: sub.current_period_end,
        }
      : null,
    notes: noteRows,
  };
}
