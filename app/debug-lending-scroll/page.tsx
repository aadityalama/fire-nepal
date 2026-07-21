"use client";

/**
 * Temporary public route for production scroll verification.
 * Not behind /fire-lending auth middleware. Remove after verification.
 */
import { FireLendingProvider } from "@/contexts/FireLendingContext";
import { FireLendingModuleShell } from "@/components/fire-lending/FireLendingModuleShell";
import { FireLendingDashboard } from "@/components/fire-lending/FireLendingDashboard";

export default function DebugLendingScrollPage() {
  return (
    <FireLendingProvider>
      <FireLendingModuleShell>
        <FireLendingDashboard />
      </FireLendingModuleShell>
    </FireLendingProvider>
  );
}
