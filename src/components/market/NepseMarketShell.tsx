"use client";

import type { ReactNode } from "react";
import { NepseHubBottomNav } from "@/components/market/NepseHubBottomNav";

/** Shared chrome for every `/market` route — providers stay in the server layout. */
export function NepseMarketShell({ children }: { children: ReactNode }) {
  return (
    <div className="pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
      {children}
      <NepseHubBottomNav />
    </div>
  );
}
