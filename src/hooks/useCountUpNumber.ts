/* eslint-disable react-hooks/set-state-in-effect -- rAF-driven numeric animation; skipAnimation path must sync display to target. */
import { useEffect, useRef, useState } from "react";

/**
 * Smoothly interpolates a displayed number toward `target` (easing-out cubic).
 * When `skipAnimation` is true, jumps immediately to `target`.
 */
export function useCountUpNumber(
  target: number,
  options?: { durationMs?: number; skipAnimation?: boolean },
): number {
  const durationMs = options?.durationMs ?? 960;
  const skipAnimation = options?.skipAnimation ?? false;
  const [display, setDisplay] = useState(() => (skipAnimation ? target : 0));
  const fromRef = useRef(skipAnimation ? target : 0);

  useEffect(() => {
    if (skipAnimation) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    const from = fromRef.current;
    let start: number | null = null;
    let raf = 0;

    const tick = (t: number) => {
      if (start == null) start = t;
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - (1 - p) ** 3;
      setDisplay(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        setDisplay(target);
        fromRef.current = target;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, skipAnimation]);

  return display;
}
