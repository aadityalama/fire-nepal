"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Full-bleed Himalayan backdrop — realistic membership artwork (cover + center),
 * emerald cinematic lighting, soft fog, and a right-side temple/stupa silhouette.
 * No abstract polygon mesh.
 */
export function ReturnToNepalHeroBackground() {
  const reduced = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Realistic Himalaya + Nepal map + pagoda cityscape */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/membership/card-backdrop.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[72%_42%]"
        style={{
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Cinematic readability + emerald premium lighting */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(105deg, rgba(0,8,5,0.88) 0%, rgba(0,10,7,0.55) 38%, rgba(0,8,5,0.28) 62%, rgba(0,12,9,0.62) 100%),
            linear-gradient(180deg, rgba(0,10,8,0.35) 0%, rgba(0,8,5,0.12) 40%, rgba(0,6,4,0.55) 72%, rgba(0,0,0,0.78) 100%)
          `,
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 68% 28%, rgba(16,185,129,0.28) 0%, rgba(16,185,129,0.08) 42%, transparent 68%)",
        }}
        animate={reduced ? {} : { opacity: [0.72, 1, 0.72] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 88% 18%, rgba(52,211,153,0.18) 0%, transparent 55%)",
        }}
      />

      {/* Soft fog / depth */}
      <motion.div
        className="absolute -left-[10%] bottom-[8%] h-[42%] w-[70%] rounded-[100%] bg-emerald-950/50 blur-3xl"
        animate={reduced ? {} : { x: [0, 24, 0], opacity: [0.35, 0.5, 0.35] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[5%] bottom-[12%] h-[36%] w-[48%] rounded-[100%] bg-black/45 blur-3xl"
        animate={reduced ? {} : { x: [0, -18, 0], opacity: [0.4, 0.55, 0.4] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[38%]"
        style={{
          background: "linear-gradient(180deg, transparent 0%, rgba(0,6,4,0.45) 45%, rgba(0,0,0,0.72) 100%)",
        }}
      />

      {/* Nepal temple / stupa silhouette — right */}
      <svg
        className="absolute bottom-[6%] right-[2%] h-[48%] w-[38%] max-w-[220px] opacity-90 sm:right-[4%] sm:h-[55%] sm:max-w-[280px]"
        viewBox="0 0 200 240"
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          <linearGradient id="rtn-stupa-fill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#021a14" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#000805" stopOpacity="0.98" />
          </linearGradient>
          <filter id="rtn-stupa-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Tiered pagoda */}
        <g fill="url(#rtn-stupa-fill)" filter="url(#rtn-stupa-glow)">
          <path d="M100 8 L118 28 L82 28 Z" />
          <rect x="78" y="28" width="44" height="5" rx="1" fill="#0a5c4a" opacity="0.85" />
          <path d="M70 33 L130 33 L108 52 L92 52 Z" />
          <rect x="68" y="52" width="64" height="5" rx="1" fill="#0a5c4a" opacity="0.8" />
          <path d="M58 57 L142 57 L118 82 L82 82 Z" />
          <rect x="56" y="82" width="88" height="6" rx="1" fill="#0a5c4a" opacity="0.75" />
          <path d="M44 88 L156 88 L128 122 L72 122 Z" />
          <rect x="40" y="122" width="120" height="8" rx="2" />
          <rect x="28" y="130" width="144" height="14" rx="2" opacity="0.95" />
        </g>
        {/* Stupa dome + spire */}
        <g transform="translate(148, 95)" fill="url(#rtn-stupa-fill)" opacity="0.95">
          <ellipse cx="0" cy="48" rx="28" ry="10" />
          <path d="M-22 48 Q-22 18 0 8 Q22 18 22 48 Z" />
          <rect x="-6" y="0" width="12" height="10" rx="1" />
          <path d="M0 -2 L8 8 L-8 8 Z" fill="#022c22" />
          <line x1="0" y1="-18" x2="0" y2="-2" stroke="#34d399" strokeWidth="2" opacity="0.7" />
          <circle cx="0" cy="-20" r="3" fill="#6ee7b7" opacity="0.85" />
        </g>
        <motion.circle
          cx="148"
          cy="75"
          r="18"
          fill="rgba(16,185,129,0.15)"
          animate={reduced ? {} : { r: [12, 22, 12], opacity: [0.35, 0.12, 0.35] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}

export default ReturnToNepalHeroBackground;
