"use client";

import Link from "next/link";
import { Crown, Sparkles, Zap } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import type { FireAiQuotaSnapshot } from "@/lib/fire-nepal-ai/types";

type FireAiQuotaUpgradeCardProps = {
  quota: FireAiQuotaSnapshot;
};

function formatReset(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "soon";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function FireAiQuotaUpgradeCard({ quota }: FireAiQuotaUpgradeCardProps) {
  const light = useFireTheme().resolvedTheme === "light";
  const planLabel = quota.plan.charAt(0).toUpperCase() + quota.plan.slice(1);
  const scopeLabel = quota.scope === "day" ? "daily" : "monthly";

  return (
    <div
      className={`mx-auto mt-4 max-w-2xl rounded-3xl border p-4 shadow-xl ${
        light
          ? "border-emerald-200 bg-white text-slate-900 shadow-emerald-900/5"
          : "border-emerald-400/20 bg-emerald-950/60 text-white shadow-black/30"
      }`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
            light ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          <Zap size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">AI quota reached</p>
          <p className={`mt-1 text-xs font-semibold leading-relaxed ${light ? "text-slate-500" : "text-emerald-200/65"}`}>
            Your {planLabel} plan has used {quota.used}/{quota.limit} {scopeLabel} AI messages. Remaining quota:{" "}
            {quota.remaining}. Resets {formatReset(quota.resetAt)}.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className={`rounded-2xl border p-3 ${light ? "border-emerald-100 bg-emerald-50/70" : "border-emerald-400/15 bg-black/15"}`}>
          <div className="flex items-center gap-2 text-sm font-black">
            <Sparkles size={16} className="text-emerald-500" />
            Premium
          </div>
          <p className={`mt-1 text-xs font-semibold ${light ? "text-slate-600" : "text-emerald-200/70"}`}>
            500 AI messages/month, markdown chat, history, and priority FIRE guidance.
          </p>
        </div>
        <div className={`rounded-2xl border p-3 ${light ? "border-amber-200 bg-amber-50/70" : "border-amber-400/20 bg-amber-950/20"}`}>
          <div className="flex items-center gap-2 text-sm font-black">
            <Crown size={16} className="text-amber-500" />
            Elite
          </div>
          <p className={`mt-1 text-xs font-semibold ${light ? "text-slate-600" : "text-amber-100/75"}`}>
            2000 AI messages/month fair use for power users, families, and business owners.
          </p>
        </div>
      </div>

      <Link
        href="/dashboard/membership"
        className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl bg-emerald-700 px-4 text-sm font-black text-white transition hover:bg-emerald-600 active:scale-[0.99]"
      >
        Upgrade membership
      </Link>
    </div>
  );
}
