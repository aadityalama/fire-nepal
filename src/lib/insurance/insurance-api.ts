import type { InsurancePolicy, InsurancePolicyFormInput } from "@/lib/insurance/insurance-types";

async function parseJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

export async function fetchInsurancePolicies(): Promise<InsurancePolicy[]> {
  const res = await fetch("/api/insurance", { credentials: "include", cache: "no-store" });
  const json = await parseJson<{ ok: boolean; policies?: InsurancePolicy[]; error?: string }>(res);
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "Could not load your insurance policies.");
  }
  return json.policies ?? [];
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
