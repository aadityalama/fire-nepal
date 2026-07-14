"use client";

import type { CSSProperties } from "react";
import { NEPAL_CHUCHE_OUTLINE_PATH, NEPAL_CHUCHE_VIEWBOX } from "@/components/membership/nepal-chuche-outline";

type NepalChucheMapOutlineProps = {
  width: number;
  height: number;
  className?: string;
  style?: CSSProperties;
  /** Unique id prefix so multiple card instances don't clash SVG filter ids. */
  uid?: string;
};

/**
 * Official Nepal Constitution / Chuche map outline (post-2020),
 * rendered as an emerald neon stroke with a subtle premium glow.
 */
export function NepalChucheMapOutline({
  width,
  height,
  className,
  style,
  uid = "np",
}: NepalChucheMapOutlineProps) {
  const filterId = `${uid}-chuche-glow`;
  const sunId = `${uid}-sun`;
  const moonId = `${uid}-moon`;

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={NEPAL_CHUCHE_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", overflow: "visible", ...style }}
      aria-hidden
    >
      <defs>
        <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={sunId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE08A" />
          <stop offset="55%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={moonId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
      </defs>

      {/* Soft fill for depth without painting over mountains */}
      <path d={NEPAL_CHUCHE_OUTLINE_PATH} fill="rgba(16,185,129,0.07)" stroke="none" />

      {/* Official Chuche neon outline */}
      <path
        d={NEPAL_CHUCHE_OUTLINE_PATH}
        fill="none"
        stroke="#34d399"
        strokeWidth={2.4}
        strokeLinejoin="round"
        strokeLinecap="round"
        filter={`url(#${filterId})`}
        style={{ filter: `url(#${filterId})` }}
      />
      <path
        d={NEPAL_CHUCHE_OUTLINE_PATH}
        fill="none"
        stroke="#a7f3d0"
        strokeWidth={0.85}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.9}
      />

      {/* Nepal flag emblems — western Chuche / Limpiyadhura beak region */}
      <g transform="translate(42 48)" opacity={0.95}>
        <circle cx="10" cy="8" r="7" fill={`url(#${sunId})`} />
        <path
          d="M8 22 C4 22 2 26 5 29 C8 26 14 26 15 29 C18 25 14 22 11 22 Z"
          fill={`url(#${moonId})`}
        />
      </g>
    </svg>
  );
}
