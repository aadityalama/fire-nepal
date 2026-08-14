/**
 * FIRE Nepal stacking contract (mobile-first).
 *
 * Do not raise every sheet above an inflated bottom-nav z-index.
 * Keep the main bottom nav *below* full-screen sheets so Delete/Save stay tappable.
 *
 * Layers (ascending):
 * - page content
 * - main bottom nav (FN_Z.bottomNav)
 * - in-page sticky bars / FABs (FN_Z.pageChrome) — above nav, below sheets
 * - sheets / modals (FN_Z.sheet+)
 */

export const FN_Z = {
  /** Main app bottom navigation — must stay below active sheets. */
  bottomNav: 40,
  /** FABs, sticky progress chips — above nav, below sheets. */
  pageChrome: 45,
  /** Full-screen finance sheets / forms. */
  sheet: 50,
  /** Nested dialogs above a sheet (confirm delete, allocation, details). */
  sheetOverlay: 65,
  /** Rare high priority overlays (allocation manager, expense detail). */
  elevated: 70,
} as const;

/** Tailwind-safe class fragments matching FN_Z (keep in sync). */
export const FN_Z_CLASS = {
  bottomNav: "z-40",
  pageChrome: "z-[45]",
  sheet: "z-50",
  sheetOverlay: "z-[65]",
  elevated: "z-[70]",
} as const;
