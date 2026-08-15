"use client";

import { useFireTheme } from "@/contexts/FireThemeContext";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { InstitutionPolicyDesk } from "@/components/pension/InstitutionPolicyDesk";

export function GovernmentPensionPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <PensionChrome
      title="Government Pension"
      subtitle="Official contributory pension for eligible government and public-service employees — policy-driven desk with links to EPF’s verified portals only."
    >
      <InstitutionPolicyDesk
        institution="government_pension"
        light={light}
        overview="Nepal’s Contributory Pension Scheme (Pension Fund Act 2075) is administered through the Employees Provident Fund for permanently appointed staff from 2076 Shrawan 1 onward. Use official EPF materials for eligibility, contribution, family pension, and gratuity details."
      />
    </PensionChrome>
  );
}
