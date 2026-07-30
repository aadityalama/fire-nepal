import type { InsurancePolicy, InsurancePolicyFormInput } from "@/lib/insurance/insurance-types";

export type InsuranceQueryMeta = {
  supabaseUrl: string | null;
  projectRef: string | null;
  schema: string;
  table: string;
  listSql: string;
  hasDbUrl?: boolean;
  browser?: string | null;
};

export type InsuranceRuntimeProbe = {
  at: string;
  browser: string;
  userId: string | null;
  dataLoadedFrom: "supabase" | "localStorage" | "pending";
  renderedSource: "supabase" | "localStorage" | "pending";
  supabasePolicyCount: number;
  localStoragePolicyCount: number;
  localStoragePolicyCountAfterCache: number;
  policyIds: string[];
  uploadedCount: number;
  protectionScorePct: number | null;
  engineInputs?: {
    monthlyIncomeNpr: number;
    adults: number;
    children: number;
    totalSavingsNpr: number;
  };
  table: string | null;
  supabaseUrl: string | null;
  error?: string;
};

declare global {
  interface Window {
    __FIRE_NEPAL_INSURANCE_RUNTIME__?: InsuranceRuntimeProbe;
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

function withCacheBust(url: string) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_ts=${Date.now()}`;
}

export async function fetchInsurancePolicies(): Promise<{
  policies: InsurancePolicy[];
  policyIds: string[];
  meta: InsuranceQueryMeta | null;
}> {
  const res = await fetch(withCacheBust("/api/insurance"), { credentials: "include", cache: "no-store" });
  const json = await parseJson<{
    ok: boolean;
    policies?: InsurancePolicy[];
    policyIds?: string[];
    meta?: InsuranceQueryMeta;
    error?: string;
  }>(res);
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "Could not load your insurance policies.");
  }
  const policies = json.policies ?? [];
  return {
    policies,
    policyIds: json.policyIds ?? policies.map((p) => p.id),
    meta: json.meta ?? null,
  };
}

/** Upload browser-local policies into public.finance_insurance_policies, then return cloud rows. */
export async function syncInsurancePoliciesFromLocal(localPolicies: InsurancePolicy[]): Promise<{
  policies: InsurancePolicy[];
  policyIds: string[];
  uploadedIds: string[];
  meta: InsuranceQueryMeta | null;
}> {
  const res = await fetch(withCacheBust("/api/insurance/sync"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ policies: localPolicies }),
    cache: "no-store",
  });
  const json = await parseJson<{
    ok: boolean;
    policies?: InsurancePolicy[];
    policyIds?: string[];
    uploadedIds?: string[];
    meta?: InsuranceQueryMeta;
    error?: string;
  }>(res);
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "Could not sync your insurance policies.");
  }
  const policies = json.policies ?? [];
  return {
    policies,
    policyIds: json.policyIds ?? policies.map((p) => p.id),
    uploadedIds: json.uploadedIds ?? [],
    meta: json.meta ?? null,
  };
}

export async function ensureInsuranceSchema(): Promise<{ ok: boolean; tableExists: boolean; message?: string }> {
  const res = await fetch(withCacheBust("/api/insurance/schema"), { cache: "no-store" });
  const json = await parseJson<{
    ok: boolean;
    tableExists?: boolean;
    ensure?: { message?: string };
    probeError?: string | null;
    error?: string;
  }>(res);
  return {
    ok: Boolean(json.ok) || Boolean(json.tableExists),
    tableExists: Boolean(json.tableExists),
    message: json.ensure?.message ?? json.probeError ?? json.error,
  };
}

export function publishInsuranceRuntimeProbe(probe: InsuranceRuntimeProbe) {
  if (typeof window === "undefined") return;
  window.__FIRE_NEPAL_INSURANCE_RUNTIME__ = probe;
  console.info("[insurance-runtime]", probe);
}

export async function createInsurancePolicy(input: InsurancePolicyFormInput): Promise<InsurancePolicy> {
  const res = await fetch("/api/insurance", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ ok: boolean; policy?: InsurancePolicy; error?: string }>(res);
  if (!res.ok || !json.ok || !json.policy) {
    throw new Error(json.error ?? "Could not save your insurance policy.");
  }
  return json.policy;
}

export async function updateInsurancePolicy(id: string, input: InsurancePolicyFormInput): Promise<InsurancePolicy> {
  const res = await fetch(`/api/insurance/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ ok: boolean; policy?: InsurancePolicy; error?: string }>(res);
  if (!res.ok || !json.ok || !json.policy) {
    throw new Error(json.error ?? "Could not update your insurance policy.");
  }
  return json.policy;
}

export async function deleteInsurancePolicy(id: string): Promise<void> {
  const res = await fetch(`/api/insurance/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  const json = await parseJson<{ ok: boolean; error?: string }>(res);
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "Could not delete your insurance policy.");
  }
}
