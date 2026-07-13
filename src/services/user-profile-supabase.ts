import type { SupabaseClient } from "@supabase/supabase-js";
import { mapUserProfileRowToMemberCard, type MemberCardData } from "@/lib/member-card-profile";
import type { PremiumMemberProfileFields, RiskProfile } from "@/lib/fire-premium-profile";
import type { Database } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;
type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];

const CURRENCIES = new Set(["NPR", "KRW", "USD"]);
const RISK_PROFILES = new Set<RiskProfile>(["conservative", "balanced", "growth", "aggressive"]);

export async function upsertUserProfileFields(
  client: Client,
  userId: string,
  fields: { full_name?: string | null; avatar_url?: string | null; preferred_currency?: "NPR" | "KRW" | "USD" },
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

function currencyOrDefault(value: string | null | undefined): PremiumMemberProfileFields["preferredCurrency"] {
  return CURRENCIES.has(value ?? "") ? (value as PremiumMemberProfileFields["preferredCurrency"]) : "NPR";
}

function riskOrDefault(value: string | null | undefined): RiskProfile {
  return RISK_PROFILES.has(value as RiskProfile) ? (value as RiskProfile) : "balanced";
}

export function mapUserProfileToPremiumFields(
  row: UserProfileRow | null,
): PremiumMemberProfileFields {
  return {
    fireNepalId: row?.fire_nepal_id?.trim() ?? "",
    fullName: row?.full_name?.trim() ?? "",
    avatarDataUrl: row?.avatar_url ?? null,
    phoneDialCode: row?.phone_dial_code?.trim() || "+977",
    phoneNationalDigits: row?.phone_national_digits ?? "",
    country: row?.country ?? "",
    countryOfWork: row?.country_of_work ?? "",
    preferredCurrency: currencyOrDefault(row?.preferred_currency),
    fireGoalAmount: Number(row?.fire_goal ?? 0),
    monthlyInvestment: Number(row?.monthly_investment ?? 0),
    riskProfile: riskOrDefault(row?.risk_profile),
  };
}

export async function getCurrentUserProfile(
  client: Client,
  userId: string,
): Promise<PremiumMemberProfileFields> {
  const existing = await fetchUserProfile(client, userId);
  if (existing) return mapUserProfileToPremiumFields(existing);

  const { data, error } = await client
    .from("user_profiles")
    .insert({ id: userId })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapUserProfileToPremiumFields(data);
}

export async function saveCurrentUserProfile(
  client: Client,
  userId: string,
  fields: PremiumMemberProfileFields,
): Promise<PremiumMemberProfileFields> {
  const { error } = await client.from("user_profiles").upsert(
    {
      id: userId,
      full_name: fields.fullName.trim() || null,
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
  if (error) throw new Error(error.message);
  return getCurrentUserProfile(client, userId);
}

export async function getMemberCardProfile(client: Client, userId: string): Promise<MemberCardData> {
  const row = await fetchUserProfile(client, userId);
  if (!row) throw new Error("Profile not found.");
  return mapUserProfileRowToMemberCard(row);
}
