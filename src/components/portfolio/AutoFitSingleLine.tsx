"use client";

import { useLayoutEffect, useRef, useState } from "react";

function findLargestRemThatFits(
  line: HTMLElement,
  containerWidth: number,
  minRem: number,
  maxRem: number,
): number {
  if (containerWidth <= 0) return minRem;
  line.style.fontSize = `${maxRem}rem`;
  if (line.scrollWidth <= containerWidth + 0.5) return maxRem;

  let lo = minRem;
  let hi = maxRem;
  for (let i = 0; i < 26; i++) {
    const mid = (lo + hi) / 2;
    line.style.fontSize = `${mid}rem`;
    if (line.scrollWidth <= containerWidth + 0.5) lo = mid;
    else hi = mid;
  }
  return Math.max(minRem, lo);
}

export type AutoFitSingleLineProps = {
  text: string;
  /** Largest font size (rem). */
  maxRem?: number;
  /** Smallest font size (rem); keeps long values on one line without cropping. */
  minRem?: number;
  className?: string;
};

/**
 * Single-line metric: scales font down until the string fits the container width.
 * Uses ResizeObserver so it stays correct on mobile / breakpoints.
 */
export function AutoFitSingleLine({ text, maxRem = 1.75, minRem = 0.5625, className = "" }: AutoFitSingleLineProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);
  const [fontRem, setFontRem] = useState(maxRem);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const line = lineRef.current;
    if (!wrap || !line) return;

    const syncFit = () => {
      const w = wrap.clientWidth;
      const next = findLargestRemThatFits(line, w, minRem, maxRem);
      line.style.fontSize = `${next}rem`;
      setFontRem(next);
    };

    syncFit();

    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncFit);
    });
    ro.observe(wrap);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [text, minRem, maxRem]);

  return (
    <div
      ref={wrapRef}
      className="min-w-0 w-full max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]"
    >
      <p
        ref={lineRef}
        style={{ fontSize: `${fontRem}rem` }}
        className={`m-0 min-w-0 max-w-full overflow-visible whitespace-nowrap font-black tabular-nums leading-none tracking-tight [text-rendering:geometricPrecision] ${className}`}
      >
        {text}
      </p>
    </div>
  );
}
