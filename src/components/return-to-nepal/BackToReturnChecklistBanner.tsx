"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  RETURN_CHECKLIST_FROM,
  RETURN_TO_NEPAL_CHECKLIST_HREF,
} from "@/lib/return-to-nepal/return-checklist-routes";

/**
 * Shown on workspace pages when opened from Return Checklist (`?from=return-checklist`).
 */
export function BackToReturnChecklistBanner({
  className = "",
  light = false,
}: {
  className?: string;
  /** Light surfaces (emerald calculators) vs dark OS pages. */
  light?: boolean;
}) {
  const params = useSearchParams();
  if (params.get("from") !== RETURN_CHECKLIST_FROM) return null;

  const tone = light
    ? "border-emerald-200 bg-white/90 text-emerald-900 hover:bg-emerald-50"
    : "border-white/15 bg-white/[0.08] text-white hover:border-emerald-400/40 hover:bg-white/[0.12]";

  return (
    <div className={`mb-4 ${className}`}>
      <Link
        href={RETURN_TO_NEPAL_CHECKLIST_HREF}
        className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-black shadow-sm backdrop-blur transition active:scale-[0.98] ${tone}`}
      >
        <ArrowLeft size={16} aria-hidden />
        Back to Return Checklist
      </Link>
    </div>
  );
}
