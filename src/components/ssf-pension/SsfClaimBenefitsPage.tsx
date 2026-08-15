"use client";

import { ShieldCheck } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { listActiveRulesForInstitution, PENSION_POLICY_CATALOG, todayIsoDate } from "@/lib/pension-policy";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { OfficialPortalActions } from "@/components/pension/OfficialPortalActions";

export function SsfClaimBenefitsPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const asOf = todayIsoDate();
  const benefits = listActiveRulesForInstitution(PENSION_POLICY_CATALOG, "ssf", asOf).filter((r) =>
    ["medical", "maternity", "accident_disability", "family_protection", "retirement_benefit"].includes(r.ruleCategory),
  );

  return (
    <PensionChrome
      title="Benefits Center"
      subtitle="SSF benefit categories from the official policy layer. Claim eligibility and amounts must be confirmed on the official SSF portal."
    >
      <OfficialPortalActions institution="ssf" light={light} />
      <div className="grid gap-3 sm:grid-cols-2">
        {benefits.map((b) => (
          <div
            key={b.id}
            className={`wealth-glass flex gap-3 p-4 sm:p-5 ${light ? "ring-1 ring-slate-900/[0.04]" : ""}`}
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/15 text-indigo-200">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900 dark:text-white">{b.title}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-zinc-400">{b.summary}</p>
              <span
                className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                  b.status === "active"
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-100"
                    : "border-amber-400/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
                }`}
              >
                {b.status === "active" ? "policy active" : "pending verification"}
              </span>
              {b.status === "pending_verification" ? (
                <p className="mt-2 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  Official policy information unavailable for verification.
                </p>
              ) : null}
              <a
                href={b.officialSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-[11px] font-black text-teal-700 dark:text-teal-300"
              >
                Official source ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </PensionChrome>
  );
}
