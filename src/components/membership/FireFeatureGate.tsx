"use client";

import { Crown, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";
import { useFireMembership } from "@/contexts/FireMembershipContext";
import { canAccessFeature, FEATURE_MIN_TIER, TIER_DISPLAY, type FireFeatureKey } from "@/lib/fire-membership";

type FireFeatureGateProps = {
  feature: FireFeatureKey;
  children: ReactNode;
  /** Optional smaller teaser when locked */
  title?: string;
  description?: string;
  /** Light surfaces (e.g. marketing / pension glass cards). */
  surface?: "dark" | "light";
};

export function FireFeatureGate({ feature, children, title, description, surface = "dark" }: FireFeatureGateProps) {
  const { record } = useFireMembership();
  const ok = canAccessFeature(record, feature);

  if (ok) return <>{children}</>;

  const min = FEATURE_MIN_TIER[feature];
  const minLabel = TIER_DISPLAY[min].label;
  const isElite = min === "elite";

  const shell =
    surface === "light"
      ? "border-emerald-200/80 bg-white/95 text-emerald-950 shadow-[0_16px_40px_rgba(0,63,47,0.12)]"
      : "border-white/10 bg-[#04140f]/80 text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)]";

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-6 backdrop-blur-xl ${shell}`}>
      {surface === "dark" ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(16,185,129,0.12),transparent_55%)]" />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(16,185,129,0.08),transparent_55%)]" />
      )}
      <div className={`relative flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left ${surface === "light" ? "text-emerald-950" : ""}`}>
        <div
          className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${
            isElite ? "from-amber-500/30 to-yellow-200/20 text-amber-100" : "from-emerald-500/35 to-lime-400/25 text-emerald-100"
          } ring-1 ring-white/10`}
        >
          {isElite ? <Crown size={28} strokeWidth={2} /> : <Lock size={26} strokeWidth={2.2} />}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] sm:justify-start ${
              surface === "light" ? "text-emerald-700/80" : "text-emerald-300/60"
            }`}
          >
            <Sparkles size={12} className={surface === "light" ? "text-emerald-600" : "text-emerald-400/80"} aria-hidden />
            {minLabel} feature
          </p>
          <h3 className={`mt-1 text-lg font-black ${surface === "light" ? "text-emerald-950" : "text-white"}`}>
            {title ?? "Upgrade to unlock"}
          </h3>
          <p className={`mt-2 text-sm leading-relaxed ${surface === "light" ? "text-slate-600" : "text-zinc-400"}`}>
            {description ??
              `This capability is included with ${minLabel}. Choose a plan on the membership page to enable it — billing connects when Stripe goes live.`}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Link
              href="/dashboard/membership"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-2.5 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-900/30 transition hover:-translate-y-0.5"
            >
              View plans
            </Link>
            <Link
              href="/signup"
              className={`inline-flex min-h-[44px] items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                surface === "light"
                  ? "border-emerald-200 text-emerald-900 hover:bg-emerald-50"
                  : "border-white/15 text-emerald-100/90 hover:bg-white/5"
              }`}
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
