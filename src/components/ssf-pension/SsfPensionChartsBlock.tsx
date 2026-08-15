"use client";

import { PcCopy, PcEyebrow, PcSurface, PcTitle, ProjectionViz } from "@/components/pension/PensionUi";

/** Charts stay empty until official contribution history is synced — never invent series. */
export function SsfPensionChartsBlock() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PcSurface className="p-4 sm:p-5">
        <PcEyebrow>Contribution growth</PcEyebrow>
        <PcTitle as="h3">History chart</PcTitle>
        <PcCopy className="mt-2 text-xs">
          Not Synced — no official contribution series is connected. FireNepal will not invent a growth path.
        </PcCopy>
        <div className="mt-4 flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#080d13] px-4 text-center text-sm font-semibold text-[#8b9aab]">
          Contribution history · Not Synced
        </div>
      </PcSurface>
      <PcSurface className="p-4 sm:p-5">
        <PcEyebrow>Projection</PcEyebrow>
        <PcTitle as="h3">Readiness visual</PcTitle>
        <div className="mt-4">
          <ProjectionViz yearsLabel="Not Synced" rateLabel="Verified policy only" />
        </div>
      </PcSurface>
    </div>
  );
}
