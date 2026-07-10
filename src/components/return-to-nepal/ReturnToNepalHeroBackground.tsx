"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Full-width Himalayan scene — inlined SVG (no dynamic import) for reliable production render.
 * `preserveAspectRatio="xMidYMid slice"` matches CSS background-size: cover + center.
 */
export function ReturnToNepalHeroBackground() {
  const reduced = useReducedMotion();

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
      style={{
        background: "linear-gradient(180deg, #0a3d32 0%, #041a14 55%, #000805 100%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        style={{ minHeight: "100%", minWidth: "100%" }}
        viewBox="0 0 800 400"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="rtn-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0d4a3f" />
            <stop offset="35%" stopColor="#073328" />
            <stop offset="70%" stopColor="#041f1a" />
            <stop offset="100%" stopColor="#011210" />
          </linearGradient>
          <linearGradient id="rtn-mtn-far" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a6b62" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0a4540" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="rtn-mtn-mid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#16857a" />
            <stop offset="60%" stopColor="#0f5249" />
            <stop offset="100%" stopColor="#063530" />
          </linearGradient>
          <linearGradient id="rtn-mtn-near" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f6b5e" />
            <stop offset="40%" stopColor="#0a5c4a" />
            <stop offset="100%" stopColor="#033d32" />
          </linearGradient>
          <linearGradient id="rtn-snow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0fdf4" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#bbf7d0" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id="rtn-sun-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rtn-fog" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#041a14" stopOpacity="0" />
            <stop offset="100%" stopColor="#000805" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        <rect width="800" height="400" fill="url(#rtn-sky)" />

        <ellipse cx="620" cy="72" rx="200" ry="130" fill="url(#rtn-sun-glow)" />

        <motion.g
          animate={reduced ? {} : { x: [0, 4, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M0 280 L80 200 L140 240 L200 160 L280 220 L360 140 L440 200 L520 120 L600 180 L680 100 L760 160 L800 140 L800 400 L0 400 Z"
            fill="url(#rtn-mtn-far)"
            opacity="0.82"
          />
        </motion.g>

        <motion.g
          animate={reduced ? {} : { x: [0, -6, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M0 320 L60 240 L120 280 L180 200 L250 260 L320 170 L400 240 L480 150 L560 210 L640 130 L720 200 L800 170 L800 400 L0 400 Z"
            fill="url(#rtn-mtn-mid)"
          />
          <path
            d="M300 175 L320 170 L340 175 L330 195 L310 195 Z M470 155 L480 150 L495 158 L485 178 L468 172 Z M625 135 L640 130 L658 140 L645 165 L628 158 Z"
            fill="url(#rtn-snow)"
            opacity="0.9"
          />
        </motion.g>

        <motion.g
          animate={reduced ? {} : { x: [0, 8, 0] }}
          transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M0 360 L100 280 L180 310 L260 230 L340 290 L420 210 L500 270 L580 190 L660 250 L740 220 L800 260 L800 400 L0 400 Z"
            fill="url(#rtn-mtn-near)"
          />
          <path d="M400 215 L420 210 L445 220 L430 255 L405 248 Z" fill="url(#rtn-snow)" />
        </motion.g>

        <rect x="0" y="290" width="800" height="110" fill="url(#rtn-fog)" />

        {/* Nepal pagoda — right */}
        <g transform="translate(600, 232)" opacity="0.96">
          <path d="M40 0 L80 0 L60 18 Z" fill="#022c22" />
          <rect x="30" y="18" width="60" height="6" rx="1" fill="#0a5c4a" />
          <path d="M25 24 L95 24 L70 42 Z" fill="#022c22" />
          <rect x="20" y="42" width="80" height="7" rx="1" fill="#0a5c4a" />
          <path d="M15 49 L105 49 L75 72 Z" fill="#011a16" />
          <rect x="10" y="72" width="100" height="8" rx="1" fill="#0a5c4a" />
          <path d="M5 80 L115 80 L80 108 Z" fill="#011a16" />
          <rect x="0" y="108" width="120" height="10" rx="2" fill="#022c22" />
          <rect x="-8" y="118" width="136" height="14" rx="2" fill="#000805" opacity="0.85" />
          <line x1="60" y1="0" x2="60" y2="-16" stroke="#34d399" strokeWidth="2.2" opacity="0.75" />
          <circle cx="60" cy="-18" r="3.5" fill="#6ee7b7" opacity="0.85" />
          <path
            d="M60 -16 L42 10 M60 -16 L78 8 M60 -16 L60 22"
            stroke="#34d399"
            strokeWidth="1"
            opacity="0.45"
            strokeDasharray="2 3"
          />
        </g>

        <path d="M0 380 Q200 360 400 370 T800 365 L800 400 L0 400 Z" fill="#000805" opacity="0.45" />
      </svg>
    </div>
  );
}

export default ReturnToNepalHeroBackground;
