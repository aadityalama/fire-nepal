"use client";

import { BadgeCheck, CalendarDays, Crown, Gem, Hash, Phone, Shield, Sparkles, Timer } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AvatarUploadZone } from "@/components/product/auth/AvatarUploadZone";
import { FireDashboardMetrics } from "@/components/dashboard/FireDashboardMetrics";
import { EliteBloombergStrip } from "@/components/membership/EliteBloombergStrip";
import { useFireMembership } from "@/contexts/FireMembershipContext";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import {
  deriveFireNepalId,
  formatPremiumPhoneDisplay,
  getPremiumProfileForUser,
  membershipExpiryIso,
  normalizePhoneNationalDigits,
  PHONE_DIAL_PRESETS,
  type PremiumMemberProfileFields,
  type RiskProfile,
  savePremiumProfileFull,
  validatePremiumPhone,
} from "@/lib/fire-premium-profile";
import { TIER_DISPLAY } from "@/lib/fire-membership";

const RISKS: { id: RiskProfile; label: string }[] = [
  { id: "conservative", label: "Conservative" },
  { id: "balanced", label: "Balanced" },
  { id: "growth", label: "Growth" },
  { id: "aggressive", label: "Aggressive" },
];

export function FirePremiumProfilePage() {
  const { user } = useProductAuth();
  const { tier } = useFireMembership();
  const [profile, setProfile] = useState<PremiumMemberProfileFields | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [dashKey, setDashKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    setProfile(getPremiumProfileForUser(user));
  }, [user]);

  const onSave = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!user || !profile) return;
      const phoneCheck = validatePremiumPhone(profile.phoneDialCode, profile.phoneNationalDigits);
      if (!phoneCheck.ok) {
        setPhoneError(phoneCheck.message);
        return;
      }
      setPhoneError(null);
      savePremiumProfileFull(user.id, profile);
      setSavedMsg("Profile saved locally.");
      setDashKey((k) => k + 1);
      window.setTimeout(() => setSavedMsg(null), 2800);
    },
    [user, profile],
  );

  if (!user || !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-base font-medium text-zinc-400">
        Loading profile…
      </div>
    );
  }

  const fnId = deriveFireNepalId(user);
  const expiry = membershipExpiryIso(user);
  const verified = user.emailVerified === true;
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
  const expiryLabel = new Date(expiry).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const statCardClass =
    "flex min-h-[4.5rem] flex-col rounded-lg border border-emerald-400/25 bg-black/45 px-3 py-3 shadow-[0_0_28px_rgba(16,185,129,0.1),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:min-h-[4.75rem] sm:px-3.5 sm:py-3.5 lg:px-4 lg:py-4";

  return (
    <div className="max-w-full space-y-6 overflow-x-clip pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:space-y-7 lg:pb-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed tracking-tight text-emerald-100/60 sm:text-base">
          {tier === "elite"
            ? "Elite workspace — AI Wealth Dashboard, family & education planning, Nepal Return Simulator, real-estate intelligence, and private advisory tools (UI previews ship incrementally)."
            : tier === "premium"
              ? "Premium workspace — advanced analytics, AI coach, and OCR-ready flows. Upgrade to Elite for the terminal layer."
              : "Core workspace — review your member record and track FIRE KPIs locally. Upgrade to Premium for AI, OCR, and advanced analytics."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/dashboard/ai-coach"
            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3.5 py-2 text-xs font-black tracking-wide text-cyan-50 transition hover:bg-cyan-500/20 sm:px-4 sm:py-2 sm:text-[13px]"
          >
            AI Coach
          </Link>
        </div>
      </div>

      <form onSubmit={onSave} className="space-y-5 sm:space-y-6">
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] via-[#04140f] to-[#030806] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200/70 sm:text-xs">
            Member overview
          </p>

          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
            <div className="min-w-0 flex-1 space-y-5 lg:max-w-xl">
              <div className="flex flex-row items-start gap-3 sm:gap-5">
                <div className="shrink-0">
                  <AvatarUploadZone
                    variant="compact"
                    value={profile.avatarDataUrl}
                    onChange={(url) => setProfile((p) => (p ? { ...p, avatarDataUrl: url } : p))}
                  />
                </div>
                <div className="min-w-0 flex-1 lg:hidden">
                  <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-3 min-[400px]:gap-3 sm:gap-4 md:gap-5">
                    <div className={statCardClass}>
                      <div className="flex flex-wrap items-start gap-1.5 text-zinc-400">
                        <Hash size={12} className="mt-0.5 shrink-0 opacity-90" aria-hidden />
                        <span className="min-w-0 text-[10px] font-black uppercase leading-snug tracking-[0.12em] text-zinc-300 sm:text-[11px]">
                          FIRE Nepal ID
                        </span>
                      </div>
                      <p className="mt-2 break-all font-mono text-[11px] font-black leading-relaxed tracking-wide text-emerald-100 sm:text-xs md:text-[13px]">
                        {fnId}
                      </p>
                    </div>
                    <div className={statCardClass}>
                      <div className="flex flex-wrap items-start gap-1.5 text-zinc-400">
                        <CalendarDays size={12} className="mt-0.5 shrink-0 opacity-90" aria-hidden />
                        <span className="min-w-0 text-[10px] font-black uppercase leading-snug tracking-[0.12em] text-zinc-300 sm:text-[11px]">
                          Joined
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] font-bold leading-relaxed text-zinc-50 sm:text-xs md:text-[13px]">{joinedLabel}</p>
                    </div>
                    <div className={statCardClass}>
                      <div className="flex flex-wrap items-start gap-1.5 text-zinc-400">
                        <Timer size={12} className="mt-0.5 shrink-0 opacity-90" aria-hidden />
                        <span className="min-w-0 text-[10px] font-black uppercase leading-snug tracking-[0.12em] text-zinc-300 sm:text-[11px]">
                          Expires
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] font-bold leading-relaxed text-amber-100 sm:text-xs md:text-[13px]">
                        {expiryLabel}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
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

                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  {verified ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.12)] sm:text-xs">
                      <BadgeCheck size={14} className="shrink-0" strokeWidth={2.5} />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-amber-50 sm:text-xs">
                      Pending verify
                    </span>
                  )}
                  {tier === "elite" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/45 bg-gradient-to-r from-amber-500/25 to-amber-600/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-amber-50 shadow-[0_0_18px_rgba(245,158,11,0.15)] sm:text-xs">
                      <Crown size={14} className="shrink-0" strokeWidth={2.5} />
                      {TIER_DISPLAY.elite.label}
                    </span>
                  ) : tier === "premium" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.14)] sm:text-xs">
                      <Gem size={14} className="shrink-0" strokeWidth={2.5} />
                      {TIER_DISPLAY.premium.label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-zinc-100 sm:text-xs">
                      <Sparkles size={14} className="shrink-0" strokeWidth={2.5} />
                      {TIER_DISPLAY.free.label}
                    </span>
                  )}
                </div>

                <p className="truncate text-sm font-semibold tracking-tight text-emerald-100/65 sm:text-[15px]">
                  {user.email}
                </p>

                <div className="rounded-lg border border-emerald-500/20 bg-black/35 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_24px_rgba(16,185,129,0.06)] backdrop-blur-md sm:p-4">
                  <div className="flex items-center gap-2">
                    <Phone size={15} className="shrink-0 text-emerald-400/80" aria-hidden />
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-200/55 sm:text-xs">
                      Phone number
                    </span>
                  </div>
                  {hasStoredPhone ? (
                    <p className="mt-2.5 font-mono text-base font-bold tracking-wide text-emerald-50 sm:text-[17px]">
                      {phoneFormatted}
                    </p>
                  ) : (
                    <p className="mt-2.5 text-sm font-semibold text-zinc-500">Add phone number</p>
                  )}
                  <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
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
                      <option value="__other__">Other (+…)</option>
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
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 font-mono text-sm font-semibold text-white outline-none ring-emerald-500/30 placeholder:text-zinc-600 focus:ring-2"
                      aria-label="National phone number"
                    />
                  </div>
                  {phoneError ? <p className="mt-2.5 text-sm font-semibold text-amber-200/90">{phoneError}</p> : null}
                </div>
              </div>
            </div>

            <div className="hidden shrink-0 lg:block lg:w-[min(100%,26rem)] xl:w-[28.5rem] 2xl:w-[30rem]">
              <div className="grid grid-cols-3 gap-3 lg:gap-4 xl:gap-5">
                <div className={statCardClass}>
                  <div className="flex flex-wrap items-start gap-1.5 text-zinc-400">
                    <Hash size={13} className="mt-0.5 shrink-0 opacity-90" aria-hidden />
                    <span className="min-w-0 text-[10px] font-black uppercase leading-snug tracking-[0.13em] text-zinc-300 lg:text-[11px]">
                      FIRE Nepal ID
                    </span>
                  </div>
                  <p className="mt-2.5 break-all font-mono text-xs font-black leading-relaxed tracking-wide text-emerald-100 lg:text-[13px] xl:text-sm">
                    {fnId}
                  </p>
                </div>
                <div className={statCardClass}>
                  <div className="flex flex-wrap items-start gap-1.5 text-zinc-400">
                    <CalendarDays size={13} className="mt-0.5 shrink-0 opacity-90" aria-hidden />
                    <span className="min-w-0 text-[10px] font-black uppercase leading-snug tracking-[0.13em] text-zinc-300 lg:text-[11px]">
                      Joined
                    </span>
                  </div>
                  <p className="mt-2.5 text-xs font-bold leading-relaxed text-zinc-50 lg:text-[13px] xl:text-sm">{joinedLabel}</p>
                </div>
                <div className={statCardClass}>
                  <div className="flex flex-wrap items-start gap-1.5 text-zinc-400">
                    <Timer size={13} className="mt-0.5 shrink-0 opacity-90" aria-hidden />
                    <span className="min-w-0 text-[10px] font-black uppercase leading-snug tracking-[0.13em] text-zinc-300 lg:text-[11px]">
                      Expires
                    </span>
                  </div>
                  <p className="mt-2.5 text-xs font-bold leading-relaxed text-amber-100 lg:text-[13px] xl:text-sm">{expiryLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#04140f]/75 p-5 shadow-inner shadow-black/35 backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200/75 sm:text-xs">
                Workspace
              </h2>
              <p className="mt-1 text-xs font-semibold text-zinc-500 sm:text-sm">Locale, currency, and FIRE inputs</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.13em] text-emerald-200/55 sm:text-xs">
                Country
              </span>
              <input
                value={profile.country}
                onChange={(e) => setProfile((p) => (p ? { ...p, country: e.target.value } : p))}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-semibold text-white outline-none ring-emerald-500/30 focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.13em] text-emerald-200/55 sm:text-xs">
                Country of work
              </span>
              <input
                value={profile.countryOfWork}
                onChange={(e) => setProfile((p) => (p ? { ...p, countryOfWork: e.target.value } : p))}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-semibold text-white outline-none ring-emerald-500/30 focus:ring-2"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.13em] text-emerald-200/55 sm:text-xs">
                Preferred currency
              </span>
              <select
                value={profile.preferredCurrency}
                onChange={(e) =>
                  setProfile((p) =>
                    p ? { ...p, preferredCurrency: e.target.value as PremiumMemberProfileFields["preferredCurrency"] } : p,
                  )
                }
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-bold text-white outline-none ring-emerald-500/30 focus:ring-2"
              >
                <option value="NPR">NPR — Nepalese Rupee</option>
                <option value="KRW">KRW — Korean Won</option>
                <option value="USD">USD — US Dollar</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200/45">
                FIRE goal amount
              </span>
              <input
                type="number"
                min={0}
                step={1000}
                value={profile.fireGoalAmount || ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, fireGoalAmount: Number(e.target.value) || 0 } : p))}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-white outline-none ring-emerald-500/30 focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200/45">
                Monthly investment
              </span>
              <input
                type="number"
                min={0}
                step={1000}
                value={profile.monthlyInvestment || ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, monthlyInvestment: Number(e.target.value) || 0 } : p))}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-white outline-none ring-emerald-500/30 focus:ring-2"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200/45">
                Risk profile
              </span>
              <select
                value={profile.riskProfile}
                onChange={(e) => setProfile((p) => (p ? { ...p, riskProfile: e.target.value as RiskProfile } : p))}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-semibold text-white outline-none ring-emerald-500/30 focus:ring-2"
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
              className="rounded-lg bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-2.5 text-sm font-black text-emerald-950 shadow-md shadow-emerald-500/25 transition hover:-translate-y-0.5 sm:px-6 sm:py-3 sm:text-[15px]"
            >
              Save profile
            </button>
            {savedMsg ? <span className="text-sm font-bold text-emerald-300">{savedMsg}</span> : null}
          </div>
        </div>
      </form>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl sm:p-5">
        <div className="flex items-center gap-2 text-emerald-200/85">
          <Shield size={17} className="shrink-0" strokeWidth={2.25} />
          <p className="text-[11px] font-black uppercase tracking-[0.15em] sm:text-xs">Security</p>
        </div>
        <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">
          Session is httpOnly cookie–backed. Profile deltas stay in encrypted transport; persistence is device-local until
          STEP 7 sync.
        </p>
      </div>

      <section>
        <h3 className="mb-3.5 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200/70 sm:mb-5 sm:text-xs">
          Live widgets
        </h3>
        <FireDashboardMetrics
          fireGoalAmount={profile.fireGoalAmount}
          fireGoalCurrency={profile.preferredCurrency}
          monthlyInvestmentTarget={profile.monthlyInvestment}
          refreshKey={dashKey}
        />
        <div className="mt-4 sm:mt-5">
          <EliteBloombergStrip />
        </div>
      </section>
    </div>
  );
}
