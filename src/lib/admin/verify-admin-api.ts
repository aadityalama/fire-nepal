import "server-only";

import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminApiRole = "admin" | "super_admin";

export async function requireAdminApi(): Promise<
  { userId: string; role: AdminApiRole } | NextResponse
> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error } = await supabase
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !row) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const role: AdminApiRole = row.role === "super_admin" ? "super_admin" : "admin";
  return { userId: user.id, role };
}

/** Destructive membership actions (permanent account removal). */
export async function requireSuperAdminApi(): Promise<{ userId: string } | NextResponse> {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  if (gate.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }
  return { userId: gate.userId };
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))];
  return lines.join("\n");
}
