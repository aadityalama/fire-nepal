"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function ReturnToNepalHeroBackground() {
  const reduced = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <svg
        className="h-full w-full"
        viewBox="0 0 800 400"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="rtn-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a3d32" />
            <stop offset="35%" stopColor="#062a22" />
            <stop offset="70%" stopColor="#041a14" />
            <stop offset="100%" stopColor="#000805" />
          </linearGradient>
          <linearGradient id="rtn-mtn-far" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#134e4a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#042f2e" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="rtn-mtn-mid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#115e59" />
            <stop offset="60%" stopColor="#0f3d3a" />
            <stop offset="100%" stopColor="#052e2b" />
          </linearGradient>
          <linearGradient id="rtn-mtn-near" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0d4f4a" />
            <stop offset="40%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>
          <linearGradient id="rtn-snow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ecfdf5" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="rtn-sun-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rtn-fog" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#041a14" stopOpacity="0" />
            <stop offset="100%" stopColor="#000805" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* Sky */}
        <rect width="800" height="400" fill="url(#rtn-sky)" />

        {/* Atmospheric sun glow */}
        <ellipse cx="620" cy="80" rx="180" ry="120" fill="url(#rtn-sun-glow)" />

        {/* Far mountain range */}
        <motion.g
          animate={reduced ? {} : { x: [0, 4, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M0 280 L80 200 L140 240 L200 160 L280 220 L360 140 L440 200 L520 120 L600 180 L680 100 L760 160 L800 140 L800 400 L0 400 Z"
            fill="url(#rtn-mtn-far)"
            opacity="0.7"
          />
        </motion.g>

        {/* Mid mountains — Annapurna style peaks */}
        <motion.g
          animate={reduced ? {} : { x: [0, -6, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M0 320 L60 240 L120 280 L180 200 L250 260 L320 170 L400 240 L480 150 L560 210 L640 130 L720 200 L800 170 L800 400 L0 400 Z"
            fill="url(#rtn-mtn-mid)"
          />
          {/* Snow caps */}
          <path
            d="M300 175 L320 170 L340 175 L330 195 L310 195 Z M470 155 L480 150 L495 158 L485 178 L468 172 Z M625 135 L640 130 L658 140 L645 165 L628 158 Z"
            fill="url(#rtn-snow)"
            opacity="0.85"
          />
        </motion.g>

        {/* Near mountains — Everest prominence */}
        <motion.g
          animate={reduced ? {} : { x: [0, 8, 0] }}
          transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M0 360 L100 280 L180 310 L260 230 L340 290 L420 210 L500 270 L580 190 L660 250 L740 220 L800 260 L800 400 L0 400 Z"
            fill="url(#rtn-mtn-near)"
          />
          <path
            d="M400 215 L420 210 L445 220 L430 255 L405 248 Z"
            fill="url(#rtn-snow)"
          />
        </motion.g>

        {/* Atmospheric fog at base */}
        <rect x="0" y="300" width="800" height="100" fill="url(#rtn-fog)" />

        {/* Traditional Nepal temple silhouette — right side */}
        <g transform="translate(620, 248)" opacity="0.92">
          {/* Multi-tier pagoda */}
          <path d="M40 0 L80 0 L60 18 Z" fill="#022c22" />
          <rect x="30" y="18" width="60" height="6" rx="1" fill="#034a3f" />
          <path d="M25 24 L95 24 L70 42 Z" fill="#022c22" />
          <rect x="20" y="42" width="80" height="7" rx="1" fill="#034a3f" />
          <path d="M15 49 L105 49 L75 72 Z" fill="#011a16" />
          <rect x="10" y="72" width="100" height="8" rx="1" fill="#034a3f" />
          <path d="M5 80 L115 80 L80 108 Z" fill="#011a16" />
          <rect x="0" y="108" width="120" height="10" rx="2" fill="#022c22" />
          {/* Base platform */}
          <rect x="-8" y="118" width="136" height="14" rx="2" fill="#000805" opacity="0.9" />
          {/* Finial */}
          <line x1="60" y1="0" x2="60" y2="-14" stroke="#10b981" strokeWidth="2" opacity="0.6" />
          <circle cx="60" cy="-16" r="3" fill="#34d399" opacity="0.7" />
          {/* Prayer flags hint */}
          <path
            d="M60 -14 L45 8 M60 -14 L75 6 M60 -14 L60 20"
            stroke="#34d399"
            strokeWidth="0.8"
            opacity="0.35"
            strokeDasharray="2 3"
          />
        </g>

        {/* Subtle foreground ridge */}
        <path
          d="M0 380 Q200 360 400 370 T800 365 L800 400 L0 400 Z"
          fill="#000805"
          opacity="0.6"
        />
      </svg>
    </div>
  );
}
