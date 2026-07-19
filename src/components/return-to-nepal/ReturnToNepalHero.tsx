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

const FLIGHT_PATH = "M 42 175 Q 165 48, 300 95 T 510 46";
const SLIDE_INTERVAL_MS = 5000;
const PROGRESS_SEGMENTS = 20;

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
    <motion.span className="text-[clamp(3rem,10vw,4.75rem)] font-black tabular-nums tracking-[-0.045em] text-white [text-shadow:0_2px_28px_rgba(0,0,0,0.55),0_0_40px_rgba(16,185,129,0.25)]">
      {display}
    </motion.span>
  );
}

function HeroSegmentedProgress({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const filled = Math.round((clamped / 100) * PROGRESS_SEGMENTS);
  const markers = [0, 25, 50, 75, 100];

  return (
    <div className="w-full max-w-md lg:max-w-lg">
      <div className="mb-2.5 flex justify-between">
        {markers.map((m) => (
          <span key={m} className="text-[10px] font-black tabular-nums tracking-wide text-white/40">
            {m}%
          </span>
        ))}
      </div>
      <div
        className="relative grid gap-[3px] rounded-2xl bg-black/35 p-1.5 ring-1 ring-white/10 backdrop-blur-md sm:gap-1"
        style={{ gridTemplateColumns: `repeat(${PROGRESS_SEGMENTS}, minmax(0, 1fr))` }}
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
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-200 shadow-[0_0_14px_rgba(52,211,153,0.65)]"
                    : "bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.35)]"
                  : "bg-white/[0.08]"
              }`}
              initial={{ opacity: 0, scaleY: 0.4 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.35, delay: 0.12 + i * 0.035, ease: [0.22, 1, 0.36, 1] }}
            />
          );
        })}
      </div>
    </div>
  );
}

function HeroFlightAnimation() {
  const reduced = useReducedMotion();
  const duration = reduced ? 0 : 22;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[3] h-full w-full"
      viewBox="0 0 560 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="rtn-hero-flight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.12" />
          <stop offset="40%" stopColor="#34d399" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.4" />
        </linearGradient>
        <filter id="rtn-hero-glow" x="-50%" y="-50%" width="200%" height="200%">
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
        strokeWidth="2.2"
        strokeDasharray="4 8"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.95 }}
        transition={{ duration: 2.1, ease: "easeOut" }}
      />

      {/* Destination — Nepal */}
      <g transform="translate(508, 42)">
        <motion.circle
          r="16"
          fill="rgba(16,185,129,0.22)"
          animate={reduced ? {} : { r: [11, 20, 11], opacity: [0.55, 0.14, 0.55] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.g
          animate={reduced ? {} : { y: [0, -2.5, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M0 -11 C-5.5 -11 -9 -6.5 -9 -2 C-9 2.5 0 12 0 12 C0 12 9 2.5 9 -2 C9 -6.5 5.5 -11 0 -11Z"
            fill="#10b981"
            filter="url(#rtn-hero-glow)"
          />
          <circle cy="-4.5" r="2.6" fill="#ecfdf5" />
        </motion.g>
        <text x="0" y="28" textAnchor="middle" fill="rgba(167,243,208,0.75)" fontSize="9" fontWeight="700">
          Nepal
        </text>
      </g>

      {/* Origin — Korea */}
      <g>
        <circle cx="42" cy="175" r="4.5" fill="#6ee7b7" opacity="0.85" />
        <circle cx="42" cy="175" r="8" fill="rgba(110,231,183,0.2)" />
        <text x="42" y="196" textAnchor="middle" fill="rgba(167,243,208,0.55)" fontSize="8" fontWeight="700">
          Korea
        </text>
      </g>

      {/* Airplane */}
      {!reduced ? (
        <motion.g
          style={{ offsetPath: `path('${FLIGHT_PATH}')`, offsetRotate: "auto" }}
          initial={{ offsetDistance: "0%" }}
          animate={{ offsetDistance: "100%" }}
          transition={{ duration, repeat: Infinity, ease: "linear" }}
        >
          <motion.g
            animate={{ y: [0, -3, 0, 2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <path
              d="M-12 0 L7 -3.5 L16 0 L7 3.5 Z M-12 0 L-16 -5 L-12 -2.5 M-12 0 L-16 5 L-12 2.5"
              fill="#f0fdf4"
              stroke="#34d399"
              strokeWidth="0.6"
              filter="url(#rtn-hero-glow)"
            />
          </motion.g>
        </motion.g>
      ) : (
        <g transform="translate(300, 95)">
          <path
            d="M-12 0 L7 -3.5 L16 0 L7 3.5 Z M-12 0 L-16 -5 L-12 -2.5 M-12 0 L-16 5 L-12 2.5"
            fill="#f0fdf4"
            stroke="#34d399"
            strokeWidth="0.6"
          />
        </g>
      )}
    </svg>
  );
}

function HeroCloudLayer() {
  const reduced = useReducedMotion();
  const clouds = useMemo(
    () => [
      { top: "10%", left: "6%", w: 130, opacity: 0.16, dur: 40, delay: 0 },
      { top: "20%", left: "52%", w: 95, opacity: 0.12, dur: 34, delay: 3 },
      { top: "6%", left: "74%", w: 150, opacity: 0.1, dur: 46, delay: 1.5 },
      { top: "32%", left: "28%", w: 110, opacity: 0.09, dur: 38, delay: 5 },
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
            height: c.w * 0.35,
            opacity: c.opacity,
          }}
          animate={
            reduced
              ? {}
              : {
                  x: [0, 30, 0, -20, 0],
                  y: [0, -7, 0, 5, 0],
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
    <div className="mt-4 lg:mt-5">
      <motion.div
        className="touch-pan-y rounded-2xl border border-white/12 bg-black/40 px-4 py-3.5 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:px-5 sm:py-4"
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
            className="min-h-[4.5rem] sm:min-h-[3.5rem]"
          >
            <p className="text-[clamp(0.95rem,3.5vw,1.05rem)] font-bold leading-snug text-white/92">
              <span className="mr-2 text-lg">{slide.emoji}</span>
              {slide.lines[0]}
            </p>
            {slide.lines.slice(1).map((line, i) => (
              <p
                key={i}
                className={`font-semibold text-white/55 ${i === 0 ? "mt-1.5" : "mt-0.5"} text-[clamp(0.8rem,2.8vw,0.875rem)] leading-relaxed`}
              >
                {line}
              </p>
            ))}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="mt-2.5 flex items-center justify-center gap-1.5">
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
      className="relative mb-5 h-[min(400px,92vw)] min-h-[340px] max-h-[400px] overflow-hidden rounded-[32px] border border-emerald-400/20 shadow-[0_24px_80px_-28px_rgba(0,0,0,0.85),0_0_48px_-12px_rgba(16,185,129,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] sm:mb-6 sm:h-[min(540px,74vh)] sm:min-h-[440px] sm:max-h-[540px]"
    >
      <ReturnToNepalHeroBackground />
      <HeroCloudLayer />
      <HeroFlightAnimation />

      {/* Ambient edge glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[4] rounded-[32px]"
        style={{
          boxShadow: "inset 0 0 60px rgba(16,185,129,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
        animate={reduced ? {} : { opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-7">
        <div className="grid flex-1 gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-8">
          {/* Dark cinematic glassmorphism card */}
          <div className="min-w-0 rounded-[24px] border border-white/12 bg-black/45 p-4 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl sm:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300/80">
              Recommended Return Date
            </p>
            <p className="mt-2 text-[clamp(1.65rem,5.5vw,2.65rem)] font-black tracking-[-0.03em] text-emerald-300 [text-shadow:0_2px_28px_rgba(0,0,0,0.55),0_0_32px_rgba(16,185,129,0.35)]">
              {recommendedDate}
            </p>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3.5 py-2 text-[clamp(0.75rem,2.5vw,0.8rem)] font-bold text-white/90 shadow-[0_0_20px_rgba(16,185,129,0.15)] backdrop-blur-md">
              <Clock size={14} className="shrink-0 text-emerald-400" />
              {countdownRemaining}
            </span>

            <div className="mt-4 lg:mt-5">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100/50">
                Return Readiness
              </p>
              <CountUpPct value={readinessPct} />
              <p
                className={`mt-1 flex items-center gap-1.5 text-[clamp(0.85rem,2.8vw,0.95rem)] font-bold ${onTrack ? "text-emerald-400" : "text-amber-300"}`}
              >
                <Check size={16} strokeWidth={3} className="shrink-0" />
                {onTrack ? "You are on the right track." : "Building momentum — keep saving."}
              </p>
              <p className="mt-2 max-w-md text-[clamp(0.78rem,2.6vw,0.85rem)] font-semibold leading-relaxed text-white/50">
                Based on your income, savings, investments, Nepal SSF, insurance, expenses, passive income, and Nepal
                cost of living.
              </p>
            </div>
          </div>

          {/* Desktop progress */}
          <div className="hidden flex-col items-end lg:flex">
            <p className="mb-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100/45">Progress</p>
            <HeroSegmentedProgress pct={readinessPct} />
          </div>
        </div>

        {/* Mobile progress */}
        <div className="lg:hidden">
          <HeroSegmentedProgress pct={readinessPct} />
        </div>

        <HeroSlides slides={slides} activeIndex={slideIndex} onIndexChange={setSlideIndex} />
      </div>
    </motion.section>
  );
}
