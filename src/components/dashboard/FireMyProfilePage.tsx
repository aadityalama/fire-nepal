"use client";

import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Coins,
  Crown,
  Download,
  Gem,
  Globe2,
  Hash,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  UserRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { AvatarUploadZone } from "@/components/product/auth/AvatarUploadZone";
import { useFireMembership } from "@/contexts/FireMembershipContext";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import {
  displayAvatar,
  displayName,
  deriveFireNepalId,
  formatPremiumPhoneDisplay,
  getPremiumProfileForUser,
  membershipExpiryIso,
  normalizePhoneNationalDigits,
  PHONE_DIAL_PRESETS,
  savePremiumProfileFull,
  validatePremiumPhone,
  type PremiumMemberProfileFields,
  type RiskProfile,
} from "@/lib/fire-premium-profile";
import { TIER_CATALOG, TIER_DISPLAY } from "@/lib/fire-membership";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchPremiumUserProfile, upsertPremiumUserProfile } from "@/services/user-profile-supabase";

const RISKS: { id: RiskProfile; label: string }[] = [
  { id: "conservative", label: "Conservative" },
  { id: "balanced", label: "Balanced" },
  { id: "growth", label: "Growth" },
  { id: "aggressive", label: "Aggressive" },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatMoney(amount: number, currency: PremiumMemberProfileFields["preferredCurrency"]): string {
  if (!amount) return "Not added";
  return `${currency} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
}

function emptyLabel(value: string | null | undefined): string {
  return value?.trim() || "Not added";
}

function ProfileValueCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.32)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-emerald-400/25 hover:bg-emerald-500/[0.06]">
      <div className="flex items-center gap-2 text-emerald-200/75">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
          {icon}
        </span>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/60">{label}</p>
      </div>
      <p className="mt-3 break-words text-base font-black tracking-tight text-white sm:text-lg">{value}</p>
    </div>
  );
}

export function FireMyProfilePage() {
  const { user } = useProductAuth();
  const { record, tier } = useFireMembership();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editing = searchParams.get("edit") === "1";
  const [profile, setProfile] = useState<PremiumMemberProfileFields | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!user) {
        setProfile(null);
        setLoadingProfile(false);
        return;
      }
      setLoadingProfile(true);
      const fallback = getPremiumProfileForUser(user);
      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setProfile(fallback);
          setLoadingProfile(false);
        }
        return;
      }
      try {
        const next = await fetchPremiumUserProfile(getSupabaseBrowserClient(), user.id, fallback);
        if (!cancelled) setProfile(next ?? fallback);
      } catch {
        if (!cancelled) {
          setProfile(fallback);
          toast.error("Could not load your saved profile.");
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const onSave = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!user || !profile || saving) return;
      const phoneCheck = validatePremiumPhone(profile.phoneDialCode, profile.phoneNationalDigits);
      if (!phoneCheck.ok) {
        setPhoneError(phoneCheck.message);
        return;
      }
      setPhoneError(null);
      setSaving(true);
      try {
        if (isSupabaseConfigured()) {
          const result = await upsertPremiumUserProfile(getSupabaseBrowserClient(), user.id, profile);
          if (result.error) throw new Error(result.error);
        }
        savePremiumProfileFull(user.id, profile);
        toast.success("Profile updated successfully.");
        router.replace("/dashboard/profile");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save profile.");
      } finally {
        setSaving(false);
      }
    },
    [profile, router, saving, user],
  );

  const expiryIso = useMemo(() => {
    if (!user) return "";
    return record.currentPeriodEnd ?? membershipExpiryIso(user);
  }, [record.currentPeriodEnd, user]);

  const remainingDays = useMemo(() => {
    const expiryDate = new Date(expiryIso);
    if (Number.isNaN(expiryDate.getTime())) return 0;
    return Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, [expiryIso]);

  if (!user || loadingProfile || !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-base font-medium text-zinc-400">
        Loading profile...
      </div>
    );
  }

  const dialPresets = PHONE_DIAL_PRESETS.map((p) => p.value);
  const isCustomDial = !dialPresets.includes(profile.phoneDialCode);
  const phoneDigits = profile.phoneNationalDigits.replace(/\D/g, "");
  const phoneValid = validatePremiumPhone(profile.phoneDialCode, profile.phoneNationalDigits);
  const hasStoredPhone = phoneDigits.length > 0 && phoneValid.ok;
  const phoneFormatted = formatPremiumPhoneDisplay(profile.phoneDialCode, profile.phoneNationalDigits);
  const joinedLabel = new Date(user.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const expiryLabel = formatDate(expiryIso);
  const remainingTone =
    remainingDays >= 180
      ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-100"
      : remainingDays >= 30
        ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
        : "border-red-400/45 bg-red-500/15 text-red-100";
  const membershipStatus = record.status === "none" ? "No active paid subscription" : record.status.replace(/_/g, " ");
  const avatar = displayAvatar(user, profile);
  const name = displayName(user, profile);
  const benefits = TIER_CATALOG[tier].bullets;

  const fieldClass =
    "w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-semibold text-white outline-none ring-emerald-500/30 placeholder:text-zinc-600 focus:ring-2";
  const labelClass = "mb-1.5 block text-[11px] font-black uppercase tracking-[0.13em] text-emerald-200/60 sm:text-xs";

  if (editing) {
    return (
      <div className="max-w-full space-y-6 overflow-x-clip pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:space-y-7 lg:pb-10">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300/75 sm:text-xs">
              Edit Profile
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">Update your member record</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed tracking-tight text-emerald-100/65 sm:text-base">
              Save once, then return to the premium profile dashboard.
            </p>
          </div>
          <Link
            href="/dashboard/profile"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/[0.08]"
          >
            Cancel
          </Link>
        </header>

        <form onSubmit={onSave} className="space-y-5 sm:space-y-6">
          <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] via-[#04140f] to-[#030806] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-4 sm:gap-5">
                <AvatarUploadZone
                  variant="compact"
                  value={profile.avatarDataUrl}
                  onChange={(url) => setProfile((p) => (p ? { ...p, avatarDataUrl: url } : p))}
                />
                <div className="min-w-0 flex-1">
                  <label className="block">
                    <span className="sr-only">Full name</span>
                    <input
                      value={profile.fullName}
                      onChange={(e) => setProfile((p) => (p ? { ...p, fullName: e.target.value } : p))}
                      placeholder="Full name"
                      autoComplete="name"
                      className="w-full border-0 border-b-2 border-white/10 bg-transparent pb-2 text-xl font-black tracking-tight text-white outline-none ring-0 placeholder:text-zinc-600 focus:border-emerald-400/55 sm:text-2xl sm:tracking-tighter"
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-100 sm:text-xs">
                      <BadgeCheck size={14} className="shrink-0" strokeWidth={2.5} />
                      {user.emailVerified ? "Verified" : "Pending verify"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-zinc-100 sm:text-xs">
                      <UserRound size={14} className="shrink-0" strokeWidth={2.5} />
                      {deriveFireNepalId(user)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/35 p-4 text-sm shadow-inner shadow-black/30 lg:min-w-64">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-200/60">Membership</p>
                <p className="mt-2 text-lg font-black text-white">{TIER_DISPLAY[tier].label}</p>
                <p className="mt-1 text-xs font-semibold capitalize text-zinc-400">{membershipStatus}</p>
                <p className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-100/80">
                  <CalendarDays size={14} aria-hidden />
                  Renews on {expiryLabel}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#04140f]/75 p-5 shadow-inner shadow-black/35 backdrop-blur-xl sm:p-6">
            <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200/75 sm:text-xs">
              Profile information
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <span className={labelClass}>Email</span>
                <div className="flex min-h-[42px] items-center gap-2 rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-sm font-semibold text-emerald-50">
                  <Mail size={15} className="shrink-0 text-emerald-400/80" aria-hidden />
                  <span className="min-w-0 truncate">{user.email}</span>
                </div>
              </div>

              <div>
                <span className={labelClass}>Joined</span>
                <div className="flex min-h-[42px] items-center gap-2 rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-sm font-semibold text-emerald-50">
                  <CalendarDays size={15} className="shrink-0 text-emerald-400/80" aria-hidden />
                  {joinedLabel}
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center gap-2">
                  <Phone size={15} className="shrink-0 text-emerald-400/80" aria-hidden />
                  <span className={labelClass}>Phone number</span>
                </div>
                {hasStoredPhone ? (
                  <p className="mb-3 font-mono text-sm font-bold tracking-wide text-emerald-50 sm:text-[15px]">
                    {phoneFormatted}
                  </p>
                ) : null}
                <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                  <select
                    value={isCustomDial ? "__other__" : profile.phoneDialCode}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPhoneError(null);
                      setProfile((p) => {
                        if (!p) return p;
                        if (v === "__other__") return { ...p, phoneDialCode: "+" };
                        return {
                          ...p,
                          phoneDialCode: v,
                          phoneNationalDigits: normalizePhoneNationalDigits(v, p.phoneNationalDigits),
                        };
                      });
                    }}
                    className="w-full shrink-0 rounded-lg border border-white/10 bg-black/50 py-2.5 pl-3 pr-8 text-sm font-bold text-white shadow-inner shadow-black/30 outline-none ring-emerald-500/30 focus:ring-2 sm:w-[9rem]"
                    aria-label="Country calling code"
                  >
                    {PHONE_DIAL_PRESETS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    <option value="__other__">Other (+...)</option>
                  </select>
                  {isCustomDial ? (
                    <input
                      value={profile.phoneDialCode}
                      onChange={(e) => {
                        setPhoneError(null);
                        let v = e.target.value;
                        if (!v.startsWith("+")) v = `+${v.replace(/\D/g, "")}`;
                        else v = `+${v.slice(1).replace(/\D/g, "").slice(0, 4)}`;
                        setProfile((p) =>
                          p
                            ? {
                                ...p,
                                phoneDialCode: v.length < 2 ? "+" : v,
                                phoneNationalDigits: normalizePhoneNationalDigits(
                                  v.length < 2 ? "+" : v,
                                  p.phoneNationalDigits,
                                ),
                              }
                            : p,
                        );
                      }}
                      placeholder="+353"
                      className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 font-mono text-sm font-semibold text-white outline-none ring-emerald-500/30 focus:ring-2 sm:w-[6rem]"
                      inputMode="numeric"
                      aria-label="Custom country code"
                    />
                  ) : null}
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="Add phone number"
                    value={profile.phoneNationalDigits}
                    onChange={(e) => {
                      setPhoneError(null);
                      setProfile((p) =>
                        p
                          ? {
                              ...p,
                              phoneNationalDigits: normalizePhoneNationalDigits(p.phoneDialCode, e.target.value),
                            }
                          : p,
                      );
                    }}
                    className={fieldClass}
                    aria-label="National phone number"
                  />
                </div>
                {phoneError ? <p className="mt-2.5 text-sm font-semibold text-amber-200/90">{phoneError}</p> : null}
              </div>

              <label className="block">
                <span className={labelClass}>Country</span>
                <input
                  value={profile.country}
                  onChange={(e) => setProfile((p) => (p ? { ...p, country: e.target.value } : p))}
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Country of work</span>
                <input
                  value={profile.countryOfWork}
                  onChange={(e) => setProfile((p) => (p ? { ...p, countryOfWork: e.target.value } : p))}
                  className={fieldClass}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Preferred currency</span>
                <select
                  value={profile.preferredCurrency}
                  onChange={(e) =>
                    setProfile((p) =>
                      p ? { ...p, preferredCurrency: e.target.value as PremiumMemberProfileFields["preferredCurrency"] } : p,
                    )
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-bold text-white outline-none ring-emerald-500/30 focus:ring-2"
                >
                  <option value="NPR">NPR - Nepalese Rupee</option>
                  <option value="KRW">KRW - Korean Won</option>
                  <option value="USD">USD - US Dollar</option>
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>FIRE goal</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={profile.fireGoalAmount || ""}
                  onChange={(e) => setProfile((p) => (p ? { ...p, fireGoalAmount: Number(e.target.value) || 0 } : p))}
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Monthly investment</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={profile.monthlyInvestment || ""}
                  onChange={(e) => setProfile((p) => (p ? { ...p, monthlyInvestment: Number(e.target.value) || 0 } : p))}
                  className={fieldClass}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Risk profile</span>
                <select
                  value={profile.riskProfile}
                  onChange={(e) => setProfile((p) => (p ? { ...p, riskProfile: e.target.value as RiskProfile } : p))}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-semibold text-white outline-none ring-emerald-500/30 focus:ring-2"
                >
                  {RISKS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-white/5 pt-5">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-2.5 text-sm font-black text-emerald-950 shadow-md shadow-emerald-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:px-6 sm:py-3 sm:text-[15px]"
              >
                {saving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </section>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-full space-y-6 overflow-x-clip pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:space-y-7 lg:pb-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300/75 sm:text-xs">
            Premium Profile
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">Member Profile Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed tracking-tight text-emerald-100/65 sm:text-base">
            Your saved FIRE Nepal account, membership status, and planning profile.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/dashboard/profile?edit=1"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-3 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5"
          >
            Edit Profile
          </Link>
          <button
            type="button"
            disabled
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-black text-zinc-400"
          >
            <Download size={16} aria-hidden />
            Download Member Card
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-[1.75rem] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.12] via-[#04140f]/95 to-[#020807] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-6 lg:p-7">
        <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-lime-400/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden />
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border border-emerald-300/30 bg-emerald-500/10 shadow-[0_0_42px_rgba(16,185,129,0.24)] ring-4 ring-emerald-500/10 sm:h-32 sm:w-32">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-emerald-200">
                  <UserRound size={48} strokeWidth={1.75} />
                </div>
              )}
              <Link
                href="/dashboard/profile?edit=1"
                aria-label="Edit profile photo"
                className="absolute bottom-1 right-1 grid h-10 w-10 place-items-center rounded-full border border-emerald-300/35 bg-emerald-500 text-emerald-950 shadow-lg transition hover:scale-105"
              >
                <Camera size={18} strokeWidth={2.5} />
              </Link>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="min-w-0 break-words text-2xl font-black tracking-tight text-white sm:text-3xl">{name}</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-100">
                  <BadgeCheck size={14} strokeWidth={2.5} />
                  {user.emailVerified ? "Verified" : "Pending verify"}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-lg ring-1 ring-white/10 bg-gradient-to-r ${TIER_DISPLAY[tier].accent}`}
                >
                  {tier === "elite" ? <Crown size={14} className="text-amber-200" /> : null}
                  {tier === "premium" ? <Gem size={14} className="text-emerald-100" /> : null}
                  {tier === "free" ? <Sparkles size={14} className="text-zinc-200" /> : null}
                  {TIER_DISPLAY[tier].label}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm font-semibold text-emerald-50/82">
                <p className="flex min-w-0 items-center gap-2">
                  <Mail size={16} className="shrink-0 text-emerald-300" aria-hidden />
                  <span className="min-w-0 truncate">{user.email}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone size={16} className="shrink-0 text-emerald-300" aria-hidden />
                  {hasStoredPhone ? phoneFormatted : "Phone not added"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[31rem]">
            <div className={`sm:col-span-3 rounded-2xl border p-4 shadow-[0_18px_50px_rgba(0,0,0,0.25)] ${remainingTone}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] opacity-90">
                    <Timer size={16} aria-hidden />
                    Membership countdown
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-tight tabular-nums">
                    {Math.max(0, remainingDays)} Days Remaining
                  </p>
                  <p className="mt-1 text-sm font-semibold opacity-85">Renews on {expiryLabel}</p>
                </div>
                {remainingDays < 30 ? <ShieldCheck size={24} className="shrink-0" aria-hidden /> : null}
              </div>
            </div>
            <ProfileValueCard icon={<Hash size={16} />} label="FIRE Nepal ID" value={deriveFireNepalId(user)} />
            <ProfileValueCard icon={<CalendarDays size={16} />} label="Joined Date" value={joinedLabel} />
            <ProfileValueCard icon={<Timer size={16} />} label="Expiry Date" value={expiryLabel} />
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-white/10 bg-[#04140f]/75 p-5 shadow-inner shadow-black/35 backdrop-blur-xl sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300/75 sm:text-xs">
          Profile Summary
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ProfileValueCard icon={<Globe2 size={16} />} label="Country" value={emptyLabel(profile.country)} />
          <ProfileValueCard icon={<BriefcaseBusiness size={16} />} label="Country of Work" value={emptyLabel(profile.countryOfWork)} />
          <ProfileValueCard icon={<Coins size={16} />} label="Preferred Currency" value={profile.preferredCurrency} />
          <ProfileValueCard icon={<Target size={16} />} label="FIRE Goal" value={formatMoney(profile.fireGoalAmount, profile.preferredCurrency)} />
          <ProfileValueCard icon={<TrendingUp size={16} />} label="Monthly Investment" value={formatMoney(profile.monthlyInvestment, profile.preferredCurrency)} />
          <ProfileValueCard
            icon={<ShieldCheck size={16} />}
            label="Risk Profile"
            value={RISKS.find((r) => r.id === profile.riskProfile)?.label ?? "Balanced"}
          />
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.09] via-[#04140f] to-[#020807] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300/75 sm:text-xs">
              Membership
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black text-white shadow-lg ring-1 ring-white/10 bg-gradient-to-r ${TIER_DISPLAY[tier].accent}`}
              >
                <WalletCards size={17} aria-hidden />
                {TIER_DISPLAY[tier].label}
              </span>
              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-100/80">
                {Math.max(0, remainingDays)} days remaining
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-zinc-400">Renewal Date: {expiryLabel}</p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2.5 text-sm font-semibold text-emerald-50/85">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link
            href="/dashboard/membership"
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-500/20"
          >
            View Membership Benefits
          </Link>
        </div>
      </section>
    </div>
  );
}
