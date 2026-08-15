"use client";

import { useFireTheme } from "@/contexts/FireThemeContext";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { InstitutionPolicyDesk } from "@/components/pension/InstitutionPolicyDesk";

export function EpfCenterPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <PensionChrome
      title="EPF Center"
      subtitle="Employees Provident Fund (कर्मचारी सञ्चय कोष) — provident savings, contributory pension, loans, and official iPortal actions."
    >
      <InstitutionPolicyDesk
        institution="epf"
        light={light}
        overview="EPF manages provident fund and contributory pension services for public and private employees. Verified contribution rates for the Contributory Pension Scheme (6% + 6%) come from EPF’s official service page; other PF/interest rates stay pending verification."
      />
    </PensionChrome>
  );
}
