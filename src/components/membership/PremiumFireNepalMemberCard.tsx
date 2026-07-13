"use client";

import { BadgeCheck, Crown, Flame, Gem, Globe2, Headphones, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { forwardRef, useEffect, useState } from "react";
import { FIRE_NEPAL_CANONICAL_ORIGIN } from "@/lib/brand/site-seo";
import type { FireMembershipTier } from "@/lib/fire-membership";
import {
  computeMemberCardStatus,
  currencyDisplay,
  formatMemberCardDate,
  membershipDaysRemaining,
  tierBadgeLabel,
  tierDisplayName,
  type MemberCardData,
} from "@/lib/member-card-profile";

export const MEMBER_CARD_EXPORT_WIDTH = 1400;
export const MEMBER_CARD_EXPORT_HEIGHT = 900;

const BENEFITS = [
  "Budget smarter",
  "Track wealth",
  "FIRE Planning",
  "AI Financial Coach",
  "Secure & Verified",
  "Built for Nepalis Worldwide",
] as const;

const NEPALI_SLOGAN = ["आजै योजना बनाऔं,", "आर्थिक स्वतन्त्रता हासिल गरौं।"];

type PremiumFireNepalMemberCardProps = {
  data: MemberCardData;
  /** export = fixed 1400×900 for PNG/PDF capture */
  mode?: "preview" | "export";
};

function tierAccent(plan: FireMembershipTier) {
  if (plan === "elite") {
    return {
      badge: "from-amber-400/90 via-yellow-300/80 to-amber-500/90 text-amber-950 border-amber-200/70",
      glow: "shadow-[0_0_40px_rgba(245,158,11,0.35)]",
      icon: Crown,
    };
  }
  if (plan === "premium") {
    return {
      badge: "from-emerald-400/90 via-lime-300/70 to-emerald-500/90 text-emerald-950 border-emerald-200/60",
      glow: "shadow-[0_0_36px_rgba(16,185,129,0.32)]",
      icon: Gem,
    };
  }
  return {
    badge: "from-zinc-300/80 via-zinc-200/70 to-zinc-400/80 text-zinc-900 border-zinc-300/60",
    glow: "shadow-[0_0_28px_rgba(161,161,170,0.25)]",
    icon: Sparkles,
  };
}

function statusPanel(
  status: ReturnType<typeof computeMemberCardStatus>,
  expiry: string | null,
  plan: FireMembershipTier,
) {
  if (plan === "free") {
    return {
      label: "Membership status",
      value: "FREE PLAN",
      sub: "Upgrade for premium benefits",
      action: null,
      className: "border-zinc-400/35 bg-zinc-500/10 text-zinc-100",
      valueClass: "text-white",
    };
  }
  if (status === "expired") {
    return {
      label: "Status",
      value: "EXPIRED",
      sub: "Membership Expired",
      action: "Renew Membership",
      className: "border-red-400/50 bg-red-500/15 text-red-50",
      valueClass: "text-red-100",
    };
  }
  const days = membershipDaysRemaining(expiry);
  if (status === "expiring_soon") {
    return {
      label: "Membership countdown",
      value: `${days} Days Remaining`,
      sub: `Renews on ${formatMemberCardDate(expiry)}`,
      action: null,
      className: "border-amber-400/45 bg-amber-500/12 text-amber-50",
      valueClass: "text-amber-50",
    };
  }
  return {
    label: "Membership countdown",
    value: `${days} Days Remaining`,
    sub: `Renews on ${formatMemberCardDate(expiry)}`,
    action: null,
    className: "border-emerald-400/40 bg-emerald-500/12 text-emerald-50",
    valueClass: "text-white",
  };
}

function MemberCardMountains() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1400 420" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="mc-sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#031612" />
          <stop offset="45%" stopColor="#06281f" />
          <stop offset="100%" stopColor="#010807" />
        </linearGradient>
        <linearGradient id="mc-mtn" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#145f4b" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#02120e" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id="mc-glow" cx="72%" cy="38%" r="28%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1400" height="420" fill="url(#mc-sky)" />
      <rect width="1400" height="420" fill="url(#mc-glow)" />
      <path
        d="M0 320 L120 250 L220 290 L340 180 L470 260 L590 150 L720 240 L860 120 L1020 220 L1180 160 L1400 280 L1400 420 L0 420 Z"
        fill="url(#mc-mtn)"
        opacity="0.9"
      />
      <path
        d="M0 360 L180 300 L300 340 L460 250 L640 330 L820 240 L980 310 L1160 260 L1400 340 L1400 420 L0 420 Z"
        fill="#031612"
        opacity="0.85"
      />
      <path
        d="M860 95 C900 70 940 72 980 95 C1010 112 1035 145 1045 180 C1020 165 990 158 960 165 C920 175 885 165 860 145 Z"
        fill="none"
        stroke="#34d399"
        strokeWidth="3"
        opacity="0.75"
      />
    </svg>
  );
}

function MemberCardTempleSilhouette() {
  return (
    <svg className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 w-full opacity-35" viewBox="0 0 1400 120" aria-hidden>
      <path
        d="M0 120 L0 78 L40 78 L55 52 L70 78 L110 78 L125 44 L140 78 L180 78 L200 36 L220 78 L260 78 L280 48 L300 78 L340 78 L360 40 L380 78 L420 78 L440 56 L460 78 L500 78 L520 34 L540 78 L580 78 L600 50 L620 78 L660 78 L680 38 L700 78 L740 78 L760 54 L780 78 L820 78 L840 30 L860 78 L900 78 L920 52 L940 78 L980 78 L1000 42 L1020 78 L1060 78 L1080 58 L1100 78 L1140 78 L1160 36 L1180 78 L1220 78 L1240 50 L1260 78 L1300 78 L1320 46 L1340 78 L1400 78 L1400 120 Z"
        fill="#d4af37"
        opacity="0.55"
      />
    </svg>
  );
}

function MemberCardEmblem() {
  return (
    <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.35)_0%,rgba(5,5,5,0)_70%)] blur-md" />
      <div className="relative grid h-40 w-40 place-items-center rounded-full border border-amber-300/35 bg-[radial-gradient(circle_at_30%_20%,rgba(52,211,153,0.35),rgba(5,5,5,0.92)_68%)] shadow-[0_0_50px_rgba(16,185,129,0.28)]">
        <div className="absolute inset-3 rounded-full border border-emerald-300/20" />
        <Flame className="h-16 w-16 text-emerald-300 drop-shadow-[0_0_18px_rgba(52,211,153,0.8)]" fill="currentColor" />
        <p className="absolute -top-1 text-[10px] font-black uppercase tracking-[0.28em] text-amber-200/90">Financial Freedom</p>
        <p className="absolute -bottom-1 text-[10px] font-black uppercase tracking-[0.28em] text-amber-200/90">Better Life</p>
      </div>
    </div>
  );
}

export const PremiumFireNepalMemberCard = forwardRef<HTMLDivElement, PremiumFireNepalMemberCardProps>(
  function PremiumFireNepalMemberCard({ data, mode = "preview" }, ref) {
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const status = computeMemberCardStatus(data.membershipExpiry, data.membershipPlan);
    const panel = statusPanel(status, data.membershipExpiry, data.membershipPlan);
    const accent = tierAccent(data.membershipPlan);
    const TierIcon = accent.icon;
    const verifyUrl = `${FIRE_NEPAL_CANONICAL_ORIGIN}/verify/${encodeURIComponent(data.fireNepalId)}`;

    useEffect(() => {
      let cancelled = false;
      void (async () => {
        if (!data.fireNepalId) return;
        try {
          const QRCode = (await import("qrcode")).default;
          const url = await QRCode.toDataURL(verifyUrl, {
            width: 220,
            margin: 1,
            color: { dark: "#064e3b", light: "#ffffff" },
          });
          if (!cancelled) setQrDataUrl(url);
        } catch {
          if (!cancelled) setQrDataUrl(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [data.fireNepalId, verifyUrl]);

    const isExport = mode === "export";
    const shellClass = isExport
      ? "w-[1400px] min-w-[1400px] max-w-[1400px]"
      : "w-full max-w-full";

    return (
      <div
        ref={ref}
        data-member-card-root="true"
        className={`${shellClass} overflow-hidden rounded-[28px] border-2 border-amber-300/70 bg-[#050505] text-white shadow-[0_30px_90px_rgba(0,0,0,0.55)]`}
        style={isExport ? { width: MEMBER_CARD_EXPORT_WIDTH, height: MEMBER_CARD_EXPORT_HEIGHT } : undefined}
      >
        <div className="relative h-[420px] overflow-hidden border-b border-emerald-500/15">
          <MemberCardMountains />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,rgba(5,5,5,0.05),rgba(5,5,5,0.55))]" />

          <div className="relative z-10 flex h-full flex-col px-8 pb-6 pt-7 sm:px-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" className="h-12 w-12 rounded-2xl shadow-[0_0_24px_rgba(16,185,129,0.35)]" />
                <div>
                  <p className="text-2xl font-black tracking-[0.08em] text-white">FIRE NEPAL</p>
                  <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-amber-200/85">Financial Independence</p>
                </div>
              </div>
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.14em] bg-gradient-to-r ${accent.badge} ${accent.glow}`}
              >
                <TierIcon size={16} strokeWidth={2.5} />
                {tierBadgeLabel(data.membershipPlan)}
              </div>
            </div>

            <div className="mt-6 grid flex-1 grid-cols-[auto_1fr_auto] items-center gap-8">
              <div className="relative">
                <div className="relative h-36 w-36 overflow-hidden rounded-full border-[3px] border-amber-300/75 bg-emerald-900/30 shadow-[0_0_40px_rgba(245,158,11,0.22)]">
                  {data.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-emerald-600 to-emerald-900 text-3xl font-black text-emerald-50">
                      {data.fullName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-1 right-2 grid h-9 w-9 place-items-center rounded-full border border-emerald-300/50 bg-emerald-500 text-emerald-950 shadow-lg">
                  <BadgeCheck size={18} strokeWidth={2.8} />
                </span>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100">
                  <ShieldCheck size={12} />
                  Verified Member
                </p>
              </div>

              <div className="min-w-0 space-y-4">
                <h2 className="truncate text-4xl font-black uppercase tracking-[0.04em] text-white">{data.fullName}</h2>
                <div className="inline-flex min-w-[280px] flex-col rounded-2xl border border-emerald-400/25 bg-black/35 px-4 py-3 backdrop-blur-md">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300/80">FIRE Nepal ID</p>
                  <p className="mt-1 font-mono text-xl font-black tracking-wide text-white">{data.fireNepalId}</p>
                </div>
                <div className={`inline-flex min-w-[320px] flex-col rounded-2xl border px-4 py-3 backdrop-blur-md ${panel.className}`}>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-85">{panel.label}</p>
                  <p className={`mt-1 text-3xl font-black tracking-tight ${panel.valueClass}`}>{panel.value}</p>
                  <p className="mt-1 text-sm font-semibold opacity-90">{panel.sub}</p>
                  {panel.action ? (
                    <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-red-200">{panel.action}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col items-center">
                {qrDataUrl ? (
                  <div className="rounded-2xl border border-white/15 bg-white p-2 shadow-[0_0_30px_rgba(16,185,129,0.18)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="" className="h-[132px] w-[132px]" />
                  </div>
                ) : (
                  <div className="grid h-[148px] w-[148px] place-items-center rounded-2xl border border-white/10 bg-white/5 text-xs font-semibold text-zinc-400">
                    QR loading
                  </div>
                )}
                <p className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/80">Scan to verify</p>
                <p className="mt-1 max-w-[160px] text-center text-[10px] font-semibold leading-snug text-zinc-400">
                  Verify this membership at firenepal.com/verify
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative grid min-h-[480px] grid-cols-[1.05fr_0.9fr_1.05fr] gap-6 px-8 py-7">
          <MemberCardTempleSilhouette />

          <div className="relative z-10 space-y-3">
            <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300/85">
              <BadgeCheck size={14} />
              Member Details
            </p>
            <div className="space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md">
              {[
                ["Member Since", formatMemberCardDate(data.membershipStart)],
                ["Expiry Date", formatMemberCardDate(data.membershipExpiry)],
                ["Country of Work", data.countryOfWork ?? ""],
                ["Preferred Currency", currencyDisplay(data.preferredCurrency)],
                ["Membership Tier", tierDisplayName(data.membershipPlan)],
                ["Phone Number", data.phone ?? ""],
                ["Email", data.email ?? ""],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">{label}</span>
                  <span className="max-w-[58%] break-words text-right text-sm font-black text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center">
            <MemberCardEmblem />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-4 backdrop-blur-md">
              <p className="font-nepali text-lg font-black leading-relaxed text-emerald-100">
                {NEPALI_SLOGAN[0]}
                <span className="block text-emerald-300">{NEPALI_SLOGAN[1]}</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300/80">Benefits</p>
              <ul className="mt-3 space-y-2">
                {BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-sm font-semibold text-emerald-50/90">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm font-semibold italic text-amber-200/85">Thank you for being a part of our mission.</p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-t border-white/10 bg-black/50 px-8 py-4 text-xs font-bold text-emerald-100/80">
          <p className="inline-flex items-center gap-2">
            <Globe2 size={14} />
            www.firenepal.com
          </p>
          <p className="inline-flex items-center gap-2 text-center text-emerald-50">
            <Lock size={14} />
            Secure. Private. Trusted.
          </p>
          <p className="inline-flex items-center justify-end gap-2 text-right">
            <Headphones size={14} />
            firenepal853@gmail.com
          </p>
        </div>
      </div>
    );
  },
);
