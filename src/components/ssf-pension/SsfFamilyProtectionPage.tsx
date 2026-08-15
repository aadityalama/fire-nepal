"use client";

import { Users } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { listActiveRulesForInstitution, PENSION_POLICY_CATALOG, todayIsoDate } from "@/lib/pension-policy";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { OfficialPortalActions } from "@/components/pension/OfficialPortalActions";

export function SsfFamilyProtectionPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const rules = listActiveRulesForInstitution(PENSION_POLICY_CATALOG, "ssf", todayIsoDate()).filter(
    (r) => r.ruleCategory === "family_protection",
  );
  const govFamily = listActiveRulesForInstitution(PENSION_POLICY_CATALOG, "government_pension", todayIsoDate()).filter(
    (r) => r.ruleCategory === "family_protection",
  );

  return (
    <PensionChrome
      title="Family Protection"
      subtitle="Dependent / family protection rules from the official policy layer. Nominee percentages and cash entitlements must be managed on official portals."
    >
      <OfficialPortalActions institution="ssf" light={light} />
      <section className={`wealth-glass p-4 sm:p-5 ${light ? "ring-1 ring-slate-900/[0.04]" : ""}`}>
        <div className="mb-3 flex items-center gap-2">
          <Users size={18} className="text-teal-600 dark:text-teal-300" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Official family protection notes</h2>
        </div>
        <ul className="flex flex-col gap-3">
          {[...rules, ...govFamily].map((rule) => (
            <li key={rule.id} className="rounded-xl border border-slate-200/80 px-3 py-3 dark:border-white/10">
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
        <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-zinc-500">
          Update nominees and dependent records only through the official SSF / EPF contributor portals — FireNepal does not
          store government portal credentials.
        </p>
      </section>
    </PensionChrome>
  );
}
