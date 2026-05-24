"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

/**
 * Touch-first FAB for adding holdings; routes to the live investments editor.
 * Shown below `xl` to align with the collapsible nav shell (drawer on phone & tablet).
 */
export function PortfolioAddAssetFab() {
  return (
    <Link
      href="/portfolio/investments"
      className="portfolio-add-asset-fab fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-[35] flex h-14 min-h-[56px] w-14 min-w-[56px] items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-emerald-950 shadow-[0_12px_40px_-8px_rgba(16,185,129,0.55),0_0_0_1px_rgba(255,255,255,0.12)_inset] ring-2 ring-emerald-300/40 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_16px_48px_-6px_rgba(52,211,153,0.5)] active:scale-[0.96] motion-reduce:transition-none xl:hidden"
      aria-label="Add asset"
      prefetch
    >
      <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden />
    </Link>
  );
}
