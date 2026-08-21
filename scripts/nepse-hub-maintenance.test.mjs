/**
 * Guards the temporary Premium NEPSE Hub maintenance switch.
 * Hub UI/APIs must be offline; NEPSE Portfolio / My NEPSE Holdings must stay wired.
 * Run: node --test scripts/nepse-hub-maintenance.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const HUB_ONLY_API_ROUTES = [
  "app/api/market/nepse/terminal/route.ts",
  "app/api/market/nepse/screener/route.ts",
  "app/api/market/nepse/smart-watchlists/route.ts",
  "app/api/market/nepse/calendar/route.ts",
  "app/api/market/nepse/index-composition/route.ts",
  "app/api/market/nepse/news/route.ts",
  "app/api/market/nepse/company/[symbol]/route.ts",
  "app/api/market/nepse/company/[symbol]/ohlc/route.ts",
  "app/api/market/nepse/company/[symbol]/financial-intelligence/route.ts",
  "app/api/market/nepse/company/[symbol]/ai-intelligence/route.ts",
];

const SHARED_PORTFOLIO_API_ROUTES = [
  "app/api/market/summary/route.ts",
  "app/api/market/gold-price/route.ts",
  "app/api/market/nepse/search/route.ts",
  "app/api/market/nepse/portfolio-analytics-context/route.ts",
];

describe("Premium NEPSE Hub maintenance (portfolio stays live)", () => {
  it("keeps the Hub kill-switch on", () => {
    const src = read("src/lib/market/nepse-hub-maintenance.ts");
    assert.match(src, /export const NEPSE_HUB_TEMPORARILY_DISABLED = true/);
    assert.match(src, /We are working on it/);
  });

  it("market layout shows maintenance and does not mount Hub polling providers", () => {
    const layout = read("app/market/layout.tsx");
    assert.match(layout, /NepseHubMaintenanceScreen/);
    assert.doesNotMatch(layout, /import \{ RealtimeMarketProvider \}/);
    assert.doesNotMatch(layout, /import \{ WealthPortfolioProvider \}/);
    assert.doesNotMatch(layout, /import \{ NepseMarketShell \}/);
    assert.match(layout, /void children/);
    assert.match(layout, /return <NepseHubMaintenanceScreen \/>/);
  });

  it("portfolio layout still mounts shared market + wealth providers", () => {
    const layout = read("app/portfolio/layout.tsx");
    assert.match(layout, /RealtimeMarketProvider/);
    assert.match(layout, /WealthPortfolioProvider/);
    assert.doesNotMatch(layout, /NepseHubMaintenanceScreen/);
  });

  it("gates Hub-only APIs without touching shared portfolio/holdings APIs", () => {
    for (const rel of HUB_ONLY_API_ROUTES) {
      const src = read(rel);
      assert.match(src, /NEPSE_HUB_TEMPORARILY_DISABLED/, rel);
      assert.match(src, /nepseHubMaintenanceResponse/, rel);
    }
    for (const rel of SHARED_PORTFOLIO_API_ROUTES) {
      const src = read(rel);
      assert.doesNotMatch(src, /NEPSE_HUB_TEMPORARILY_DISABLED/, rel);
      assert.doesNotMatch(src, /nepseHubMaintenanceResponse/, rel);
    }
  });

  it("keeps My NEPSE Holdings on /portfolio/investments and does not replace it with Hub maintenance", () => {
    const hub = read("src/components/product/hub/HubHomePanel.tsx");
    assert.match(hub, /title: "My NEPSE Holdings"/);
    assert.match(hub, /href: "\/portfolio\/investments"/);
    assert.doesNotMatch(hub, /title: "My NEPSE Holdings"[\s\S]{0,120}We are working on it/);

    const investmentsPage = read("app/portfolio/(dashboard)/investments/page.tsx");
    assert.match(investmentsPage, /PortfolioInvestmentsPage/);
    assert.doesNotMatch(investmentsPage, /NepseHubMaintenanceScreen/);
  });

  it("short-circuits Hub pages so terminal/screener/company widgets never mount", () => {
    const pages = [
      "app/market/page.tsx",
      "app/market/terminal/page.tsx",
      "app/market/screener/page.tsx",
      "app/market/watchlist/page.tsx",
      "app/market/ai-assistant/page.tsx",
      "app/market/company/[symbol]/page.tsx",
      "app/market/[service]/page.tsx",
      "app/market/breadth/[category]/page.tsx",
    ];
    for (const rel of pages) {
      const src = read(rel);
      assert.match(src, /NEPSE_HUB_TEMPORARILY_DISABLED/, rel);
      assert.match(src, /return null/, rel);
    }
  });

  it("does not change portfolio RLS/auth or holdings dashboard wiring", () => {
    const routeViews = read("src/components/portfolio/portfolio-route-views.tsx");
    assert.match(routeViews, /NepsePortfolioDashboard/);
    assert.match(routeViews, /useRealtimeMarket/);

    const metrics = read("src/components/portfolio/nepse-portfolio/NepsePortfolioDashboard.tsx");
    assert.match(metrics, /buildNepsePortfolioSummary/);
    assert.match(metrics, /NepseTransactionsPanel/);
    assert.match(metrics, /NepseCorporateActionsPanel/);
    assert.match(metrics, /NepseBuySellForm/);
    assert.match(metrics, /NepseAddStockPicker/);
    assert.match(metrics, /onBuy/);
    assert.match(metrics, /onSell/);
    assert.match(metrics, /emptyActionLabel/);
    assert.match(metrics, /NepseAddStockFab/);

    const detail = read("src/components/portfolio/nepse-portfolio/NepseStockDetail.tsx");
    assert.match(detail, /onBuy/);
    assert.match(detail, /onSell/);
    assert.match(detail, /NepseTxnFilter/);
    assert.match(detail, /\bBUY\b/);
    assert.match(detail, /\bSELL\b/);
    assert.match(detail, /Transaction filter/);

    const form = read("src/components/portfolio/nepse-portfolio/NepseBuySellForm.tsx");
    assert.match(form, /Portfolio tracking only/);
    assert.match(form, /recordInvestmentBuy/);
    assert.match(form, /recordInvestmentSell/);
    assert.match(form, /Cannot sell more than available/);

    const picker = read("src/components/portfolio/nepse-portfolio/NepseAddStockPicker.tsx");
    assert.match(picker, /ensureNepseHoldingRow/);
    assert.match(picker, /filterMasterInstruments/);
    assert.match(picker, /\/api\/market\/nepse\/search/);
    assert.match(picker, /onSelected/);

    const ensure = read("src/components/portfolio/nepse-portfolio/ensure-nepse-holding.ts");
    assert.match(ensure, /export function ensureNepseHoldingRow/);

    const fab = read("src/components/portfolio/nepse-portfolio/NepsePortfolioUi.tsx");
    assert.match(fab, /bottom-\[calc\(5\.75rem/);
    assert.match(fab, /z-\[55\]/);
  });
});
