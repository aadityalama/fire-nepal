import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sanitizeInsurancePolicyInput } from "@/lib/insurance/insurance-sanitize";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  ensureFinanceInsurancePoliciesSchema,
  getInsuranceSupabaseMeta,
  isMissingInsuranceTableError,
} from "@/services/ensure-insurance-schema";
import { createInsurancePolicyForUser, listInsurancePoliciesForUser } from "@/services/insurance-supabase";
import type { Database } from "@/types/supabase-database";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg, meta: getInsuranceSupabaseMeta() }, { status });
}

async function resolveAuthedClient(req?: Request): Promise<{
  client: SupabaseClient<Database>;
  user: User | null;
}> {
  const auth = req?.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    const client = createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await client.auth.getUser();
    return { client, user: data.user };
  }
  const client = await createServerSupabaseClient();
  const { data } = await client.auth.getUser();
  return { client, user: data.user };
}

async function withSchemaRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isMissingInsuranceTableError(error)) throw error;
    const ensured = await ensureFinanceInsurancePoliciesSchema();
    if (!ensured.ok) throw new Error(ensured.message);
    await new Promise((r) => setTimeout(r, 600));
    return run();
  }
}

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const { client, user } = await resolveAuthedClient(req);
    if (!user) return bad("Please sign in to view your insurance policies.", 401);

    const policies = await withSchemaRetry(() => listInsurancePoliciesForUser(client, user.id));
    const meta = getInsuranceSupabaseMeta();
    return NextResponse.json({
      ok: true,
      policies,
      policyIds: policies.map((p) => p.id),
      meta: {
        ...meta,
        browser: req.headers.get("user-agent") ?? null,
      },
    });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not load insurance policies.", 500);
  }
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const { client, user } = await resolveAuthedClient(req);
    if (!user) return bad("Please sign in to save an insurance policy.", 401);

    const body = await req.json();
    const input = sanitizeInsurancePolicyInput(body);
    if (!input) return bad("Please check insurance type, provider, and coverage amount.");

    const policy = await withSchemaRetry(() => createInsurancePolicyForUser(client, user.id, input));
    return NextResponse.json({
      ok: true,
      policy,
      meta: getInsuranceSupabaseMeta(),
    });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not save insurance policy.", 500);
  }
}
