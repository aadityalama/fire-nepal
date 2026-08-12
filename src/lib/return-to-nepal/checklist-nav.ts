/** Canonical deep-links from Return Checklist → existing workspaces. */

export const RETURN_CHECKLIST_FROM = "return-checklist";
export const RETURN_CHECKLIST_HASH = "return-checklist";
export const RETURN_CHECKLIST_HREF = `/return-to-nepal#${RETURN_CHECKLIST_HASH}`;

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

const CHECKLIST_ROUTES: Record<ReturnChecklistItemId, string> = {
  emergency: "/emergency-fund",
  ssf: "/portfolio/pension/ssf",
  investment: "/portfolio/investments",
  passive: "/cashflow-dashboard",
  health: "/insurance",
  life: "/insurance",
  house: "/return-to-nepal/house",
  family: "/cost-of-living",
  business: "/savings-tracker",
  debt: "/portfolio/liabilities",
};

function withQuery(path: string, params: Record<string, string>): string {
  const qs = new URLSearchParams(params);
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}${qs.toString()}`;
}

/** Build a destination URL that preserves Return Checklist navigation context. */
export function checklistItemHref(id: ReturnChecklistItemId): string {
  const base = CHECKLIST_ROUTES[id];
  const params: Record<string, string> = { from: RETURN_CHECKLIST_FROM };

  if (id === "health") params.type = "health";
  if (id === "life") params.type = "life";
  if (id === "business") params.focus = "business";
  if (id === "house") {
    // House has its own decision page under /return-to-nepal — still pass from for consistency.
  }
  if (id === "family") params.focus = "family";

  return withQuery(base, params);
}

export function isFromReturnChecklist(searchParams: URLSearchParams | { get(name: string): string | null }): boolean {
  return searchParams.get("from") === RETURN_CHECKLIST_FROM;
}

export function ctaForChecklistStatus(
  status: "completed" | "on_track" | "in_progress" | "missing",
  options?: { notNeeded?: boolean },
): { statusHint: string; ctaLabel: string } {
  if (options?.notNeeded) {
    return { statusHint: "Not needed", ctaLabel: "View / Edit →" };
  }
  switch (status) {
    case "completed":
    case "on_track":
      return { statusHint: "All set", ctaLabel: "View / Edit →" };
    case "in_progress":
      return { statusHint: "Almost there", ctaLabel: "Continue →" };
    default:
      return { statusHint: "Needs your input", ctaLabel: "Set Up →" };
  }
}
