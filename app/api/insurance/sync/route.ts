import { NextResponse } from "next/server";
import { buildInsuranceImportFingerprint } from "@/lib/insurance/insurance-mapper";
import { sanitizeInsurancePolicyInput } from "@/lib/insurance/insurance-sanitize";
import { policyToFormInput } from "@/lib/insurance/policy-to-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  ensureFinanceInsurancePoliciesSchema,
  getInsuranceSupabaseMeta,
  isMissingInsuranceTableError,
} from "@/services/ensure-insurance-schema";
import {
  createInsurancePolicyForUser,
  listInsurancePoliciesForUser,
} from "@/services/insurance-supabase";
import type { InsurancePolicy } from "@/lib/insurance/insurance-types";

function bad(msg: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: msg, meta: getInsuranceSupabaseMeta(), ...extra }, { status });
}

function policyFingerprint(policy: Pick<
  InsurancePolicy,
  "provider" | "type" | "coverageAmountNpr" | "premiumNpr" | "startDate" | "policyNumber"
>) {
  return buildInsuranceImportFingerprint({
    type: policy.type,
    provider: policy.provider,
    coverageAmountNpr: policy.coverageAmountNpr,
    premiumNpr: policy.premiumNpr,
    startDate: policy.startDate,
    policyNumber: policy.policyNumber ?? "",
  });
}

/**
 * Merge browser-local policies into the single production table, then return cloud rows.
 * Dedupes by id + import_fingerprint so Chrome/Safari never double-import.
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const sb = await createServerSupabaseClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return bad("Please sign in to sync insurance policies.", 401);

    const body = (await req.json().catch(() => ({}))) as { policies?: unknown };
    const localRaw = Array.isArray(body.policies) ? body.policies : [];

    async function listOrEnsure() {
      try {
        return await listInsurancePoliciesForUser(sb, data.user!.id);
      } catch (error) {
        if (!isMissingInsuranceTableError(error)) throw error;
        const ensured = await ensureFinanceInsurancePoliciesSchema();
        if (!ensured.ok) {
          throw new Error(ensured.message);
        }
        // Brief pause for PostgREST schema cache reload.
        await new Promise((r) => setTimeout(r, 600));
        return listInsurancePoliciesForUser(sb, data.user!.id);
      }
    }

    let remote = await listOrEnsure();
    const remoteById = new Set(remote.map((p) => p.id));
    const remoteByFp = new Set(remote.map((p) => policyFingerprint(p)));

    const uploaded: string[] = [];
    const skipped: string[] = [];

    for (const item of localRaw) {
      if (!item || typeof item !== "object") continue;
      const row = item as InsurancePolicy;
      const id = typeof row.id === "string" ? row.id : "";
      if (id && remoteById.has(id)) {
        skipped.push(id);
        continue;
      }
      const fp = policyFingerprint({
        type: row.type,
        provider: row.provider,
        coverageAmountNpr: row.coverageAmountNpr,
        premiumNpr: row.premiumNpr,
        startDate: row.startDate,
        policyNumber: row.policyNumber ?? "",
      });
      if (remoteByFp.has(fp)) {
        skipped.push(id || fp);
        continue;
      }

      const input = sanitizeInsurancePolicyInput(policyToFormInput(row));
      if (!input) continue;

      try {
        const saved = await createInsurancePolicyForUser(sb, data.user.id, input, {
          importFingerprint: fp,
        });
        uploaded.push(saved.id);
        remoteById.add(saved.id);
        remoteByFp.add(policyFingerprint(saved));
        remoteByFp.add(fp);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/duplicate insurance policy import skipped/i.test(message)) {
          skipped.push(id || fp);
          remoteByFp.add(fp);
          continue;
        }
        if (isMissingInsuranceTableError(error)) {
          const ensured = await ensureFinanceInsurancePoliciesSchema();
          if (!ensured.ok) throw new Error(ensured.message);
          await new Promise((r) => setTimeout(r, 600));
          try {
            const saved = await createInsurancePolicyForUser(sb, data.user.id, input, {
              importFingerprint: fp,
            });
            uploaded.push(saved.id);
            remoteById.add(saved.id);
            remoteByFp.add(policyFingerprint(saved));
            remoteByFp.add(fp);
          } catch (retryError) {
            const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
            if (/duplicate insurance policy import skipped/i.test(retryMessage)) {
              skipped.push(id || fp);
              remoteByFp.add(fp);
              continue;
            }
            throw retryError;
          }
          continue;
        }
        throw error;
      }
    }

    remote = await listOrEnsure();
    const meta = getInsuranceSupabaseMeta();

    return NextResponse.json({
      ok: true,
      policies: remote,
      policyIds: remote.map((p) => p.id),
      uploadedCount: uploaded.length,
      uploadedIds: uploaded,
      skippedCount: skipped.length,
      cloudPrimary: true,
      meta: {
        ...meta,
        browser: req.headers.get("user-agent") ?? null,
      },
    });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not sync insurance policies.", 500);
  }
}
