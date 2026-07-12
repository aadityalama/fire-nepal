import type { SupabaseClient } from "@supabase/supabase-js";
import type { PremiumMemberProfileFields, RiskProfile } from "@/lib/fire-premium-profile";
import type { Database } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;
type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];

const CURRENCIES = new Set(["NPR", "KRW", "USD"]);
const RISK_PROFILES = new Set<RiskProfile>(["conservative", "balanced", "growth", "aggressive"]);

export async function upsertUserProfileFields(
  client: Client,
  userId: string,
  fields: { display_name?: string | null; avatar_url?: string | null; preferred_currency?: "NPR" | "KRW" | "USD" },
): Promise<{ error: string | null }> {
  const { error } = await client.from("user_profiles").upsert(
    {
      id: userId,
      ...fields,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  return { error: error?.message ?? null };
}

export async function fetchUserProfile(client: Client, userId: string) {
  const { data, error } = await client.from("user_profiles").select("*").eq("id", userId).maybeSingle();
  if (error) return null;
  return data;
}

export async function fetchCanonicalFireNepalId(client: Client, userId: string): Promise<string | null> {
  const { data, error } = await client.from("user_profiles").select("fire_nepal_id").eq("id", userId).maybeSingle();
  if (error) return null;
  return data?.fire_nepal_id?.trim() || null;
}

function currencyOrDefault(value: string | null | undefined): PremiumMemberProfileFields["preferredCurrency"] {
  return CURRENCIES.has(value ?? "") ? (value as PremiumMemberProfileFields["preferredCurrency"]) : "NPR";
}

function riskOrDefault(value: string | null | undefined): RiskProfile {
  return RISK_PROFILES.has(value as RiskProfile) ? (value as RiskProfile) : "balanced";
}

export function mapUserProfileToPremiumFields(
  row: UserProfileRow | null,
  fallback: PremiumMemberProfileFields,
): PremiumMemberProfileFields {
  if (!row) return fallback;
  return {
    fireNepalId: row.fire_nepal_id ?? fallback.fireNepalId,
    fullName: row.display_name ?? fallback.fullName,
    avatarDataUrl: row.avatar_url ?? fallback.avatarDataUrl,
    phoneDialCode: row.phone_dial_code ?? fallback.phoneDialCode,
    phoneNationalDigits: row.phone_national_digits ?? fallback.phoneNationalDigits,
    country: row.country ?? fallback.country,
    countryOfWork: row.country_of_work ?? fallback.countryOfWork,
    preferredCurrency: currencyOrDefault(row.preferred_currency),
    fireGoalAmount: Number(row.fire_goal ?? fallback.fireGoalAmount),
    monthlyInvestment: Number(row.monthly_investment ?? fallback.monthlyInvestment),
    riskProfile: riskOrDefault(row.risk_profile),
  };
}

export async function fetchPremiumUserProfile(
  client: Client,
  userId: string,
  fallback: PremiumMemberProfileFields,
): Promise<PremiumMemberProfileFields | null> {
  const row = await fetchUserProfile(client, userId);
  return mapUserProfileToPremiumFields(row, fallback);
}

export async function upsertPremiumUserProfile(
  client: Client,
  userId: string,
  fields: PremiumMemberProfileFields,
): Promise<{ error: string | null }> {
  const { error } = await client.from("user_profiles").upsert(
    {
      id: userId,
      fire_nepal_id: fields.fireNepalId || undefined,
      display_name: fields.fullName.trim() || null,
      avatar_url: fields.avatarDataUrl,
      phone_dial_code: fields.phoneDialCode,
      phone_national_digits: fields.phoneNationalDigits,
      country: fields.country.trim() || null,
      country_of_work: fields.countryOfWork.trim() || null,
      preferred_currency: fields.preferredCurrency,
      fire_goal: fields.fireGoalAmount || null,
      monthly_investment: fields.monthlyInvestment || null,
      risk_profile: fields.riskProfile,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  return { error: error?.message ?? null };
}
