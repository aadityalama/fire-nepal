# Premium Real Estate — product roadmap

Incremental delivery aligned with FIRE Nepal portfolio architecture (`WealthPortfolioStateV2`, `computeWealthTotals`, Supabase row payloads). Styling follows existing wealth modules: `wealth-glass`, teal/cyan gradients, `PremiumGlassCard` patterns where appropriate.

## Phase 1 (current sprint)

1. **Property photo — upload & display**  
   Optional image per `RealEstateRow` (HTTPS URL or client-compressed data URL within a safe size cap). Persists in existing `real_estate.payload` JSON with cloud sync. No change to valuation math (`estimatedValue` / `purchaseValue`).

2. **Real Estate hero summary**  
   Per-property strip: photo (or branded placeholder), name, type, and a one-line KPI summary (est. value, ROI, holding) using existing helpers (`reRoiPct`, `reHoldingYrMo`, `formatMoney` / NPR crosses).

3. **Portfolio sleeve chart (removed from Real Estate page)**  
   ~~Single chart on the Real Estate page~~ — removed to reduce vertical noise; sleeve-style mix remains available in broader portfolio / net-worth views. No change to `computeWealthTotals` or row math.

## Phase 2

1. **Property timeline** — visual milestones (acquired date, ledger buy/sell events, optional manual notes); read-only v1 from `ledger` + `acquiredDate`.
2. **Scenario simulator** — sliders / presets on top of `reAppreciationTargetProjection` and live totals (no new core formula; wrap existing metrics).
3. **Enhanced transaction ledger** — richer filters, export, links to property rows (extends `ModuleLedgerCard` / ledger UI).

## Phase 3

1. **Location intelligence** — structured fields (ward/municipality, geo hint), map links, optional market context (external APIs or curated Nepal baselines).
2. **Valuation confidence score** — heuristic from data completeness (dates, estimates vs purchase, spread, recency); explainable copy, not a black-box “AI price”.

---

## Phase 1 — affected files (implementation)

| Area | Files |
|------|--------|
| Schema / types | `src/components/portfolio/types.ts` |
| Defaults / coerce | `src/components/portfolio/storage.ts` (optional: sanitize photo string length) |
| UI | `src/components/portfolio/RealEstatePanel.tsx`, `src/components/portfolio/real-estate-photo-utils.ts` |
| Docs | `docs/real-estate-premium-roadmap.md` (this file) |

**Not modified in Phase 1:** `real-estate-metrics.ts`, `portfolio-ledger.ts`, `calculations.ts` (totals already expose required NPR fields).

**Future Phase 1+ (optional):** Supabase Storage bucket + `app/api/...` upload route to replace data URLs for very large images; `next.config` `images.remotePatterns` if using `next/image` for external hosts.
