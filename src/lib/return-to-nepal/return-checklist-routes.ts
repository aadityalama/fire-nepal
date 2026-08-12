/**
 * Canonical Return Checklist destinations — real app routes only.
 * `from=return-checklist` enables Back to Return Checklist on destination pages.
 */

export const RETURN_CHECKLIST_FROM = "return-checklist" as const;

export type ReturnChecklistItemId =
  | "emergency"
  | "ssf"
  | "investment"
  | "passive"
  | "health"
  | "life"
  | "house"
  | "family"
  | "business"
  | "debt";

const WITH_FROM = (path: string) => {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}from=${RETURN_CHECKLIST_FROM}`;
};

/** Stable href for each checklist card — inspect routes before changing. */
export const RETURN_CHECKLIST_HREFS: Record<ReturnChecklistItemId, string> = {
  emergency: WITH_FROM("/emergency-fund"),
  ssf: WITH_FROM("/portfolio/pension/ssf"),
  investment: WITH_FROM("/portfolio/investments"),
  /** Cashflow records dividend/rental; same inputs feed modeled passive KPI. */
  passive: WITH_FROM("/cashflow-dashboard"),
  health: WITH_FROM("/insurance?focus=health"),
  life: WITH_FROM("/insurance?focus=life"),
  house: WITH_FROM("/return-to-nepal/house"),
  family: WITH_FROM("/family"),
  business: WITH_FROM("/savings-tracker"),
  debt: WITH_FROM("/portfolio/liabilities"),
};

export function returnChecklistHref(id: string): string {
  if (id in RETURN_CHECKLIST_HREFS) {
    return RETURN_CHECKLIST_HREFS[id as ReturnChecklistItemId];
  }
  return WITH_FROM("/return-to-nepal");
}

export const RETURN_CHECKLIST_ANCHOR = "return-checklist";
export const RETURN_TO_NEPAL_CHECKLIST_HREF = `/return-to-nepal#${RETURN_CHECKLIST_ANCHOR}`;
