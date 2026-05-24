"use client";

import { BadgeCheck, Check, Crown, Gem, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useFireMembership } from "@/contexts/FireMembershipContext";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import {
  BILLING_PIPELINE,
  STRIPE_PRICE_PLACEHOLDERS,
  TIER_CATALOG,
  TIER_DISPLAY,
  USAGE_LIMITS,
  type FireMembershipTier,
} from "@/lib/fire-membership";
import {
  deriveFireNepalId,
  membershipActiveIso,
  membershipExpiryIso,
} from "@/lib/fire-premium-profile";

type CompareCell = boolean | "limited";

const COMPARE_ROWS: { key: string; free: CompareCell; premium: CompareCell; elite: CompareCell; label: string }[] = [
  { key: "dash", label: "Advanced FIRE dashboard", free: false, premium: true, elite: true },
  { key: "calc", label: "FIRE calculator (full)", free: true, premium: true, elite: true },
  { key: "ocr", label: "OCR payslip import", free: false, premium: true, elite: true },
  { key: "coach", label: "AI financial coach", free: false, premium: true, elite: true },
  { key: "aipage", label: "AI coach dashboard (/ai-coach)", free: "limited", premium: true, elite: true },
  { key: "intel", label: "AI wealth intelligence", free: "limited", premium: true, elite: true },
  { key: "cagr", label: "CAGR & advanced analytics", free: false, premium: true, elite: true },
  { key: "mc", label: "Multi-currency intelligence", free: false, premium: true, elite: true },
  { key: "sim", label: "Advanced simulations", free: false, premium: true, elite: true },
  { key: "sync", label: "Cloud sync", free: false, premium: true, elite: true },
  { key: "pdf", label: "PDF reports", free: false, premium: true, elite: true },
  { key: "bbg", label: "Bloomberg-style terminal layer", free: false, premium: false, elite: true },
  { key: "ailab", label: "AI scenario lab & forecasting", free: false, premium: false, elite: true },
  { key: "stress", label: "Retirement stress testing", free: false, premium: false, elite: true },
  { key: "family", label: "Family wealth dashboard", free: false, premium: false, elite: true },
  { key: "auto", label: "Advanced automation", free: false, premium: false, elite: true },
  { key: "support", label: "Priority support", free: false, premium: false, elite: true },
];

function CellIcon({ on }: { on: CompareCell }) {
  if (on === "limited")
    return (
      <span className="text-[10px] font-black uppercase text-amber-200/90" title="Limited on Free">
        Limited
      </span>
    );
  if (on) return <Check className="mx-auto text-emerald-400" size={18} strokeWidth={3} aria-label="Included" />;
  return <span className="text-zinc-600">—</span>;
}

export function FireMembershipPage() {
  const { user } = useProductAuth();
  const { tier, record, setTierDemo } = useFireMembership();
  const [confirmDowngrade, setConfirmDowngrade] = useState<FireMembershipTier | null>(null);

  const onSelectTier = useCallback(
    (next: FireMembershipTier) => {
      if (next === "free" && tier !== "free") {
        setConfirmDowngrade(next);
        return;
      }
      setTierDemo(next);
      setConfirmDowngrade(null);
    },
    [tier, setTierDemo],
  );

  const fnId = user ? deriveFireNepalId(user) : "—";
  const active = user ? membershipActiveIso(user) : "";
  const expiry = user ? membershipExpiryIso(user) : "";
  const verified = user?.emailVerified === true;

  const renewalLabel = useMemo(() => {
    if (tier === "free") return "Upgrade to start a paid period.";
    if (record.currentPeriodEnd) return new Date(record.currentPeriodEnd).toLocaleDateString();
    return new Date(expiry).toLocaleDateString();
  }, [tier, record.currentPeriodEnd, expiry]);

  const limits = USAGE_LIMITS[tier];
  const aiLimit = limits.aiCoachQueries;
  const ocrLimit = limits.ocrImports;
  const aiLabel = Number.isFinite(aiLimit)
    ? `${record.aiCoachQueries} / ${aiLimit}`
    : "Unlimited";
  const ocrLabel = Number.isFinite(ocrLimit) ? `${record.ocrImports} / ${ocrLimit}` : "Unlimited";

  if (!user) {
    return <div className="py-20 text-center text-zinc-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-28 lg:pb-12">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">Membership</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-emerald-100/55">
          Scalable SaaS tiers — Free, Premium, Elite. Demo switches your plan locally; Stripe checkout will replace these
          buttons in production.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.12] via-[#04140f]/95 to-[#020807] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-8">
        <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/60">Current plan</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black text-white shadow-lg ring-1 ring-white/10 bg-gradient-to-r ${TIER_DISPLAY[tier].accent}`}
              >
                {tier === "elite" ? <Crown size={18} className="text-amber-200" /> : null}
                {tier === "premium" ? <Gem size={18} className="text-emerald-100" /> : null}
                {tier === "free" ? <Sparkles size={18} className="text-zinc-200" /> : null}
                {TIER_DISPLAY[tier].label}
              </span>
              {verified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-200">
                  <BadgeCheck size={14} />
                  Verified
                </span>
              ) : null}
              {tier === "premium" ? (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-100">
                  Premium badge
                </span>
              ) : null}
              {tier === "elite" ? (
                <span className="rounded-full border border-amber-400/35 bg-amber-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-amber-100">
                  Elite badge
                </span>
              ) : null}
            </div>
            <p className="mt-4 font-mono text-lg font-black text-emerald-100/90 sm:text-xl">{fnId}</p>
            <p className="mt-1 text-xs text-zinc-500">FIRE Nepal member ID · stable for this account</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
            <Link
              href="/portfolio"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:bg-white/5"
            >
              Open wealth dashboard
            </Link>
            <Link
              href="/dashboard/profile"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-3 text-sm font-black text-emerald-950 shadow-lg transition hover:-translate-y-0.5"
            >
              Profile workspace
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase text-zinc-500">Renewal / period end</p>
          <p className="mt-2 text-lg font-bold text-white">{renewalLabel}</p>
          <p className="mt-1 text-xs text-zinc-500">Mirrors Stripe `current_period_end` when billing is on.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase text-zinc-500">AI coach quota (mo)</p>
          <p className="mt-2 text-lg font-bold text-emerald-200">{aiLabel}</p>
          <p className="mt-1 text-xs text-zinc-500">Usage counters reset monthly (local demo).</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase text-zinc-500">OCR imports (mo)</p>
          <p className="mt-2 text-lg font-bold text-emerald-200">{ocrLabel}</p>
          <p className="mt-1 text-xs text-zinc-500">Premium+ unlocks OCR payslip pipeline.</p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-emerald-300/70">Choose your tier</h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {(["free", "premium", "elite"] as const).map((t, i) => {
            const cat = TIER_CATALOG[t];
            const activeCard = tier === t;
            const delay = i * 80;
            return (
              <div
                key={t}
                style={{ animationDelay: `${delay}ms` }}
                className={`animate-fade-up relative flex flex-col rounded-[1.5rem] border p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:-translate-y-1 ${
                  activeCard
                    ? "border-emerald-400/50 bg-gradient-to-b from-emerald-500/15 to-[#04140f]/95 ring-1 ring-emerald-400/30"
                    : "border-white/10 bg-[#061912]/90 hover:border-emerald-500/25"
                }`}
              >
                {t === "elite" ? (
                  <div className="absolute -top-3 right-4 rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-100">
                    Top tier
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  {t === "elite" ? <Crown className="text-amber-300" size={22} /> : null}
                  {t === "premium" ? <Gem className="text-emerald-300" size={22} /> : null}
                  {t === "free" ? <Sparkles className="text-zinc-400" size={22} /> : null}
                  <h3 className="text-xl font-black text-white">{TIER_DISPLAY[t].label}</h3>
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-400">{cat.tagline}</p>
                <p className="mt-4 text-2xl font-black text-white">{cat.priceLabel}</p>
                <ul className="mt-5 flex-1 space-y-2.5 text-sm text-emerald-100/80">
                  {cat.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <Check className="mt-0.5 shrink-0 text-emerald-400" size={16} strokeWidth={3} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onSelectTier(t)}
                  className={`mt-8 w-full rounded-xl py-3.5 text-sm font-black transition ${
                    activeCard
                      ? "border border-emerald-400/40 bg-emerald-500/20 text-emerald-50"
                      : "bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950 shadow-lg hover:brightness-110"
                  }`}
                >
                  {activeCard ? "Current plan" : t === "free" ? "Use Free" : `Select ${TIER_DISPLAY[t].label}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {confirmDowngrade ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur-xl">
          <p className="text-sm font-bold text-amber-50">Switch to Free? Premium surfaces (OCR, AI coach, advanced analytics) will lock until you upgrade again.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setTierDemo("free");
                setConfirmDowngrade(null);
              }}
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-amber-950"
            >
              Confirm Free
            </button>
            <button
              type="button"
              onClick={() => setConfirmDowngrade(null)}
              className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-[1.5rem] border border-white/10 bg-[#04140f]/80 p-6 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-emerald-300/70">Feature comparison</h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-zinc-400">
            <Zap size={12} className="text-lime-300" aria-hidden />
            Stripe prices: {STRIPE_PRICE_PLACEHOLDERS.premium.lookupKey} / {STRIPE_PRICE_PLACEHOLDERS.elite.lookupKey}
          </span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                <th className="pb-3 pr-4">Capability</th>
                <th className="pb-3 pr-4 text-center">Free</th>
                <th className="pb-3 pr-4 text-center">Premium</th>
                <th className="pb-3 text-center">Elite</th>
              </tr>
            </thead>
            <tbody className="text-zinc-200">
              {COMPARE_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-white/5">
                  <td className="py-3 pr-4 font-semibold text-white">{row.label}</td>
                  <td className="py-3 pr-4 text-center">
                    <CellIcon on={row.free} />
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <CellIcon on={row.premium} />
                  </td>
                  <td className="py-3 text-center">
                    <CellIcon on={row.elite} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <h3 className="text-sm font-black uppercase tracking-[0.12em] text-emerald-300/70">Account dates</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Joined</dt>
              <dd className="font-bold text-white">{new Date(user.createdAt).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Membership active since</dt>
              <dd className="font-bold text-white">{new Date(active).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Legacy annual window</dt>
              <dd className="font-bold text-amber-200/90">{new Date(expiry).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-6 backdrop-blur-xl">
          <h3 className="text-sm font-black uppercase tracking-[0.12em] text-emerald-300/70">Billing-ready pipeline</h3>
          <ol className="mt-4 list-decimal space-y-2 pl-4 text-sm text-zinc-300">
            {BILLING_PIPELINE.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </div>

      <p className="text-center text-xs text-zinc-600">
        Demo: plan stored in <code className="rounded bg-white/5 px-1.5 py-0.5 text-emerald-200/80">localStorage</code> per
        user. Production will validate tier server-side after Stripe webhooks.
      </p>
    </div>
  );
}
