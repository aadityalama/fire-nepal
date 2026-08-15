"use client";

import { useFireTheme } from "@/contexts/FireThemeContext";
import { listActiveRulesForInstitution, PENSION_POLICY_CATALOG, todayIsoDate } from "@/lib/pension-policy";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { OfficialPortalActions } from "@/components/pension/OfficialPortalActions";

export function WithdrawalPlannerPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const asOf = todayIsoDate();
  const rules = ["ssf", "epf", "cit", "government_pension"] as const;
  const withdrawals = rules.flatMap((institution) =>
    listActiveRulesForInstitution(PENSION_POLICY_CATALOG, institution, asOf).filter(
      (r) => r.ruleCategory === "withdrawal" || r.ruleCategory === "loan",
    ),
  );

  return (
    <PensionChrome
      title="Withdrawal Planner"
      subtitle="Official withdrawal / loan policy notes only. Numeric limits appear after verification — never invented."
    >
      <OfficialPortalActions institution="epf" light={light} />
      <section className={`wealth-glass p-4 sm:p-5 ${light ? "ring-1 ring-slate-900/[0.04]" : ""}`}>
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Policy notes</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {withdrawals.map((rule) => (
            <li
              key={rule.id}
              className="rounded-xl border border-slate-200/80 px-3 py-3 dark:border-white/10"
            >
              <p className="text-sm font-black text-slate-900 dark:text-white">{rule.title}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-zinc-400">{rule.summary}</p>
              {rule.status === "pending_verification" ? (
                <p className="mt-2 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  Official policy information unavailable for verification.
                </p>
              ) : null}
              <a
                href={rule.officialSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-[11px] font-black text-teal-700 dark:text-teal-300"
              >
                Official source ↗
              </a>
            </li>
          ))}
        </ul>
      </section>
    </PensionChrome>
  );
}
