"use client";

import type { ReactNode } from "react";
import { useFireTheme } from "@/contexts/FireThemeContext";

type FireAiGlassCardProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Premium glass card matched to SWP AI Retirement Analysis contrast:
 * high-opacity surface, clear emerald border, readable in light + dark.
 */
export function FireAiGlassCard({ children, className }: FireAiGlassCardProps) {
  const light = useFireTheme().resolvedTheme === "light";
  return (
    <div
      className={`rounded-2xl border p-4 backdrop-blur-xl sm:rounded-[1.35rem] sm:p-5 ${
        light
          ? "border-emerald-200/90 bg-white/[0.94] shadow-[0_8px_32px_rgba(0,63,47,0.10)]"
          : "border-emerald-400/25 bg-emerald-950/75 shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
