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

const FLIGHT_PATH = "M 48 168 Q 180 52, 310 88 T 520 42";
const SLIDE_INTERVAL_MS = 5000;

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
    <motion.span className="text-[clamp(3rem,10vw,4.5rem)] font-black tabular-nums tracking-[-0.04em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.5)]">
      {display}
    </motion.span>
  );
}

function HeroProgressBar({ pct }: { pct: number }) {
  const markers = [0, 25, 50, 75, 100];
  return (
    <div className="w-full max-w-xs lg:max-w-sm">
      <div className="mb-2 flex justify-between">
        {markers.map((m) => (
          <span key={m} className="text-[10px] font-bold tabular-nums text-white/40">
            {m}%
          </span>
        ))}
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/5">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.45)]"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </div>
    </div>
  );
}

function HeroFlightAnimation() {
  const reduced = useReducedMotion();
  const duration = reduced ? 0 : 24;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[3] h-full w-full"
      viewBox="0 0 560 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="rtn-hero-flight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.15" />
          <stop offset="45%" stopColor="#34d399" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0.35" />
        </linearGradient>
        <filter id="rtn-hero-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
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
        strokeWidth="2"
        strokeDasharray="5 9"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.9 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />

      {/* Destination pin — Nepal */}
      <g transform="translate(518, 38)">
        <motion.circle
          r="14"
          fill="rgba(16,185,129,0.2)"
          animate={reduced ? {} : { r: [10, 18, 10], opacity: [0.5, 0.15, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.g
          animate={reduced ? {} : { y: [0, -2, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M0 -10 C-5 -10 -8 -6 -8 -2 C-8 2 0 10 0 10 C0 10 8 2 8 -2 C8 -6 5 -10 0 -10Z"
            fill="#10b981"
            filter="url(#rtn-hero-glow)"
          />
          <circle cy="-4" r="2.5" fill="#ecfdf5" />
        </motion.g>
      </g>

      {/* Origin dot — Korea */}
      <circle cx="48" cy="168" r="4" fill="#6ee7b7" opacity="0.7" />

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
              d="M-10 0 L6 -3 L14 0 L6 3 Z M-10 0 L-14 -4 L-10 -2 M-10 0 L-14 4 L-10 2"
              fill="#f0fdf4"
              stroke="#34d399"
              strokeWidth="0.5"
            />
          </motion.g>
        </motion.g>
      ) : (
        <g transform="translate(310, 88)">
          <path
            d="M-10 0 L6 -3 L14 0 L6 3 Z M-10 0 L-14 -4 L-10 -2 M-10 0 L-14 4 L-10 2"
            fill="#f0fdf4"
            stroke="#34d399"
            strokeWidth="0.5"
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
      { top: "12%", left: "8%", w: 120, opacity: 0.18, dur: 38, delay: 0 },
      { top: "22%", left: "55%", w: 90, opacity: 0.14, dur: 32, delay: 4 },
      { top: "8%", left: "72%", w: 140, opacity: 0.12, dur: 44, delay: 2 },
      { top: "35%", left: "30%", w: 100, opacity: 0.1, dur: 36, delay: 6 },
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
                  x: [0, 28, 0, -18, 0],
                  y: [0, -6, 0, 4, 0],
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
        className="touch-pan-y rounded-2xl border border-white/10 bg-black/25 px-4 py-3.5 backdrop-blur-md sm:px-5 sm:py-4"
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
            <p className="text-[clamp(0.95rem,3.5vw,1.05rem)] font-bold leading-snug text-white/90">
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
              i === activeIndex ? "w-5 bg-emerald-400" : "w-1.5 bg-white/25 hover:bg-white/40"
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
        lines: [
          "Financial Independence Expected",
          recommendedDate,
          countdownRemaining,
        ],
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
      className="relative mb-5 h-[min(380px,88vw)] min-h-[320px] max-h-[380px] overflow-hidden rounded-[32px] border border-white/10 sm:mb-6 sm:h-[min(520px,72vh)] sm:min-h-[420px] sm:max-h-[520px]"
    >
      {/* Layer 0 — Himalayan scene (cover / center) */}
      <ReturnToNepalHeroBackground />

      {/* Layer 1 — subtle readability overlay (mountains remain visible) */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(105deg, rgba(0,8,5,0.42) 0%, rgba(0,12,9,0.28) 42%, rgba(0,8,5,0.52) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 72% 22%, rgba(16,185,129,0.14) 0%, transparent 58%)",
        }}
      />

      <HeroCloudLayer />
      <HeroFlightAnimation />

      {/* Layer 10 — content */}
      <div className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-7">
        <div className="grid flex-1 gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-8">
          {/* Left */}
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300/75">
              Recommended Retirement Date
            </p>
            <p className="mt-2 text-[clamp(1.65rem,5.5vw,2.6rem)] font-black tracking-[-0.03em] text-emerald-300 [text-shadow:0_2px_24px_rgba(0,0,0,0.55)]">
              {recommendedDate}
            </p>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3.5 py-2 text-[clamp(0.75rem,2.5vw,0.8rem)] font-bold text-white/90 backdrop-blur-md">
              <Clock size={14} className="shrink-0 text-emerald-400" />
              {countdownRemaining}
            </span>

            <div className="mt-4 lg:mt-5">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100/45">
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

          {/* Right — desktop progress */}
          <div className="hidden flex-col items-end lg:flex">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100/45">Progress</p>
            <HeroProgressBar pct={readinessPct} />
          </div>
        </div>

        {/* Mobile progress */}
        <div className="lg:hidden">
          <HeroProgressBar pct={readinessPct} />
        </div>

        <HeroSlides slides={slides} activeIndex={slideIndex} onIndexChange={setSlideIndex} />
      </div>
    </motion.section>
  );
}
