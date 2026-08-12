"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RETURN_CHECKLIST_FROM, RETURN_CHECKLIST_HREF } from "@/lib/return-to-nepal/checklist-nav";

type Props = {
  /** Override default dark-glass chip styles for light pages (e.g. emergency fund). */
  variant?: "dark" | "light";
  className?: string;
};

/**
 * Shows a clear “Back to Return Checklist” action when the user arrived via checklist deep-link.
 */
function BackToReturnChecklistLinkInner({ variant = "dark", className = "" }: Props) {
  const searchParams = useSearchParams();
  if (searchParams.get("from") !== RETURN_CHECKLIST_FROM) return null;

  const styles =
    variant === "light"
      ? "border-emerald-100 bg-white/75 text-emerald-800 hover:border-emerald-200 hover:bg-emerald-50"
      : "border-white/10 bg-white/[0.06] text-emerald-50 hover:border-emerald-400/30 hover:bg-white/[0.1]";

  return (
    <Link
      href={RETURN_CHECKLIST_HREF}
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3.5 text-xs font-black backdrop-blur-xl transition ${styles} ${className}`}
    >
      <ArrowLeft size={15} />
      Back to Return Checklist
    </Link>
  );
}

export function BackToReturnChecklistLink(props: Props) {
  return (
    <Suspense fallback={null}>
      <BackToReturnChecklistLinkInner {...props} />
    </Suspense>
  );
}
