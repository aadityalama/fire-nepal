"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { Check, Clock } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ReturnToNepalHeroBackground } from "@/components/return-to-nepal/ReturnToNepalHeroBackground";
import {
  computeReturnDaysRemaining,
  formatReturnCountdownRemaining,
} from "@/lib/return-to-nepal/return-ai-engine";

const FLIGHT_PATH = "M 48 168 Q 170 52, 305 98 T 518 44";
const SLIDE_INTERVAL_MS = 5000;
const PROGRESS_SEGMENTS = 20;

/** Compact glass chrome for small interactive surfaces (slides, badges) — not full hero panels. */
const GLASS_CARD_STYLE = {
  background: "rgba(12,20,18,0.42)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(52,211,153,0.16)",
  borderRadius: 28,
} as const;

type HeroSlide = {
  id: string;
  emoji: string;
  lines: string[];
};

type ReturnToNepalHeroProps = {
  recommendedDate: string;
  targetYear: number;
  readinessPct: number;
  saveBoostNpr: number;
  saveMonthsEarlier: number;
};

function CountUpPct({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 18 });
  const display = useTransform(spring, (v) => `${Math.round(v)}%`);
  const reduced = useReducedMotion();

  useEffect(() => {
    motionVal.set(reduced ? value : 0);
    if (!reduced) {
      const t = setTimeout(() => motionVal.set(value), 120);
      return () => clearTimeout(t);
    }
  }, [motionVal, reduced, value]);

  return (
    <motion.span className="text-[clamp(2.75rem,9vw,4.5rem)] font-black tabular-nums tracking-[-0.045em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.45),0_0_36px_rgba(16,185,129,0.28)]">
      {display}
    </motion.span>
  );
}

function HeroSegmentedProgress({ pct }: { pct: number }) {
  const reduced = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, pct));
  const filled = Math.round((clamped / 100) * PROGRESS_SEGMENTS);
  const markers = [0, 25, 50, 75, 100];

  return (
    <div className="w-full max-w-md lg:max-w-lg">
      <div className="mb-2 flex justify-between">
        {markers.map((m) => (
          <span key={m} className="text-[10px] font-black tabular-nums tracking-wide text-white/45">
            {m}%
          </span>
        ))}
      </div>
      <motion.div
        className="relative grid gap-[3px] rounded-2xl p-1.5 sm:gap-1"
        style={{
          gridTemplateColumns: `repeat(${PROGRESS_SEGMENTS}, minmax(0, 1fr))`,
          background: "rgba(12,20,18,0.42)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(52,211,153,0.16)",
          boxShadow: "0 0 28px rgba(16,185,129,0.18)",
        }}
        animate={
          reduced
            ? {}
            : {
                boxShadow: [
                  "0 0 18px rgba(16,185,129,0.12)",
                  "0 0 34px rgba(52,211,153,0.32)",
                  "0 0 18px rgba(16,185,129,0.12)",
                ],
              }
        }
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      >
        {Array.from({ length: PROGRESS_SEGMENTS }, (_, i) => {
          const active = i < filled;
          const nearEdge = active && i === filled - 1;
          return (
            <motion.div
              key={i}
              className={`h-3 rounded-[5px] sm:h-3.5 ${
                active
                  ? nearEdge
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-200 shadow-[0_0_14px_rgba(52,211,153,0.7)]"
                    : "bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                  : "bg-white/[0.1]"
              }`}
              initial={{ opacity: 0, scaleY: 0.4 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.35, delay: 0.12 + i * 0.035, ease: [0.22, 1, 0.36, 1] }}
            />
          );
        })}
      </motion.div>
    </div>
  );
}

/** Realistic twin-engine jet silhouette (Nepal Airlines–inspired livery). */
function NepalAirlinesJet({ x = 0, y = 0, scale = 1.2 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale})`}
      style={{ filter: "drop-shadow(0 2px 5px rgba(2,10,8,0.55))" }}
    >
      <defs>
        <linearGradient id="rtn-jet-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f1f5f4" />
          <stop offset="100%" stopColor="#d1d5db" />
        </linearGradient>
        <linearGradient id="rtn-jet-stripe" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0f766e" />
          <stop offset="45%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <filter id="rtn-jet-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Soft shadow under wing */}
      <ellipse cx="2" cy="7" rx="18" ry="3.2" fill="rgba(0,0,0,0.28)" />

      {/* Tail fin */}
      <path
        d="M-22 -1 L-28 -14 L-18 -3.5 Z"
        fill="url(#rtn-jet-body)"
        stroke="rgba(15,23,42,0.35)"
        strokeWidth="0.4"
      />
      <path d="M-26.5 -12.2 L-21.2 -4.2 L-23.8 -3.6 Z" fill="#dc2626" opacity="0.9" />
      <path d="M-25.2 -10.4 L-21.8 -5 L-23.2 -4.6 Z" fill="#059669" opacity="0.85" />

      {/* Fuselage */}
      <path
        d="M-24 0 C-22 -4.2 -12 -5.2 2 -4.6 C12 -4.2 20 -2.6 26 0 C20 2.4 12 3.6 2 3.8 C-12 4.2 -22 3.2 -24 0 Z"
        fill="url(#rtn-jet-body)"
        stroke="rgba(15,23,42,0.28)"
        strokeWidth="0.45"
        filter="url(#rtn-jet-glow)"
      />

      {/* Cockpit windows */}
      <path d="M18 -2.2 C20.5 -1.8 23.2 -0.9 25.2 0 C23.2 0.7 20.5 1.4 18 1.6 Z" fill="#0f172a" opacity="0.55" />
      <path d="M19.2 -1.6 L21.4 -1.1 L21.4 0.9 L19.2 0.6 Z" fill="#67e8f9" opacity="0.35" />

      {/* Cabin windows */}
      {[-10, -5, 0, 5, 10].map((wx) => (
        <ellipse key={wx} cx={wx} cy="-1.1" rx="1.15" ry="0.85" fill="#0f172a" opacity="0.42" />
      ))}

      {/* Nepal Airlines stripe */}
      <path
        d="M-20 0.9 C-10 1.35 4 1.45 18 0.55"
        fill="none"
        stroke="url(#rtn-jet-stripe)"
        strokeWidth="1.35"
        strokeLinecap="round"
        opacity="0.95"
      />

      {/* Main wing */}
      <path
        d="M-2 0.5 L8 1 L22 14 L12 12.5 Z"
        fill="#e5e7eb"
        stroke="rgba(15,23,42,0.3)"
        strokeWidth="0.4"
      />
      <path d="M0 1.2 L8 1.6 L18 11.5 L10 10.4 Z" fill="#10b981" opacity="0.35" />

      {/* Far wing tip */}
      <path
        d="M-4 -0.2 L6 -0.8 L-2 -9 L-8 -6.5 Z"
        fill="#d1d5db"
        stroke="rgba(15,23,42,0.25)"
        strokeWidth="0.35"
        opacity="0.92"
      />

      {/* Engines */}
      <g>
        <rect x="2.5" y="4.2" width="9" height="3.2" rx="1.4" fill="#9ca3af" stroke="rgba(15,23,42,0.35)" strokeWidth="0.35" />
        <circle cx="3.4" cy="5.8" r="1.15" fill="#1f2937" />
        <circle cx="3.4" cy="5.8" r="0.55" fill="#6ee7b7" opacity="0.55" />
      </g>
      <g opacity="0.85">
        <rect x="-1" y="-5.6" width="7.5" height="2.6" rx="1.2" fill="#9ca3af" stroke="rgba(15,23,42,0.3)" strokeWidth="0.3" />
        <circle cx="-0.2" cy="-4.3" r="0.95" fill="#1f2937" />
      </g>

      {/* Nose highlight */}
      <path d="M22 -1.2 C24.5 -0.6 26 0 26 0 C24.5 0.5 22.2 1 20.5 1.1" fill="none" stroke="#ffffff" strokeWidth="0.55" opacity="0.55" />
    </g>
  );
}

function HeroFlightAnimation() {
  const reduced = useReducedMotion();
  const duration = reduced ? 0 : 26;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[3] h-full w-full"
      viewBox="0 0 560 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="rtn-hero-flight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.1" />
          <stop offset="42%" stopColor="#34d399" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.45" />
        </linearGradient>
        <filter id="rtn-hero-pin-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <motion.path
        d={FLIGHT_PATH}
        fill="none"
        stroke="url(#rtn-hero-flight)"
        strokeWidth="2.1"
        strokeDasharray="3.5 7.5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.95 }}
        transition={{ duration: 2.2, ease: "easeOut" }}
      />

      {/* Destination — Nepal */}
      <g transform="translate(518, 40)">
        <motion.circle
          r="16"
          fill="rgba(16,185,129,0.2)"
          animate={reduced ? {} : { r: [11, 21, 11], opacity: [0.55, 0.12, 0.55] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.g
          animate={reduced ? {} : { y: [0, -2.5, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M0 -11 C-5.5 -11 -9 -6.5 -9 -2 C-9 2.5 0 12 0 12 C0 12 9 2.5 9 -2 C9 -6.5 5.5 -11 0 -11Z"
            fill="#10b981"
            filter="url(#rtn-hero-pin-glow)"
          />
          <circle cy="-4.5" r="2.6" fill="#ecfdf5" />
        </motion.g>
        <text x="0" y="28" textAnchor="middle" fill="rgba(167,243,208,0.8)" fontSize="9" fontWeight="700">
          Nepal
        </text>
      </g>

      {/* Origin — Korea */}
      <g>
        <circle cx="48" cy="168" r="4.5" fill="#6ee7b7" opacity="0.9" />
        <circle cx="48" cy="168" r="8.5" fill="rgba(110,231,183,0.18)" />
        <text x="48" y="190" textAnchor="middle" fill="rgba(167,243,208,0.55)" fontSize="8" fontWeight="700">
          Korea
        </text>
      </g>

      {/* Airplane along path */}
      {!reduced ? (
        <motion.g
          style={{ offsetPath: `path('${FLIGHT_PATH}')`, offsetRotate: "auto" }}
          initial={{ offsetDistance: "0%" }}
          animate={{ offsetDistance: "100%" }}
          transition={{ duration, repeat: Infinity, ease: "linear" }}
        >
          <motion.g
            animate={{ y: [0, -2.5, 0, 2, 0] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <NepalAirlinesJet />
          </motion.g>
        </motion.g>
      ) : (
        <g transform="translate(300, 95)">
          <NepalAirlinesJet />
        </g>
      )}
    </svg>
  );
}

function HeroCloudLayer() {
  const reduced = useReducedMotion();
  const clouds = useMemo(
    () => [
      { top: "8%", left: "4%", w: 140, opacity: 0.14, dur: 42, delay: 0 },
      { top: "18%", left: "48%", w: 100, opacity: 0.11, dur: 36, delay: 2.5 },
      { top: "4%", left: "72%", w: 160, opacity: 0.09, dur: 48, delay: 1.2 },
      { top: "30%", left: "24%", w: 118, opacity: 0.08, dur: 40, delay: 4.5 },
      { top: "42%", left: "62%", w: 90, opacity: 0.07, dur: 44, delay: 6 },
    ],
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden" aria-hidden>
      {clouds.map((c, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white blur-2xl"
          style={{
            top: c.top,
            left: c.left,
            width: c.w,
            height: c.w * 0.34,
            opacity: c.opacity,
          }}
          animate={
            reduced
              ? {}
              : {
                  x: [0, 34, 0, -22, 0],
                  y: [0, -8, 0, 6, 0],
                }
          }
          transition={{
            duration: c.dur,
            repeat: Infinity,
            ease: "easeInOut",
            delay: c.delay,
          }}
        />
      ))}
    </div>
  );
}

function HeroSlides({
  slides,
  activeIndex,
  onIndexChange,
}: {
  slides: HeroSlide[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
}) {
  const reduced = useReducedMotion();
  const slide = slides[activeIndex];

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const threshold = 50;
      if (info.offset.x < -threshold) {
        onIndexChange((activeIndex + 1) % slides.length);
      } else if (info.offset.x > threshold) {
        onIndexChange((activeIndex - 1 + slides.length) % slides.length);
      }
    },
    [activeIndex, onIndexChange, slides.length],
  );

  return (
    <div className="mt-3 lg:mt-4">
      <motion.div
        className="touch-pan-y px-4 py-3 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-5 sm:py-3.5"
        style={GLASS_CARD_STYLE}
        drag={reduced ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        onDragEnd={handleDragEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="min-h-[3.75rem] sm:min-h-[3.25rem]"
          >
            <p className="text-[clamp(0.9rem,3.2vw,1.02rem)] font-bold leading-snug text-white/95 [text-shadow:0_1px_12px_rgba(0,0,0,0.45)]">
              <span className="mr-2 text-lg">{slide.emoji}</span>
              {slide.lines[0]}
            </p>
            {slide.lines.slice(1).map((line, i) => (
              <p
                key={i}
                className={`font-semibold text-white/65 [text-shadow:0_1px_10px_rgba(0,0,0,0.4)] ${i === 0 ? "mt-1.5" : "mt-0.5"} text-[clamp(0.78rem,2.6vw,0.85rem)] leading-relaxed`}
              >
                {line}
              </p>
            ))}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="mt-2 flex items-center justify-center gap-1.5">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => onIndexChange(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === activeIndex ? "w-5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" : "w-1.5 bg-white/25 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function ReturnToNepalHero({
  recommendedDate,
  targetYear,
  readinessPct,
  saveBoostNpr,
  saveMonthsEarlier,
}: ReturnToNepalHeroProps) {
  const reduced = useReducedMotion();
  const [slideIndex, setSlideIndex] = useState(0);

  const countdownRemaining = formatReturnCountdownRemaining(targetYear);
  const daysRemaining = computeReturnDaysRemaining(targetYear);
  const onTrack = readinessPct >= 70;

  const slides = useMemo<HeroSlide[]>(
    () => [
      {
        id: "retire-date",
        emoji: "🏖️",
        lines: [
          `You can retire in Nepal in ${recommendedDate}.`,
          "Based on your current income, savings, investments, SSF, insurance and expenses.",
        ],
      },
      {
        id: "fi-expected",
        emoji: "🇳🇵",
        lines: ["Financial Independence Expected", recommendedDate, countdownRemaining],
      },
      {
        id: "countdown",
        emoji: "🎯",
        lines: ["Retirement Countdown", `${daysRemaining.toLocaleString()} Days Remaining`],
      },
      {
        id: "ai-tip",
        emoji: "🤖",
        lines: [
          "FIRE AI",
          saveMonthsEarlier > 0
            ? `Increase monthly savings by NPR ${saveBoostNpr.toLocaleString()}`
            : "You are on track with your current savings pace",
          saveMonthsEarlier > 0
            ? `Retire ${saveMonthsEarlier} month${saveMonthsEarlier === 1 ? "" : "s"} earlier.`
            : "Keep building passive income for a smoother return.",
        ],
      },
    ],
    [countdownRemaining, daysRemaining, recommendedDate, saveBoostNpr, saveMonthsEarlier],
  );

  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => {
      setSlideIndex((i) => (i + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [reduced, slides.length]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-5 h-[min(420px,95vw)] min-h-[360px] max-h-[460px] overflow-hidden rounded-[32px] border border-emerald-400/18 shadow-[0_24px_80px_-28px_rgba(0,0,0,0.7),0_0_48px_-14px_rgba(16,185,129,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] sm:mb-6 sm:h-[min(500px,72vh)] sm:min-h-[420px] sm:max-h-[520px]"
    >
      <ReturnToNepalHeroBackground />
      <HeroCloudLayer />
      <HeroFlightAnimation />

      {/* Soft emerald edge pulse — not a solid overlay */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[4] rounded-[32px]"
        style={{
          boxShadow: "inset 0 0 70px rgba(16,185,129,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
        animate={reduced ? {} : { opacity: [0.65, 1, 0.65] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-6 lg:p-7">
        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-8">
          {/* Content sits directly on the hero — no inner glass card */}
          <div className="min-w-0 p-4 sm:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200/85 [text-shadow:0_1px_10px_rgba(0,0,0,0.35)]">
              Recommended Return Date
            </p>
            <p className="mt-2 text-[clamp(1.55rem,5.2vw,2.55rem)] font-black tracking-[-0.03em] text-emerald-200 [text-shadow:0_2px_24px_rgba(0,0,0,0.45),0_0_28px_rgba(16,185,129,0.35)]">
              {recommendedDate}
            </p>
            <span
              className="mt-3 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[clamp(0.75rem,2.5vw,0.8rem)] font-bold text-white/95 shadow-[0_0_20px_rgba(16,185,129,0.18)]"
              style={{
                background: "rgba(12,20,18,0.42)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: "1px solid rgba(52,211,153,0.18)",
              }}
            >
              <Clock size={14} className="shrink-0 text-emerald-300" />
              {countdownRemaining}
            </span>

            <div className="mt-4 lg:mt-5">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100/55">
                Return Readiness
              </p>
              <CountUpPct value={readinessPct} />
              <p
                className={`mt-1 flex items-center gap-1.5 text-[clamp(0.85rem,2.8vw,0.95rem)] font-bold [text-shadow:0_1px_10px_rgba(0,0,0,0.4)] ${onTrack ? "text-emerald-300" : "text-amber-200"}`}
              >
                <Check size={16} strokeWidth={3} className="shrink-0" />
                {onTrack ? "You are on the right track." : "Building momentum — keep saving."}
              </p>
              <p className="mt-2 max-w-md text-[clamp(0.76rem,2.5vw,0.84rem)] font-semibold leading-relaxed text-white/60 [text-shadow:0_1px_10px_rgba(0,0,0,0.4)]">
                Based on your income, savings, investments, Nepal SSF, insurance, expenses, passive income, and Nepal
                cost of living.
              </p>
            </div>
          </div>

          {/* Right side reserved for flight path / plane / temples (visual layers) */}
          <div className="pointer-events-none relative hidden min-h-[1px] lg:block" aria-hidden />
        </div>

        <div className="mt-auto space-y-2.5 sm:space-y-3">
          <div className="flex flex-col items-stretch lg:items-end">
            <p className="mb-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100/50 lg:text-right">
              Progress
            </p>
            <HeroSegmentedProgress pct={readinessPct} />
          </div>

          <HeroSlides slides={slides} activeIndex={slideIndex} onIndexChange={setSlideIndex} />
        </div>
      </div>
    </motion.section>
  );
}
