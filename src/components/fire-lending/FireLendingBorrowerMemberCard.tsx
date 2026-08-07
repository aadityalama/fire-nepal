"use client";

import { BadgeCheck, Lock, MapPin, Shield, UserPlus } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import type { BorrowerMemberProfile } from "@/lib/fire-lending/borrower-member";
import { LendingAvatar, LendingStatusPill } from "@/components/fire-lending/FireLendingUiPrimitives";

function formatMemberSince(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function riskTone(level: BorrowerMemberProfile["riskLevel"], light: boolean): string {
  if (level === "Low") return light ? "bg-emerald-100 text-emerald-800" : "bg-emerald-500/20 text-lime-200";
  if (level === "Medium") return light ? "bg-amber-100 text-amber-800" : "bg-amber-500/20 text-amber-100";
  if (level === "High") return light ? "bg-orange-100 text-orange-800" : "bg-orange-500/20 text-orange-100";
  return light ? "bg-rose-100 text-rose-800" : "bg-rose-500/20 text-rose-200";
}

export function FireLendingBorrowerMemberCard({
  member,
  connected,
  onConnect,
}: {
  member: BorrowerMemberProfile;
  connected?: boolean;
  onConnect?: () => void;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <div
      className={`animate-fade-up overflow-hidden rounded-[1.35rem] border p-4 sm:rounded-[1.5rem] sm:p-5 ${
        connected
          ? light
            ? "border-emerald-400 bg-gradient-to-br from-emerald-50 via-white to-lime-50 shadow-[0_16px_48px_-24px_rgba(16,185,129,0.35)]"
            : "border-emerald-400/50 bg-gradient-to-br from-emerald-950/70 via-emerald-900/40 to-lime-950/30 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]"
          : light
            ? "border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/50 to-lime-50/40 shadow-[0_16px_48px_-24px_rgba(15,23,42,0.14)]"
            : "border-emerald-400/20 bg-gradient-to-br from-emerald-950/55 via-black/30 to-emerald-950/40"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative mx-auto shrink-0 sm:mx-0">
          {member.avatarUrl ? (
            // Avatar may be a data URL or Supabase storage URL.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatarUrl}
              alt={member.fullName}
              width={88}
              height={88}
              className="h-[88px] w-[88px] rounded-2xl object-cover ring-2 ring-emerald-400/40"
            />
          ) : (
            <LendingAvatar name={member.fullName} size={88} />
          )}
          {member.verified ? (
            <span
              className={`absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full ${
                light ? "bg-emerald-500 text-white" : "bg-lime-400 text-emerald-950"
              }`}
              title="Verified FIRE Nepal member"
            >
              <BadgeCheck size={16} strokeWidth={2.5} />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h3 className={`text-lg font-black tracking-tight sm:text-xl ${light ? "text-slate-900" : "text-white"}`}>
              {member.fullName}
            </h3>
            {member.verified ? <LendingStatusPill status="verified" /> : <LendingStatusPill status="unverified" />}
          </div>
          <p className={`mt-1 font-mono text-sm font-bold tabular-nums ${light ? "text-emerald-700" : "text-lime-300"}`}>
            {member.fireNepalId}
          </p>
          <p className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold ${light ? "text-slate-600" : "text-emerald-200/70"}`}>
            <MapPin size={13} />
            {member.country}
            <span aria-hidden>·</span>
            Member since {formatMemberSince(member.memberSince)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Trust Score" value={`${member.trustScore}`} hint={member.trustLabel} light={light} />
        <Stat label="Active Loans" value={`${member.activeLoans}`} light={light} />
        <Stat label="On-time" value={`${member.onTimeRepaymentPct}%`} light={light} />
        <div
          className={`rounded-xl border px-2.5 py-2.5 text-center ${
            light ? "border-emerald-100 bg-white/80" : "border-emerald-400/15 bg-black/25"
          }`}
        >
          <p className={`text-[9px] font-black uppercase tracking-[0.12em] ${light ? "text-slate-500" : "text-emerald-200/55"}`}>
            Risk Level
          </p>
          <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-black ${riskTone(member.riskLevel, light)}`}>
            {member.riskLevel}
          </p>
        </div>
      </div>

      {connected ? (
        <div
          className={`mt-4 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-base font-black ${
            light
              ? "border-emerald-400 bg-emerald-100 text-emerald-900"
              : "border-emerald-400/40 bg-emerald-500/20 text-lime-200"
          }`}
          role="status"
        >
          <Lock size={18} />
          Borrower Connected
        </div>
      ) : onConnect ? (
        <button
          type="button"
          onClick={onConnect}
          className="mt-4 inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-3.5 text-base font-black text-emerald-950 shadow-lg shadow-emerald-500/25 transition hover:brightness-105 active:scale-[0.99]"
        >
          <UserPlus size={20} />
          Connect Borrower
        </button>
      ) : null}

      <p className={`mt-3 flex items-center justify-center gap-1.5 text-[10px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/50"}`}>
        <Shield size={12} />
        Profile from public.user_profiles · FIRE Nepal peer lending
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  light,
}: {
  label: string;
  value: string;
  hint?: string;
  light: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-2.5 py-2.5 text-center ${
        light ? "border-emerald-100 bg-white/80" : "border-emerald-400/15 bg-black/25"
      }`}
    >
      <p className={`text-[9px] font-black uppercase tracking-[0.12em] ${light ? "text-slate-500" : "text-emerald-200/55"}`}>
        {label}
      </p>
      <p className={`mt-1 text-base font-black tabular-nums ${light ? "text-slate-900" : "text-white"}`}>{value}</p>
      {hint ? (
        <p className={`text-[10px] font-bold ${light ? "text-emerald-700" : "text-lime-300/80"}`}>{hint}</p>
      ) : null}
    </div>
  );
}
