"use client";

import { BadgeCheck, CalendarDays, Mail, Phone, Settings, Shield, UserRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AvatarUploadZone } from "@/components/product/auth/AvatarUploadZone";
import { useFireMembership } from "@/contexts/FireMembershipContext";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import {
  deriveFireNepalId,
  formatPremiumPhoneDisplay,
  getPremiumProfileForUser,
  membershipExpiryIso,
  normalizePhoneNationalDigits,
  PHONE_DIAL_PRESETS,
  savePremiumProfileFull,
  validatePremiumPhone,
  type PremiumMemberProfileFields,
} from "@/lib/fire-premium-profile";
import { TIER_DISPLAY } from "@/lib/fire-membership";

export function FireMyProfilePage() {
  const { user } = useProductAuth();
  const { record, tier } = useFireMembership();
  const [profile, setProfile] = useState<PremiumMemberProfileFields | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

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
      setSavedMsg("Profile saved.");
      window.setTimeout(() => setSavedMsg(null), 2800);
    },
    [user, profile],
  );

  const membershipLabel = TIER_DISPLAY[tier].label;
  const membershipStatus = record.status === "none" ? "No active paid subscription" : record.status.replace(/_/g, " ");
  const membershipRenewal = useMemo(() => {
    if (record.currentPeriodEnd) return new Date(record.currentPeriodEnd).toLocaleDateString();
    if (user) return new Date(membershipExpiryIso(user)).toLocaleDateString();
    return null;
  }, [record.currentPeriodEnd, user]);

  if (!user || !profile) {
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

  const fieldClass =
    "w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-semibold text-white outline-none ring-emerald-500/30 placeholder:text-zinc-600 focus:ring-2";
  const labelClass = "mb-1.5 block text-[11px] font-black uppercase tracking-[0.13em] text-emerald-200/60 sm:text-xs";

  return (
    <div className="max-w-full space-y-6 overflow-x-clip pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:space-y-7 lg:pb-10">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300/75 sm:text-xs">
          Account
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">My Profile</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed tracking-tight text-emerald-100/65 sm:text-base">
          Manage your personal account information, membership status, and profile settings.
        </p>
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
              <p className="mt-2 text-lg font-black text-white">{membershipLabel}</p>
              <p className="mt-1 text-xs font-semibold capitalize text-zinc-400">{membershipStatus}</p>
              {membershipRenewal ? (
                <p className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-100/80">
                  <CalendarDays size={14} aria-hidden />
                  Renewal window: {membershipRenewal}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#04140f]/75 p-5 shadow-inner shadow-black/35 backdrop-blur-xl sm:p-6">
          <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200/75 sm:text-xs">
            Personal information
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
                              phoneNationalDigits: normalizePhoneNationalDigits(v.length < 2 ? "+" : v, p.phoneNationalDigits),
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
        </section>
      </form>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl sm:p-5">
        <div className="flex items-center gap-2 text-emerald-200/85">
          <Settings size={17} className="shrink-0" strokeWidth={2.25} />
          <h2 className="text-[11px] font-black uppercase tracking-[0.15em] sm:text-xs">Account settings</h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-black text-emerald-100 transition hover:bg-emerald-500/20"
          >
            <Settings size={15} aria-hidden />
            App settings
          </Link>
          <Link
            href="/dashboard/security"
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm font-black text-cyan-100 transition hover:bg-cyan-500/20"
          >
            <Shield size={15} aria-hidden />
            Security settings
          </Link>
        </div>
      </section>
    </div>
  );
}
