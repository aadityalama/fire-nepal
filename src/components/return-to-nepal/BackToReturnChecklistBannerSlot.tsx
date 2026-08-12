"use client";

import { Suspense } from "react";
import { BackToReturnChecklistBanner } from "@/components/return-to-nepal/BackToReturnChecklistBanner";

/** Safe for server components — wraps searchParams banner in Suspense. */
export function BackToReturnChecklistBannerSlot({
  className,
  light,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <BackToReturnChecklistBanner className={className} light={light} />
    </Suspense>
  );
}
