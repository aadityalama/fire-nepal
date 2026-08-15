"use client";

import { useFireTheme } from "@/contexts/FireThemeContext";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { InstitutionPolicyDesk } from "@/components/pension/InstitutionPolicyDesk";

export function CitCenterPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <PensionChrome
      title="CIT Center"
      subtitle="Citizen Investment Trust / Nagarik Lagani Kosh — official e-Service for retirement and pension schemes. No CIT passwords are collected in FireNepal."
    >
      <InstitutionPolicyDesk
        institution="cit"
        light={light}
        overview="CIT (nlk.org.np) provides citizen and employee retirement/investment schemes including listings such as Nagarik Migrant Worker Pension Yojana on e-Service. Numeric contribution ceilings and withdrawal formulas are shown only after official circular verification."
      />
    </PensionChrome>
  );
}
