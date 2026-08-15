import type { OfficialPortalLink, PensionInstitutionId } from "@/lib/pension-policy/types";

/**
 * Verified official portal URLs only.
 * Credentials / OTPs are never collected in FireNepal — links open the official site.
 */
export const OFFICIAL_PENSION_PORTALS: OfficialPortalLink[] = [
  {
    institution: "ssf",
    label: "Official Portal",
    href: "https://ssf.gov.np/",
    description: "Social Security Fund (सामाजिक सुरक्षा कोष) official website",
    verified: true,
    officialSourceUrl: "https://ssf.gov.np/",
  },
  {
    institution: "ssf",
    label: "Official Login",
    href: "https://sosys.ssf.gov.np/Modules/REGISTRATION/ContributorLogin.aspx",
    description: "SSF contributor login on the official SOSYS portal",
    verified: true,
    officialSourceUrl: "https://sosys.ssf.gov.np/",
  },
  {
    institution: "ssf",
    label: "Pay / Contribution",
    href: "https://sosys.ssf.gov.np/Modules/REGISTRATION/EmployerLogin.aspx",
    description: "SSF employer portal for contribution deposit (official SOSYS)",
    verified: true,
    officialSourceUrl: "https://sosys.ssf.gov.np/",
  },
  {
    institution: "epf",
    label: "Official Portal",
    href: "https://epf.org.np/",
    description: "Employees Provident Fund (कर्मचारी सञ्चय कोष) official website",
    verified: true,
    officialSourceUrl: "https://epf.org.np/",
  },
  {
    institution: "epf",
    label: "Official Login",
    href: "https://login.epf.org.np/",
    description: "EPF iPortal login for members and offices",
    verified: true,
    officialSourceUrl: "https://epf.org.np/",
  },
  {
    institution: "epf",
    label: "Pay / Contribution",
    href: "https://login.epf.org.np/",
    description: "EPF online services for contributions and member actions via iPortal",
    verified: true,
    officialSourceUrl: "https://epf.org.np/",
  },
  {
    institution: "cit",
    label: "Official Portal",
    href: "https://nlk.org.np/",
    description: "Citizen Investment Trust / Nagarik Lagani Kosh (CIT) official website",
    verified: true,
    officialSourceUrl: "https://nlk.org.np/",
  },
  {
    institution: "cit",
    label: "Official Login",
    href: "https://eservice.nlk.org.np/",
    description: "CIT / NLK official e-Service login",
    verified: true,
    officialSourceUrl: "https://eservice.nlk.org.np/",
  },
  {
    institution: "cit",
    label: "Pay / Contribution",
    href: "https://eservice.nlk.org.np/",
    description: "CIT e-Service for contribution and pension enrollment",
    verified: true,
    officialSourceUrl: "https://eservice.nlk.org.np/",
  },
  {
    institution: "government_pension",
    label: "Official Portal",
    href: "https://epf.org.np/service/contributory-pension/",
    description: "EPF Contributory Pension Scheme desk for eligible government/public employees",
    verified: true,
    officialSourceUrl: "https://epf.org.np/service/contributory-pension/",
  },
  {
    institution: "government_pension",
    label: "Official Login",
    href: "https://login.epf.org.np/",
    description: "Official EPF iPortal login used for contributory pension KYC and statements",
    verified: true,
    officialSourceUrl: "https://epf.org.np/service/contributory-pension/",
  },
  {
    institution: "government_pension",
    label: "Pay / Contribution",
    href: "https://login.epf.org.np/",
    description: "Official portal for office web-entry and contribution deposit under the Pension Fund Act 2075",
    verified: true,
    officialSourceUrl: "https://epf.org.np/service/contributory-pension/",
  },
];

export function portalsForInstitution(institution: PensionInstitutionId): OfficialPortalLink[] {
  return OFFICIAL_PENSION_PORTALS.filter((p) => p.institution === institution);
}
