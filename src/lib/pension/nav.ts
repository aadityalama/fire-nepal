/** Unified Pension workspace — SSF, EPF, CIT, and retirement analytics (FIRE Nepal). */

export const PENSION_BASE = "/portfolio/pension" as const;

/** Top horizontal tabs inside the Pension module (order = UX). */
export const PENSION_TAB_LINKS: readonly { href: string; label: string }[] = [
  { href: PENSION_BASE, label: "Overview" },
  { href: `${PENSION_BASE}/ssf`, label: "SSF" },
  { href: `${PENSION_BASE}/epf`, label: "EPF" },
  { href: `${PENSION_BASE}/cit`, label: "CIT" },
  { href: `${PENSION_BASE}/retirement-projection`, label: "Retirement Projection" },
  { href: `${PENSION_BASE}/contribution-history`, label: "Contribution History" },
  { href: `${PENSION_BASE}/benefits-center`, label: "Benefits Center" },
  { href: `${PENSION_BASE}/withdrawal-planner`, label: "Withdrawal Planner" },
  { href: `${PENSION_BASE}/family-protection`, label: "Family Protection" },
  { href: `${PENSION_BASE}/reminder-center`, label: "Reminder Center" },
] as const;

export function isPensionModulePath(pathname: string): boolean {
  return pathname === PENSION_BASE || pathname.startsWith(`${PENSION_BASE}/`);
}

export function isPensionOverviewPath(pathname: string): boolean {
  return pathname === PENSION_BASE || pathname === `${PENSION_BASE}/`;
}
