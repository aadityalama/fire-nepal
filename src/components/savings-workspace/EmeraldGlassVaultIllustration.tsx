/** Premium emerald glass vault + subtle wealth growth graph for the Total Savings hero. */
export function EmeraldGlassVaultIllustration() {
  return (
    <svg
      viewBox="0 0 144 144"
      className="h-[5.5rem] w-[5.5rem] sm:h-24 sm:w-24"
      role="img"
      aria-label="Emerald glass vault with wealth growth"
    >
      <defs>
        <linearGradient id="egv-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.55" />
          <stop offset="42%" stopColor="#10b981" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#064e3b" stopOpacity="0.72" />
        </linearGradient>
        <linearGradient id="egv-door" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.35" />
          <stop offset="55%" stopColor="#059669" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#022c22" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="egv-rim" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d1fae5" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="egv-graph" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="egv-line" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ecfdf5" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id="egv-glow" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#10b981" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
        <filter id="egv-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Soft ambient glow */}
      <ellipse cx="72" cy="78" rx="48" ry="42" fill="url(#egv-glow)" />

      {/* Vault body — glass slab */}
      <g filter="url(#egv-soft)">
        <rect
          x="38"
          y="34"
          width="68"
          height="76"
          rx="14"
          fill="url(#egv-body)"
          stroke="url(#egv-rim)"
          strokeWidth="1.5"
        />
        {/* Glass highlight */}
        <path
          d="M48 40c8-2 28-3 48 2"
          fill="none"
          stroke="#ecfdf5"
          strokeOpacity="0.55"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Inner door */}
        <rect
          x="48"
          y="46"
          width="48"
          height="52"
          rx="10"
          fill="url(#egv-door)"
          stroke="#a7f3d0"
          strokeOpacity="0.35"
          strokeWidth="1"
        />
        {/* Dial / lock ring */}
        <circle cx="72" cy="68" r="11" fill="#022c22" fillOpacity="0.35" stroke="#d1fae5" strokeOpacity="0.55" strokeWidth="1.25" />
        <circle cx="72" cy="68" r="6.5" fill="none" stroke="#6ee7b7" strokeOpacity="0.7" strokeWidth="1.1" />
        <circle cx="72" cy="68" r="2.2" fill="#ecfdf5" fillOpacity="0.85" />
        <path d="M72 61.5v3.2" stroke="#ecfdf5" strokeOpacity="0.75" strokeWidth="1.2" strokeLinecap="round" />
        {/* Handle notch */}
        <rect x="88" y="64" width="4" height="10" rx="2" fill="#a7f3d0" fillOpacity="0.45" />
      </g>

      {/* Subtle upward wealth growth graph */}
      <g opacity="0.92">
        <path
          d="M46 108 C58 104, 66 96, 76 88 C86 80, 94 74, 106 66"
          fill="none"
          stroke="url(#egv-line)"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
        <path
          d="M46 108 C58 104, 66 96, 76 88 C86 80, 94 74, 106 66 L106 112 L46 112 Z"
          fill="url(#egv-graph)"
        />
        <circle cx="106" cy="66" r="3.2" fill="#ecfdf5" fillOpacity="0.9" />
        <circle cx="106" cy="66" r="5.5" fill="#6ee7b7" fillOpacity="0.25" />
      </g>
    </svg>
  );
}
