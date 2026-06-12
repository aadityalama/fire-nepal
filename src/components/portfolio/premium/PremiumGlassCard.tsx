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
      className={`group/card relative min-w-0 ${clip ? "overflow-hidden" : "overflow-visible"} rounded-[20px] border border-white/[0.14] bg-gradient-to-br from-[#0f1f2d]/92 via-[#0B1623]/88 to-[#071018]/85 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_18px_42px_-28px_rgba(0,0,0,0.55)] backdrop-blur-lg backdrop-saturate-[1.06] motion-safe:transition-[transform,box-shadow,border-color,background-color] motion-safe:duration-300 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 ${
        glow
          ? "motion-safe:hover:border-[rgba(79,255,209,0.28)] motion-safe:hover:shadow-[0_1px_0_rgba(255,255,255,0.07)_inset,0_22px_48px_-30px_rgba(0,0,0,0.65),0_0_40px_-12px_rgba(79,255,209,0.12)]"
          : ""
      } ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 h-48 w-48 rounded-full bg-[#38F2A0]/[0.045] blur-3xl transition duration-500 ease-out group-hover/card:bg-[#38F2A0]/[0.07]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-14 -left-12 h-40 w-40 rounded-full bg-[#C06CFF]/[0.04] blur-3xl transition duration-500 group-hover/card:bg-[#C06CFF]/[0.06]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-80"
      />
      {children}
    </div>
  );
}
