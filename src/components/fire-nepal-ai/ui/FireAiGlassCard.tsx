"use client";

import type { ReactNode } from "react";
import { useFireTheme } from "@/contexts/FireThemeContext";

type FireAiGlassCardProps = {
  children: ReactNode;
  className?: string;
};

export function FireAiGlassCard({ children, className }: FireAiGlassCardProps) {
  const light = useFireTheme().resolvedTheme === "light";
  return (
    <div
      className={`rounded-2xl border p-4 backdrop-blur-xl sm:rounded-[1.35rem] sm:p-5 ${
        light
          ? "border-emerald-200/70 bg-white/90 shadow-[0_8px_32px_rgba(0,122,61,0.08)]"
          : "border-emerald-400/15 bg-emerald-950/40 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
