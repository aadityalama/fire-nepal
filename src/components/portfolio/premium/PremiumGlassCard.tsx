import type { ReactNode } from "react";

type PremiumGlassCardProps = {
  children: ReactNode;
  className?: string;
  /** Extra glow on hover */
  glow?: boolean;
};

export function PremiumGlassCard({ children, className = "", glow = true }: PremiumGlassCardProps) {
  return (
    <div
      className={`group/card relative min-w-0 overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.09] via-zinc-950/38 to-black/[0.58] shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_28px_72px_-32px_rgba(0,0,0,0.68),0_0_88px_-28px_rgba(16,185,129,0.14)] backdrop-blur-2xl backdrop-saturate-[1.12] motion-safe:transition-[transform,box-shadow,border-color,background-color] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-0.5 ${
        glow
          ? "motion-safe:hover:border-emerald-400/35 motion-safe:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.07)_inset,0_32px_80px_-28px_rgba(0,0,0,0.75),0_0_100px_-22px_rgba(52,211,153,0.26)]"
          : ""
      } ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-14 -top-20 h-44 w-44 rounded-full bg-emerald-500/[0.11] blur-3xl transition duration-700 ease-out group-hover/card:bg-emerald-400/[0.14]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-cyan-400/[0.06] blur-3xl transition duration-700 group-hover/card:bg-cyan-300/[0.08]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60"
      />
      {children}
    </div>
  );
}
