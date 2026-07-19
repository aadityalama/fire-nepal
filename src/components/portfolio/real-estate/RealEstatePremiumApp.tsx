"use client";

import { useCallback, useState } from "react";
import { RealEstateAddWizard } from "@/components/portfolio/real-estate/RealEstateAddWizard";
import { RealEstateAnalyticsScreen } from "@/components/portfolio/real-estate/RealEstateAnalyticsScreen";
import { RealEstateBottomNav, type ReNavTab } from "@/components/portfolio/real-estate/RealEstateBottomNav";
import { RealEstateDashboardHome } from "@/components/portfolio/real-estate/RealEstateDashboardHome";
import { RealEstateMoreScreen } from "@/components/portfolio/real-estate/RealEstateMoreScreen";
import { RealEstatePropertiesList } from "@/components/portfolio/real-estate/RealEstatePropertiesList";
import { RealEstatePropertyDetail } from "@/components/portfolio/real-estate/RealEstatePropertyDetail";
import { RealEstateSideNav, RealEstateTabletTopNav } from "@/components/portfolio/real-estate/RealEstateSideNav";
import { ReGlass, ReSectionTitle, RE_KIND_LABEL } from "@/components/portfolio/real-estate/RealEstateUi";
import type { PortfolioLedgerEntry, RealEstateRow, WealthPortfolioStateV2 } from "@/components/portfolio/types";

type View =
  | { kind: "tab"; tab: ReNavTab }
  | { kind: "detail"; id: string }
  | { kind: "wizard" }
  | { kind: "docs-overview" };

export function RealEstatePremiumApp({
  rows,
  ledger,
  krwPerNpr,
  usdPerNpr,
  onMutate,
  onChange,
  onAdd: _onAdd,
  onRemove,
}: {
  rows: RealEstateRow[];
  ledger: readonly PortfolioLedgerEntry[];
  krwPerNpr: number;
  usdPerNpr: number;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
  onChange: (id: string, patch: Partial<RealEstateRow>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  void _onAdd;
  const [view, setView] = useState<View>({ kind: "tab", tab: "dashboard" });

  const activeTab: ReNavTab = view.kind === "tab" ? view.tab : view.kind === "wizard" ? "add" : "dashboard";
  const showChromeNav = view.kind === "tab";

  const detailRow = view.kind === "detail" ? rows.find((r) => r.id === view.id) : undefined;

  const goTab = useCallback((tab: ReNavTab) => {
    if (tab === "add") {
      setView({ kind: "wizard" });
      return;
    }
    setView({ kind: "tab", tab });
  }, []);

  return (
    <section className="relative w-full">
      <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_20%_0%,rgba(16,185,129,0.14),transparent_50%),radial-gradient(ellipse_at_90%_10%,rgba(45,212,191,0.08),transparent_45%)]" />

      {/*
        Layout shells by breakpoint:
        - Mobile (<md): single column + bottom nav
        - Tablet (md–lg): wider canvas + top tabs
        - Desktop (lg+): sidebar + expansive main stage
      */}
      <div
        className={
          showChromeNav
            ? "mx-auto grid w-full max-w-[100%] gap-0 pb-28 md:max-w-5xl md:gap-0 md:pb-8 lg:max-w-[90rem] lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-6 lg:pb-6"
            : "mx-auto w-full max-w-[100%] pb-6 md:max-w-5xl lg:max-w-[90rem]"
        }
      >
        {showChromeNav ? <RealEstateSideNav active={activeTab} onChange={goTab} /> : null}

        <div className="min-w-0">
          {showChromeNav ? <RealEstateTabletTopNav active={activeTab} onChange={goTab} /> : null}

          {view.kind === "tab" && view.tab === "dashboard" ? (
            <RealEstateDashboardHome
              rows={rows}
              krwPerNpr={krwPerNpr}
              usdPerNpr={usdPerNpr}
              onMutate={onMutate}
              onOpenProperties={() => goTab("properties")}
              onOpenProperty={(id) => setView({ kind: "detail", id })}
              onOpenAdd={() => setView({ kind: "wizard" })}
              onOpenAnalytics={() => goTab("analytics")}
            />
          ) : null}

          {view.kind === "tab" && view.tab === "properties" ? (
            <RealEstatePropertiesList
              rows={rows}
              onOpenProperty={(id) => setView({ kind: "detail", id })}
              onAdd={() => setView({ kind: "wizard" })}
            />
          ) : null}

          {view.kind === "tab" && view.tab === "analytics" ? (
            <RealEstateAnalyticsScreen
              rows={rows}
              krwPerNpr={krwPerNpr}
              usdPerNpr={usdPerNpr}
              onOpenProperty={(id) => setView({ kind: "detail", id })}
            />
          ) : null}

          {view.kind === "tab" && view.tab === "more" ? (
            <RealEstateMoreScreen
              ledger={ledger}
              onMutate={onMutate}
              onOpenVaultOverview={() => setView({ kind: "docs-overview" })}
            />
          ) : null}

          {view.kind === "wizard" ? (
            <RealEstateAddWizard
              onCancel={() => setView({ kind: "tab", tab: "dashboard" })}
              onMutate={onMutate}
              onComplete={(propertyId) => setView({ kind: "detail", id: propertyId })}
            />
          ) : null}

          {view.kind === "docs-overview" ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setView({ kind: "tab", tab: "more" })}
                className="text-xs font-black text-emerald-300"
              >
                ← Back
              </button>
              <ReSectionTitle title="Document Vault" subtitle="Open a property to manage its vault" />
              {rows.length === 0 ? (
                <ReGlass className="p-8 text-center">
                  <p className="text-sm font-semibold text-emerald-200/60">No properties yet</p>
                </ReGlass>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
                  {rows.map((r) => (
                    <ReGlass key={r.id} className="p-4" onClick={() => setView({ kind: "detail", id: r.id })}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-emerald-50">{r.name || "Untitled"}</p>
                          <p className="mt-0.5 text-xs font-semibold text-emerald-200/50">
                            {RE_KIND_LABEL[r.propertyType]} · {r.documents?.length ?? 0} documents
                          </p>
                        </div>
                        <span className="text-emerald-300/60">→</span>
                      </div>
                    </ReGlass>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {view.kind === "detail" ? (
            detailRow ? (
              <RealEstatePropertyDetail
                row={detailRow}
                ledger={ledger}
                krwPerNpr={krwPerNpr}
                usdPerNpr={usdPerNpr}
                onBack={() => setView({ kind: "tab", tab: "properties" })}
                onChange={onChange}
                onRemove={onRemove}
                onMutate={onMutate}
              />
            ) : (
              <div className="space-y-3 p-6 text-center">
                <p className="text-sm font-bold text-emerald-100">Property not found</p>
                <button
                  type="button"
                  onClick={() => setView({ kind: "tab", tab: "properties" })}
                  className="text-xs font-black text-emerald-300"
                >
                  Back to list
                </button>
              </div>
            )
          ) : null}
        </div>
      </div>

      {showChromeNav ? <RealEstateBottomNav active={activeTab} onChange={goTab} /> : null}
    </section>
  );
}
