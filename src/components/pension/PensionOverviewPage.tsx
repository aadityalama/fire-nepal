"use client";

import { Building2, Landmark, LineChart, Scale, Shield, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { PENSION_BASE } from "@/lib/pension/nav";
import { PensionChrome } from "@/components/pension/PensionChrome";
import {
  PensionActionLink,
  PensionBody,
  PensionGlassPanel,
  PensionHeading,
  PensionProviderCard,
  PensionSectionLabel,
} from "@/components/pension/PensionUi";
import { formatMoney } from "@/lib/expense-utils";

export function PensionOverviewPage() {
  const { totals, fireScore, hydrated } = useWealthPortfolio();

  return (
    <PensionChrome
      title="Pension Overview"
      subtitle="Nepal Official Policy-Driven Pension & Retirement Planning Center — SSF, EPF, CIT, and Government Pension with verified portals only."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        <PensionProviderCard
          title="SSF Center"
          body="Social Security Fund schemes, contributions, and official SOSYS login / pay links."
          href={`${PENSION_BASE}/ssf`}
          cta="Open SSF desk →"
          icon={Shield}
          accent="teal"
          badge="SSF"
        />
        <PensionProviderCard
          title="EPF Center"
          body="Provident fund, contributory pension rates, loans, and EPF iPortal."
          href={`${PENSION_BASE}/epf`}
          cta="Open EPF desk →"
          icon={Building2}
          accent="emerald"
          badge="EPF"
        />
        <PensionProviderCard
          title="CIT Center"
          body="Citizen Investment Trust / NLK schemes via official e-Service."
          href={`${PENSION_BASE}/cit`}
          cta="Open CIT desk →"
          icon={Landmark}
          accent="cyan"
          badge="CIT"
        />
        <PensionProviderCard
          title="Government Pension"
          body="Contributory pension for eligible government services (Pension Fund Act 2075)."
          href={`${PENSION_BASE}/government`}
          cta="Open government desk →"
          icon={Scale}
          accent="lime"
          badge="Gov"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PensionGlassPanel hover className="p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-200">
              <LineChart size={18} />
            </span>
            <div>
              <PensionSectionLabel>Planning</PensionSectionLabel>
              <PensionHeading>Retirement projection</PensionHeading>
            </div>
          </div>
          <PensionBody>
            Policy-driven contribution stacking using verified rates when available. Unverified formulas are never
            invented.
          </PensionBody>
          <div className="mt-4">
            <PensionActionLink href={`${PENSION_BASE}/retirement-projection`}>
              Open retirement projection →
            </PensionActionLink>
          </div>
        </PensionGlassPanel>

        <PensionGlassPanel hover className="p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">
              <ShieldCheck size={18} />
            </span>
            <div>
              <PensionSectionLabel>Wealth link</PensionSectionLabel>
              <PensionHeading>Portfolio link</PensionHeading>
            </div>
          </div>
          <PensionBody>
            Desk FIRE readiness {hydrated ? `${Math.round(fireScore)}%` : "—"} · Retirement sleeve{" "}
            {!hydrated ? "—" : formatMoney(totals.retirementNpr, "NPR")}
          </PensionBody>
          <div className="mt-4 flex flex-wrap gap-2">
            <PensionActionLink href="/portfolio/retirement" variant="ghost">
              Global retirement assets →
            </PensionActionLink>
            <PensionActionLink href={`${PENSION_BASE}/withdrawal-planner`} variant="secondary">
              Withdrawal planner →
            </PensionActionLink>
          </div>
        </PensionGlassPanel>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: `${PENSION_BASE}/contribution-history`, label: "Contribution History" },
          { href: `${PENSION_BASE}/benefits-center`, label: "Benefits Center" },
          { href: `${PENSION_BASE}/family-protection`, label: "Family Protection" },
          { href: `${PENSION_BASE}/reminder-center`, label: "Reminder Center" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-teal-500/20 bg-teal-500/[0.07] px-3.5 py-3 text-center text-xs font-black text-teal-950 transition hover:border-teal-400/40 hover:bg-teal-500/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40 dark:text-teal-50"
          >
            {item.label} →
          </Link>
        ))}
      </div>

      <PensionGlassPanel className="p-4 sm:p-5">
        <PensionSectionLabel>Integrity rule</PensionSectionLabel>
        <PensionBody className="mt-2">
          FireNepal does not fabricate pension amounts, contribution rates, or withdrawal limits. When an official rule
          is not verified, modules show: “Official policy information unavailable for verification.” Authentication and
          payments always open the respective official portals.
        </PensionBody>
      </PensionGlassPanel>
    </PensionChrome>
  );
}
