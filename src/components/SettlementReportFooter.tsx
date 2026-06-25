"use client";

import { memo } from "react";
import { SETTLEMENT_REPORT_FOOTER } from "@/lib/settlement-share";

export type SettlementReportFooterProps = {
  className?: string;
};

function SettlementReportFooterInner({ className = "" }: SettlementReportFooterProps) {
  return (
    <footer className={`border-t border-[#E5E7EB]/80 pt-5 text-center ${className}`}>
      <p className="text-[11px] font-semibold tracking-wide text-[#9CA3AF]">
        {SETTLEMENT_REPORT_FOOTER.poweredBy}
      </p>
      <p className="mt-1 text-[10px] font-medium text-[#9CA3AF]">{SETTLEMENT_REPORT_FOOTER.tagline}</p>
      <p className="mt-1 text-[10px] font-medium text-[#9CA3AF]">{SETTLEMENT_REPORT_FOOTER.url}</p>
    </footer>
  );
}

export const SettlementReportFooter = memo(SettlementReportFooterInner);
