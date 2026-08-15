"use client";

import { useFireTheme } from "@/contexts/FireThemeContext";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { InstitutionPolicyDesk } from "@/components/pension/InstitutionPolicyDesk";

export function SsfCenterPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <PensionChrome
      title="SSF Center"
      subtitle="Nepal Social Security Fund — official-policy desk for contributions, old-age, medical/maternity, accident/disability, and family protection. Login and payments stay on SSF portals."
    >
      <InstitutionPolicyDesk
        institution="ssf"
        light={light}
        overview="The Social Security Fund (सामाजिक सुरक्षा कोष) administers contribution-based social security for enrolled workers. FireNepal surfaces verified scheme structure and official SOSYS links; contribution percentages and claim formulas remain pending until an official rate circular is versioned in the policy layer."
      />
    </PensionChrome>
  );
}
