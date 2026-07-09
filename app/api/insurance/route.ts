import { NextResponse } from "next/server";
import {
  INSURANCE_TYPES,
  type InsurancePaymentFrequency,
  type InsurancePolicyFormInput,
  type InsuranceType,
} from "@/lib/insurance/insurance-types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createInsurancePolicyForUser, listInsurancePoliciesForUser } from "@/services/insurance-supabase";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

const FREQUENCIES: InsurancePaymentFrequency[] = ["monthly", "quarterly", "yearly", "one_time"];

function sanitizeCreateInput(raw: unknown): InsurancePolicyFormInput | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const type = typeof source.type === "string" && INSURANCE_TYPES.includes(source.type as InsuranceType)
    ? (source.type as InsuranceType)
    : null;
  const coverageAmountNpr =
    typeof source.coverageAmountNpr === "number" ? source.coverageAmountNpr : Number(source.coverageAmountNpr);
  const premiumNpr = typeof source.premiumNpr === "number" ? source.premiumNpr : Number(source.premiumNpr);
  const paymentFrequency =
    typeof source.paymentFrequency === "string" && FREQUENCIES.includes(source.paymentFrequency as InsurancePaymentFrequency)
      ? (source.paymentFrequency as InsurancePaymentFrequency)
      : null;
  const provider = typeof source.provider === "string" ? source.provider.trim() : "";

  if (!type || !paymentFrequency || !provider || !Number.isFinite(coverageAmountNpr) || coverageAmountNpr < 0) {
    return null;
  }

  const familyMembersCovered = Array.isArray(source.familyMembersCovered)
    ? source.familyMembersCovered.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  return {
    type,
    provider,
    coverageAmountNpr: Math.round(coverageAmountNpr),
    premiumNpr: Number.isFinite(premiumNpr) ? Math.max(0, Math.round(premiumNpr)) : 0,
    paymentFrequency,
    startDate: typeof source.startDate === "string" ? source.startDate : "",
    expiryDate: typeof source.expiryDate === "string" ? source.expiryDate : "",
    nominee: typeof source.nominee === "string" ? source.nominee : "",
    familyMembersCovered,
    notes: typeof source.notes === "string" ? source.notes : "",
    documentDataUrl: typeof source.documentDataUrl === "string" ? source.documentDataUrl : null,
    documentFileName: typeof source.documentFileName === "string" ? source.documentFileName : null,
  };
}

export async function GET() {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const sb = await createServerSupabaseClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return bad("Please sign in to view your insurance policies.", 401);

    const policies = await listInsurancePoliciesForUser(sb, data.user.id);
    return NextResponse.json({ ok: true, policies });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not load insurance policies.", 500);
  }
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const sb = await createServerSupabaseClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return bad("Please sign in to save an insurance policy.", 401);

    const body = await req.json();
    const input = sanitizeCreateInput(body);
    if (!input) return bad("Please check insurance type, provider, and coverage amount.");

    const policy = await createInsurancePolicyForUser(sb, data.user.id, input);
    return NextResponse.json({ ok: true, policy });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not save insurance policy.", 500);
  }
}
