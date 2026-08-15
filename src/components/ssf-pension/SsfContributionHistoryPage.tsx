"use client";

import { useFireTheme } from "@/contexts/FireThemeContext";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { OfficialPortalActions } from "@/components/pension/OfficialPortalActions";

export function SsfContributionHistoryPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <PensionChrome
      title="Contribution History"
      subtitle="Official contribution ledgers live on institutional portals. FireNepal does not invent historical contribution rows."
    >
      <OfficialPortalActions institution="ssf" light={light} />
      <OfficialPortalActions institution="epf" light={light} />
      <section className={`wealth-glass p-4 sm:p-5 ${light ? "ring-1 ring-slate-900/[0.04]" : ""}`}>
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Ledger source of truth</h2>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600 dark:text-zinc-400">
          Official policy information unavailable for verification for imported contribution history. Use{" "}
          <strong className="text-slate-900 dark:text-white">Official Login ↗</strong> on SSF SOSYS or EPF iPortal to view
          paid months, employer shares, and statements.
        </p>
      </section>
    </PensionChrome>
  );
}
