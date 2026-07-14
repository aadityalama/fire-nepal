"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MEMBER_CARD_EXPORT_HEIGHT, MEMBER_CARD_EXPORT_WIDTH } from "@/components/membership/PremiumFireNepalMemberCard";

/** Scales the fixed 1400×900 card to fit mobile viewport width without horizontal overflow. */
export function MemberCardPreviewScaler({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      setScale(Math.min(1, width / MEMBER_CARD_EXPORT_WIDTH));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const safeScale = scale > 0 ? scale : 0.01;
  const scaledHeight = MEMBER_CARD_EXPORT_HEIGHT * safeScale;

  return (
    <div ref={containerRef} className="w-full max-w-full overflow-hidden">
      <div className="relative mx-auto max-w-full" style={{ width: "100%", height: scaledHeight }}>
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: MEMBER_CARD_EXPORT_WIDTH,
            height: MEMBER_CARD_EXPORT_HEIGHT,
            transform: `scale(${safeScale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
