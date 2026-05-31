"use client";

import { ShieldCheck } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { SSF_BENEFITS } from "@/lib/ssf-pension/demo-data";
import { PensionChrome } from "@/components/pension/PensionChrome";

export function SsfClaimBenefitsPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <PensionChrome
      title="Benefits Center"
      subtitle="Medical, accident, family protection, maternity, and dependent support — eligibility mirrors continuity rules for your public tier."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {SSF_BENEFITS.map((b) => (
          <div
            key={b.id}
            className={`wealth-glass flex gap-3 p-4 sm:p-5 ${
              light ? "ring-1 ring-slate-900/[0.04]" : ""
            }`}
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/15 text-indigo-200">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900 dark:text-white">{b.label}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-zinc-400">{b.detail}</p>
              <span
                className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                  b.status === "eligible"
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-100"
                    : b.status === "review"
                      ? "border-amber-400/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
                      : "border-zinc-400/30 bg-white/[0.04] text-zinc-500 dark:text-zinc-300"
                }`}
              >
                {b.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </PensionChrome>
  );
}
