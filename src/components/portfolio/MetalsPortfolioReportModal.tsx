"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { FileDown, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import {
  resolveMetalGramRatesForUi,
  resolveMetalTolaRatesForUi,
} from "@/components/portfolio/calculations";
import type { MetalRow, PortfolioLedgerEntry } from "@/components/portfolio/types";
import {
  buildMetalsPortfolioReportSnapshot,
  DEFAULT_METALS_REPORT_SECTIONS,
  formatReportNpr,
  formatReportPct,
  type MetalsReportMetalFilter,
  type MetalsReportSections,
  type MetalsReportSectionId,
  type MetalsReportSnapshot,
} from "@/lib/metals-portfolio-report";

/** Official FIRE Nepal logo asset (public/). Keep this literal — do not pull settlement-share into the metals report graph. */
const FIRE_NEPAL_LOGO_SRC = "/logo.png";

const SECTION_LABELS: { id: MetalsReportSectionId; label: string }[] = [
  { id: "summary", label: "Portfolio Summary" },
  { id: "holdings", label: "Individual Holdings" },
  { id: "purchases", label: "Purchase History" },
  { id: "sales", label: "Sales and Transaction History" },
  { id: "performance", label: "Investment Performance" },
];

const FILTER_OPTIONS: { id: MetalsReportMetalFilter; label: string }[] = [
  { id: "all", label: "Complete Gold & Silver Report" },
  { id: "gold", label: "Gold Only Report" },
  { id: "silver", label: "Silver Only Report" },
];

export function MetalsPortfolioReportModal({
  open,
  onClose,
  rows,
  ledger,
}: {
  open: boolean;
  onClose: () => void;
  rows: readonly MetalRow[];
  ledger: readonly PortfolioLedgerEntry[];
}) {
  const titleId = useId();
  const { profile, loading: profileLoading } = useCurrentUserProfile();
  const { totals, bullionSpot, usdPerNpr } = useWealthPortfolio();
  const [metalFilter, setMetalFilter] = useState<MetalsReportMetalFilter>("all");
  const [sections, setSections] = useState<MetalsReportSections>({ ...DEFAULT_METALS_REPORT_SECTIONS });
  const [busy, setBusy] = useState<"pdf" | "print" | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gramRates = useMemo(
    () => resolveMetalGramRatesForUi(bullionSpot, usdPerNpr),
    [bullionSpot, usdPerNpr],
  );
  const tolaRates = useMemo(
    () => resolveMetalTolaRatesForUi(bullionSpot, usdPerNpr),
    [bullionSpot, usdPerNpr],
  );

  const snapshot: MetalsReportSnapshot = useMemo(
    () =>
      buildMetalsPortfolioReportSnapshot({
        rows,
        ledger,
        gramRates,
        tolaRates,
        bullionSpot,
        netWorthNpr: totals.netWorthNpr,
        memberFullName: profile?.fullName || null,
        memberId: profile?.fireNepalId || null,
        metalFilter,
        sections,
      }),
    [
      rows,
      ledger,
      gramRates,
      tolaRates,
      bullionSpot,
      totals.netWorthNpr,
      profile?.fullName,
      profile?.fireNepalId,
      metalFilter,
      sections,
    ],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const toggleSection = (id: MetalsReportSectionId) => {
    setSections((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (!Object.values(next).some(Boolean)) {
        toast.message("Keep at least one report section selected.");
        return prev;
      }
      return next;
    });
  };

  const runAction = async (action: "pdf" | "print") => {
    if (busy) return;
    setBusy(action);
    setError(null);
    setStatus(action === "pdf" ? "Generating PDF…" : "Preparing print…");
    try {
      // Lazy-load jsPDF path only when the user exports — keeps /portfolio/gold SSR/client graph leaner.
      const { downloadMetalsPortfolioReportPdf, printMetalsPortfolioReportPdf } = await import(
        "@/lib/metals-portfolio-report-pdf"
      );
      if (action === "pdf") {
        const filename = await downloadMetalsPortfolioReportPdf(snapshot);
        setStatus(`Downloaded ${filename}`);
        toast.success("Gold & Silver report PDF ready.");
      } else {
        await printMetalsPortfolioReportPdf(snapshot);
        setStatus("Print dialog opened (or PDF downloaded if pop-ups were blocked).");
        toast.success("Print report ready.");
      }
    } catch (err) {
      console.error("Metals portfolio report failed", err);
      const message = err instanceof Error ? err.message : "Report generation failed.";
      setError(message);
      setStatus(null);
      toast.error("Could not generate the Gold & Silver report.");
    } finally {
      setBusy(null);
    }
  };

  const showGold = metalFilter !== "silver";
  const showSilver = metalFilter !== "gold";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close report" onClick={() => !busy && onClose()} />
      <div className="relative z-[1] flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-emerald-200 bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-800 to-emerald-700 px-4 py-3 text-white sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={FIRE_NEPAL_LOGO_SRC} alt="FIRE Nepal" className="h-10 w-10 rounded-lg bg-black object-contain" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100/90">
                  Financial Independence Retire Early
                </p>
                <h2 id={titleId} className="truncate text-base font-black sm:text-lg">
                  Gold & Silver Investment Report
                </h2>
                <p className="text-[11px] text-emerald-50/85">Personal Wealth Statement · www.firenepal.com</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="rounded-lg p-2 text-white/90 hover:bg-white/10"
            aria-label="Close report"
          >
            <X size={18} />
          </button>
        </header>

        <div className="shrink-0 space-y-3 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
          <div>
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Report selection</p>
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMetalFilter(opt.id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                    metalFilter === opt.id
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Optional sections</p>
            <div className="flex flex-wrap gap-2">
              {SECTION_LABELS.map((s) => (
                <label
                  key={s.id}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                    sections[s.id]
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-emerald-700"
                    checked={sections[s.id]}
                    onChange={() => toggleSection(s.id)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void runAction("pdf")}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 text-xs font-black text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              <FileDown size={14} />
              {busy === "pdf" ? "Generating…" : "Download PDF"}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void runAction("print")}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-emerald-700 bg-white px-3.5 text-xs font-black text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
            >
              <Printer size={14} />
              {busy === "print" ? "Preparing…" : "Print Report"}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={onClose}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Close Report
            </button>
          </div>
          {status ? <p className="text-[11px] font-semibold text-emerald-800">{status}</p> : null}
          {error ? <p className="text-[11px] font-semibold text-rose-700">{error}</p> : null}
          {profileLoading ? (
            <p className="text-[11px] font-semibold text-slate-500">Loading member profile…</p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F8FAFC] px-3 py-3 sm:px-5 sm:py-4">
          <article className="mx-auto max-w-[720px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 print:border-0 print:shadow-none">
            <div className="mb-4 flex items-start gap-3 border-b border-emerald-100 pb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={FIRE_NEPAL_LOGO_SRC} alt="FIRE Nepal" className="h-12 w-12 rounded-lg bg-black object-contain" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-black text-emerald-900">FIRE Nepal</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Financial Independence Retire Early
                </p>
                <p className="mt-1 text-sm font-bold text-slate-800">Gold & Silver Investment Report</p>
                <p className="text-xs text-slate-500">Personal Wealth Statement · www.firenepal.com</p>
              </div>
              <div className="hidden text-right text-[10px] text-slate-500 sm:block">
                <p className="font-bold text-emerald-800">{snapshot.reportTypeLabel}</p>
                <p>Ref {snapshot.referenceNumber}</p>
              </div>
            </div>

            <dl className="mb-4 grid grid-cols-1 gap-1.5 text-[12px] sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Member</dt>
                <dd className="font-bold text-slate-900">{snapshot.memberFullName}</dd>
              </div>
              {snapshot.memberId ? (
                <div>
                  <dt className="text-slate-500">Member ID</dt>
                  <dd className="font-bold tabular-nums text-slate-900">{snapshot.memberId}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-slate-500">Generated</dt>
                <dd className="font-semibold text-slate-800">
                  {snapshot.generatedDateLabel}
                  <br />
                  {snapshot.generatedTimeLabel}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Period · Currency</dt>
                <dd className="font-semibold text-slate-800">
                  {snapshot.reportPeriodLabel}
                  <br />
                  NPR
                </dd>
              </div>
            </dl>

            {sections.summary ? (
              <section className="mb-5">
                <h3 className="mb-2 border-l-4 border-emerald-700 pl-2 text-sm font-black text-emerald-900">
                  Executive Portfolio Summary
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <PreviewStat label="Cost basis" value={formatReportNpr(snapshot.summary.totalInvestmentNpr)} />
                  <PreviewStat
                    label="Current value"
                    value={formatReportNpr(snapshot.summary.currentValueNpr)}
                    accent="gold"
                  />
                  <PreviewStat
                    label="Profit / Loss"
                    value={formatReportNpr(snapshot.summary.profitLossNpr, true)}
                    tone={snapshot.summary.profitLossNpr}
                  />
                  <PreviewStat label="ROI" value={formatReportPct(snapshot.summary.roiPct)} tone={snapshot.summary.roiPct} />
                  <PreviewStat label="CAGR" value={snapshot.summary.cagrLabel} accent="gold" />
                  <PreviewStat
                    label="Net worth share"
                    value={
                      snapshot.summary.netWorthSharePct != null
                        ? formatReportPct(snapshot.summary.netWorthSharePct, 2, false)
                        : "—"
                    }
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-600">
                  Gold {snapshot.summary.goldGrams.toFixed(2)} g · Silver {snapshot.summary.silverGrams.toFixed(2)} g ·{" "}
                  {snapshot.summary.holdingsCount} holdings · Fees {formatReportNpr(snapshot.summary.totalFeesNpr)} ·
                  Realized {formatReportNpr(snapshot.summary.realizedProfitNpr, true)} · Unrealized{" "}
                  {formatReportNpr(snapshot.summary.unrealizedProfitNpr, true)}
                </p>
                {snapshot.summary.cagrIsAnnualizedShortPeriod && snapshot.summary.cagrFraction != null ? (
                  <p className="mt-1 text-[10px] font-semibold text-amber-800">
                    Holding period under one year — CAGR is annualized, not accumulated actual return or a forecast.
                  </p>
                ) : null}

                <h4 className="mb-1.5 mt-4 text-xs font-black uppercase tracking-wide text-slate-600">
                  Nepal Market Price · Hamro Patro
                </h4>
                {snapshot.market.priceUnavailable ? (
                  <p className="mb-1 text-[11px] font-bold text-rose-700">Price Unavailable</p>
                ) : null}
                {snapshot.market.staleDisclosed ? (
                  <p className="mb-1 text-[11px] font-bold text-amber-800">
                    Stale market prices disclosed — last successful sync used.
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                  <PreviewStat
                    label="Gold / g"
                    value={
                      snapshot.market.goldPerGramNpr != null
                        ? formatReportNpr(snapshot.market.goldPerGramNpr)
                        : "Price Unavailable"
                    }
                    accent="gold"
                  />
                  <PreviewStat
                    label="Gold / tola"
                    value={
                      snapshot.market.goldPerTolaNpr != null
                        ? formatReportNpr(snapshot.market.goldPerTolaNpr)
                        : "Price Unavailable"
                    }
                    accent="gold"
                  />
                  <PreviewStat
                    label="Silver / g"
                    value={
                      snapshot.market.silverPerGramNpr != null
                        ? formatReportNpr(snapshot.market.silverPerGramNpr)
                        : "Price Unavailable"
                    }
                    accent="silver"
                  />
                  <PreviewStat
                    label="Silver / tola"
                    value={
                      snapshot.market.silverPerTolaNpr != null
                        ? formatReportNpr(snapshot.market.silverPerTolaNpr)
                        : "Price Unavailable"
                    }
                    accent="silver"
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500">
                  Status: {snapshot.market.statusLabel} · Published {snapshot.market.publishedDate ?? "—"}
                  {snapshot.market.publishedTimeLocal ? ` ${snapshot.market.publishedTimeLocal}` : ""} ·{" "}
                  <a
                    href={snapshot.market.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-emerald-700 underline"
                  >
                    {snapshot.market.sourceUrl}
                  </a>
                </p>

                <h4 className="mb-2 mt-4 text-xs font-black uppercase tracking-wide text-slate-600">
                  Portfolio Allocation
                </h4>
                <AllocationPreview snapshot={snapshot} />
              </section>
            ) : null}

            {showGold && (sections.holdings || sections.performance || sections.summary) ? (
              <MetalPreviewBlock title="Gold Investment Summary" accent="gold" metal={snapshot.gold} showHoldings={sections.holdings} />
            ) : null}
            {showSilver && (sections.holdings || sections.performance || sections.summary) ? (
              <MetalPreviewBlock
                title="Silver Investment Summary"
                accent="silver"
                metal={snapshot.silver}
                showHoldings={sections.holdings}
              />
            ) : null}

            {sections.purchases ? (
              <TxnPreview title="Purchase History" rows={snapshot.purchases} showRealized={false} />
            ) : null}
            {sections.sales ? (
              <TxnPreview title="Sales and Transaction History" rows={snapshot.sales} showRealized />
            ) : null}

            {sections.performance ? (
              <section className="mb-4">
                <h3 className="mb-2 border-l-4 border-emerald-700 pl-2 text-sm font-black text-emerald-900">
                  Investment Performance
                </h3>
                <ul className="space-y-1 text-[12px] text-slate-800">
                  <li>Overall ROI: <strong>{formatReportPct(snapshot.summary.roiPct)}</strong></li>
                  <li>Overall CAGR: <strong>{snapshot.summary.cagrLabel}</strong></li>
                  <li>Gold CAGR: <strong>{snapshot.gold.cagrLabel}</strong></li>
                  <li>Silver CAGR: <strong>{snapshot.silver.cagrLabel}</strong></li>
                </ul>
              </section>
            ) : null}

            <footer className="mt-4 border-t border-slate-200 pt-3 text-[10px] leading-relaxed text-slate-500">
              <p className="font-semibold text-slate-700">
                Generated by FIRE Nepal · www.firenepal.com · Confidential — Personal Financial Statement
              </p>
              <p className="mt-1">
                This report is generated from user-provided investment records and available market prices. Market
                valuations may fluctuate. Historical and annualized returns do not guarantee future performance. This
                report is for personal financial planning and informational purposes.
              </p>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}

function PreviewStat({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string;
  accent?: "gold" | "silver";
  tone?: number | null;
}) {
  const color =
    accent === "gold"
      ? "text-amber-800"
      : accent === "silver"
        ? "text-slate-700"
        : tone != null && tone > 0
          ? "text-emerald-700"
          : tone != null && tone < 0
            ? "text-rose-700"
            : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
      <p className="text-[9px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-[12px] font-black tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function AllocationPreview({ snapshot }: { snapshot: MetalsReportSnapshot }) {
  const { allocation } = snapshot;
  const total = allocation.totalValueNpr;
  const goldDeg = total > 0 ? (allocation.goldPct / 100) * 360 : 0;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className="relative h-24 w-24 shrink-0 rounded-full"
        style={{
          background:
            total > 0
              ? `conic-gradient(#B88619 0deg ${goldDeg}deg, #64748B ${goldDeg}deg 360deg)`
              : "#E2E8F0",
        }}
        aria-hidden
      >
        <div className="absolute inset-4 grid place-items-center rounded-full bg-white text-[10px] font-black text-slate-700">
          Metals
        </div>
      </div>
      <ul className="space-y-1 text-[12px]">
        <li className="font-semibold text-amber-900">
          Gold {formatReportPct(allocation.goldPct, 1, false)} · {formatReportNpr(allocation.goldValueNpr)}
        </li>
        <li className="font-semibold text-slate-700">
          Silver {formatReportPct(allocation.silverPct, 1, false)} · {formatReportNpr(allocation.silverValueNpr)}
        </li>
        <li className="text-slate-500">Total {formatReportNpr(allocation.totalValueNpr)}</li>
      </ul>
    </div>
  );
}

function MetalPreviewBlock({
  title,
  accent,
  metal,
  showHoldings,
}: {
  title: string;
  accent: "gold" | "silver";
  metal: MetalsReportSnapshot["gold"];
  showHoldings: boolean;
}) {
  const border = accent === "gold" ? "border-amber-500" : "border-slate-400";
  return (
    <section className="mb-5">
      <h3 className={`mb-2 border-l-4 pl-2 text-sm font-black text-slate-900 ${border}`}>{title}</h3>
      <p className="mb-2 text-[12px] text-slate-700">
        {metal.grams.toFixed(2)} g · {metal.tola.toFixed(4)} tola · Cost {formatReportNpr(metal.purchaseCostNpr)} ·
        Value {formatReportNpr(metal.currentValueNpr)} · P/L {formatReportNpr(metal.profitLossNpr, true)} · ROI{" "}
        {formatReportPct(metal.roiPct)} · CAGR {metal.cagrLabel} · Held {metal.holdingDurationLabel}
      </p>
      {showHoldings ? (
        metal.holdings.length === 0 ? (
          <p className="text-[11px] text-slate-500">No individual holdings.</p>
        ) : (
          <div className="space-y-2">
            {metal.holdings.map((h) => (
              <div key={h.id} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px]">
                <p className="font-black text-slate-900">{h.name}</p>
                <p className="text-slate-600">
                  {h.purchaseDate ?? "—"} · {h.grams.toFixed(2)} g · Basis {formatReportNpr(h.costBasisNpr)} · Mark{" "}
                  {formatReportNpr(h.currentValueNpr)} · P/L {formatReportNpr(h.profitLossNpr, true)} · ROI{" "}
                  {formatReportPct(h.roiPct)} · CAGR {h.cagrLabel}
                </p>
              </div>
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}

function TxnPreview({
  title,
  rows,
  showRealized,
}: {
  title: string;
  rows: MetalsReportSnapshot["purchases"];
  showRealized: boolean;
}) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 border-l-4 border-emerald-700 pl-2 text-sm font-black text-emerald-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-[11px] text-slate-500">No transactions.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-[10px]">
            <thead>
              <tr className="bg-emerald-800 text-white">
                <th className="px-2 py-1.5 font-bold">Date</th>
                <th className="px-2 py-1.5 font-bold">Item</th>
                <th className="px-2 py-1.5 font-bold">Type</th>
                <th className="px-2 py-1.5 font-bold">Qty g</th>
                <th className="px-2 py-1.5 font-bold">Total</th>
                {showRealized ? <th className="px-2 py-1.5 font-bold">Realized</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 odd:bg-slate-50">
                  <td className="px-2 py-1.5 tabular-nums">{r.tradeDate}</td>
                  <td className="px-2 py-1.5">{r.itemName}</td>
                  <td className="px-2 py-1.5 capitalize">
                    {r.metal} {r.txType}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">{r.quantityGrams.toFixed(2)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{formatReportNpr(r.totalAmountNpr)}</td>
                  {showRealized ? (
                    <td className="px-2 py-1.5 tabular-nums">{formatReportNpr(r.realizedProfitNpr, true)}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
