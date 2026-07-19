"use client";

import { Suspense } from "react";
import { FireLendingLoanWizard } from "@/components/fire-lending/FireLendingLoanWizard";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm font-semibold">Loading wizard…</div>}>
      <FireLendingLoanWizard />
    </Suspense>
  );
}
