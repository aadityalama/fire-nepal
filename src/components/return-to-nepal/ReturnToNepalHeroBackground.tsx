"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Full-bleed Himalayan backdrop — snow peaks stay clearly visible.
 * Overlays are light emerald cinematic grading only (no solid black panel).
 */
export function ReturnToNepalHeroBackground() {
  const reduced = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/membership/card-backdrop.jpg"
        alt=""
        className="absolute inset-0 h-full w-full scale-[1.02] object-cover object-[68%_40%] brightness-[1.1] saturate-[1.05] sm:object-[72%_38%]"
      />

      {/* Subtle dark gradient for text readability — keeps airplane & peaks visible */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.34) 100%),
            linear-gradient(105deg, rgba(2,10,8,0.42) 0%, rgba(6,18,14,0.18) 38%, transparent 62%)
          `,
        }}
      />

      {/* Pulsing emerald light wash */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 72% 58% at 70% 30%, rgba(16,185,129,0.26) 0%, rgba(16,185,129,0.08) 40%, transparent 68%)",
        }}
        animate={reduced ? {} : { opacity: [0.65, 1, 0.65] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 48% 36% at 90% 16%, rgba(52,211,153,0.16) 0%, transparent 58%)",
        }}
      />

      {/* Subtle fog / depth layers */}
      <motion.div
        className="absolute -left-[12%] bottom-[6%] h-[46%] w-[72%] rounded-[100%] bg-emerald-950/15 blur-3xl"
        animate={reduced ? {} : { x: [0, 28, 0], opacity: [0.18, 0.34, 0.18] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[0%] bottom-[10%] h-[40%] w-[52%] rounded-[100%] bg-white/[0.06] blur-3xl"
        animate={reduced ? {} : { x: [0, -22, 0], opacity: [0.2, 0.38, 0.2] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      />
      <motion.div
        className="absolute left-[20%] top-[8%] h-[28%] w-[40%] rounded-[100%] bg-emerald-400/[0.07] blur-3xl"
        animate={reduced ? {} : { x: [0, 16, 0], y: [0, 8, 0], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />

      {/* Soft ground fade — keeps temples readable without a dark panel */}
      <div
        className="absolute inset-x-0 bottom-0 h-[30%]"
        style={{
          background: "linear-gradient(180deg, transparent 0%, rgba(4,12,10,0.14) 50%, rgba(2,8,6,0.32) 100%)",
        }}
      />

      {/* Kathmandu temple accents — light silhouette so photo temples still read */}
      <svg
        className="absolute bottom-[4%] right-[1%] h-[42%] w-[34%] max-w-[200px] opacity-70 sm:right-[3%] sm:h-[50%] sm:max-w-[260px]"
        viewBox="0 0 200 240"
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          <linearGradient id="rtn-stupa-fill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#031a14" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#010806" stopOpacity="0.72" />
          </linearGradient>
          <filter id="rtn-stupa-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g fill="url(#rtn-stupa-fill)" filter="url(#rtn-stupa-glow)">
          <path d="M100 8 L118 28 L82 28 Z" />
          <rect x="78" y="28" width="44" height="5" rx="1" fill="#0a5c4a" opacity="0.7" />
          <path d="M70 33 L130 33 L108 52 L92 52 Z" />
          <rect x="68" y="52" width="64" height="5" rx="1" fill="#0a5c4a" opacity="0.65" />
          <path d="M58 57 L142 57 L118 82 L82 82 Z" />
          <rect x="56" y="82" width="88" height="6" rx="1" fill="#0a5c4a" opacity="0.6" />
          <path d="M44 88 L156 88 L128 122 L72 122 Z" />
          <rect x="40" y="122" width="120" height="8" rx="2" />
          <rect x="28" y="130" width="144" height="14" rx="2" opacity="0.9" />
        </g>
        <g transform="translate(148, 95)" fill="url(#rtn-stupa-fill)" opacity="0.88">
          <ellipse cx="0" cy="48" rx="28" ry="10" />
          <path d="M-22 48 Q-22 18 0 8 Q22 18 22 48 Z" />
          <rect x="-6" y="0" width="12" height="10" rx="1" />
          <path d="M0 -2 L8 8 L-8 8 Z" fill="#022c22" />
          <line x1="0" y1="-18" x2="0" y2="-2" stroke="#34d399" strokeWidth="2" opacity="0.75" />
          <circle cx="0" cy="-20" r="3" fill="#6ee7b7" opacity="0.9" />
        </g>
        <motion.circle
          cx="148"
          cy="75"
          r="18"
          fill="rgba(16,185,129,0.14)"
          animate={reduced ? {} : { r: [12, 22, 12], opacity: [0.32, 0.1, 0.32] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}

export default ReturnToNepalHeroBackground;
