import type { ReactNode } from "react";

type PremiumGlassCardProps = {
  children: ReactNode;
  className?: string;
  /** Extra glow on hover */
  glow?: boolean;
  /** Keep decorative and child content clipped to rounded card bounds. */
  clip?: boolean;
};

export function PremiumGlassCard({ children, className = "", glow = true, clip = true }: PremiumGlassCardProps) {
  return (
    <div
      className={`group/card relative min-w-0 ${clip ? "overflow-hidden" : "overflow-visible"} rounded-[20px] border border-white/[0.08] bg-[#0B1623]/95 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_18px_42px_-28px_rgba(0,0,0,0.72)] backdrop-blur-xl backdrop-saturate-[1.08] motion-safe:transition-[transform,box-shadow,border-color,background-color] motion-safe:duration-300 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 ${
        glow
          ? "motion-safe:hover:border-white/[0.14] motion-safe:hover:shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_22px_48px_-30px_rgba(0,0,0,0.82)]"
          : ""
      } ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 h-48 w-48 rounded-full bg-[#38F2A0]/[0.035] blur-3xl transition duration-500 ease-out group-hover/card:bg-[#38F2A0]/[0.055]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-14 -left-12 h-40 w-40 rounded-full bg-[#C06CFF]/[0.03] blur-3xl transition duration-500 group-hover/card:bg-[#C06CFF]/[0.045]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-70"
      />
      {children}
    </div>
  );
}
