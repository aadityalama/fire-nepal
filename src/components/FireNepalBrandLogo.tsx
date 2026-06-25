"use client";

import { memo } from "react";
import { FIRE_NEPAL_LOGO_SRC } from "@/lib/settlement-share";

export type FireNepalBrandLogoProps = {
  className?: string;
};

function FireNepalBrandLogoInner({ className = "" }: FireNepalBrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={FIRE_NEPAL_LOGO_SRC}
      alt="FIRE Nepal"
      className={`shrink-0 object-contain ${className}`}
      decoding="async"
    />
  );
}

export const FireNepalBrandLogo = memo(FireNepalBrandLogoInner);
