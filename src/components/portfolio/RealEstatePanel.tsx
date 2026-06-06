"use client";

import { Building2, Camera, ExternalLink, ImageIcon, MapPin, Plus, Target, Trash2 } from "lucide-react";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { AutoFitSingleLine } from "@/components/portfolio/AutoFitSingleLine";
import { NumericMoneyInput } from "@/components/NumericMoneyInput";
import { CurrencySelect } from "@/components/portfolio/CurrencySelect";
import { PortfolioDateMeta } from "@/components/portfolio/PortfolioDateMeta";
import { PortfolioIsoDateField } from "@/components/portfolio/PortfolioIsoDateField";
import { ModuleLedgerCard } from "@/components/portfolio/ledger-ui/ModuleLedgerCard";
import { recordRealEstateBuyProperty, recordRealEstateSellProperty } from "@/components/portfolio/portfolio-ledger";
import {
  REAL_ESTATE_INFLATION_PROXY_PCT,
  reAppreciationTargetProjection,
  reHoldingYrMo,
  reImpliedAnnualGrowthPct,
  reProfitAmount,
  reRoiPct,
  type ReAppreciationTargetProjection,
} from "@/components/portfolio/real-estate-metrics";
import { reAiWealthInsightsBundle } from "@/components/portfolio/re-ai-wealth-insights";
import { RealEstateAiInsightsEngine } from "@/components/portfolio/RealEstateAiInsightsEngine";
import {
  PortfolioTransactionStrip,
  portfolioTxnTodayIso,
  type TxnSegmentDef,
} from "@/components/portfolio/transaction-ui/PortfolioTransactionStrip";
import type { RealEstateKind, RealEstateRow, PortfolioLedgerEntry, WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { PortfolioModuleDataResetButton } from "@/components/fire-nepal/PortfolioModuleDataResetButton";
import { parsePurchaseIso } from "@/components/portfolio/holding-stats";
import { sanitizeGoogleMapsUrl } from "@/components/portfolio/real-estate-maps-url";
import { compressImageFileToJpegDataUrl } from "@/components/portfolio/real-estate-photo-utils";
import { amountToNpr } from "@/lib/portfolio-convert";
import { formatMoney } from "@/lib/expense-utils";

const RE_TX_SEGMENTS: TxnSegmentDef[] = [
  { id: "buy", label: "Buy property", tone: "in" },
  { id: "sell", label: "Sell property", tone: "out" },
];

/** Consistent grouping for NPR/KRW/USD; USD keeps up to 2 decimal places. */
function formatReCcy(n: number | undefined, ccy: string): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const code = String(ccy).toUpperCase();
  const maxFrac = code === "USD" ? 2 : 0;
  return `${n.toLocaleString("en-US", { maximumFractionDigits: maxFrac, minimumFractionDigits: 0 })} ${code}`;
}

function formatReSignedCcy(signed: number, ccy: string): string {
  if (!Number.isFinite(signed)) return "—";
  const body = formatReCcy(Math.abs(signed), ccy);
  if (body === "—") return "—";
  const sign = signed >= 0 ? "+" : "−";
  return `${sign}${body}`;
}

/** Equal-height KPI tile: label, vertically centered auto-fit value, reserved footer band. */
function ReMetricKpiCard({
  label,
  labelClassName,
  shellClassName,
  valueText,
  valueClassName,
  maxRem,
  minRem,
  footer,
}: {
  label: string;
  labelClassName: string;
  shellClassName: string;
  valueText: string;
  valueClassName: string;
  maxRem: number;
  minRem: number;
  footer: ReactNode;
}) {
  return (
    <div
      className={`flex h-full min-h-[6.875rem] min-w-0 flex-col rounded-2xl border px-3 py-2.5 shadow-inner sm:min-h-[7.25rem] sm:px-3.5 sm:py-3 ${shellClassName}`}
    >
      <p className={`shrink-0 text-[10px] font-black uppercase leading-tight tracking-[0.06em] ${labelClassName}`}>{label}</p>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center py-1 sm:py-1.5">
        <AutoFitSingleLine text={valueText} maxRem={maxRem} minRem={minRem} className={valueClassName} />
      </div>
      <div className="mt-auto flex min-h-[2.625rem] w-full min-w-0 shrink-0 flex-col justify-end gap-0.5 text-[10px] leading-snug [&_p]:min-w-0 [&_p]:max-w-full [&_p]:break-words">
        {footer}
      </div>
    </div>
  );
}

function ReProjectedSellingTargetCard({
  row,
  proj,
  krwPerNpr,
  usdPerNpr,
}: {
  row: RealEstateRow;
  proj: ReAppreciationTargetProjection;
  krwPerNpr: number;
  usdPerNpr: number;
}) {
  const fvNpr = amountToNpr(proj.targetFutureValue, row.currency, krwPerNpr, usdPerNpr);
  const profitNpr = amountToNpr(proj.futureProfitVsPurchase, row.currency, krwPerNpr, usdPerNpr);
  const y = proj.fractionalYearsHeld;
  const yearsLabel = y >= 10 ? y.toFixed(1) : y.toFixed(2);
  const pct = proj.targetCompoundAnnualPct;
  const implied = proj.impliedCagrFromMarketPct;
  const delta = implied != null ? implied - pct : null;

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-950/35 via-black/45 to-slate-950/55 p-3 shadow-inner shadow-black/35 ring-1 ring-cyan-400/10 backdrop-blur-md sm:p-3.5">
      <div className="mb-2 flex flex-wrap items-start gap-2.5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-500/25 to-teal-600/15 text-cyan-100 ring-1 ring-cyan-400/25">
          <Target size={18} strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-black uppercase tracking-[0.08em] text-cyan-100/95 sm:text-sm">
            Projected Selling Target
          </h3>
          <p className="mt-0.5 text-[10px] font-semibold leading-snug text-emerald-200/55">
            Time-adjusted compound projection from acquired date to today
          </p>
        </div>
      </div>
      <p className="min-w-0 text-[11px] font-semibold leading-relaxed text-emerald-100/90 sm:text-xs">
        To achieve{" "}
        <span className="font-black text-cyan-200 tabular-nums">{pct.toFixed(1)}%</span> annual appreciation over{" "}
        <span className="font-black text-cyan-200 tabular-nums">{yearsLabel}</span> years held, estimated property value
        should reach
      </p>
      <div className="mt-2.5 min-w-0">
        <AutoFitSingleLine
          text={formatReCcy(proj.targetFutureValue, row.currency)}
          maxRem={1.5}
          minRem={0.5}
          className="text-cyan-50"
        />
      </div>
      {row.currency !== "NPR" && fvNpr > 0 ? (
        <p className="mt-1 min-w-0 break-words text-[10px] font-bold leading-snug text-emerald-200/55">
          ≈ {formatMoney(fvNpr, "NPR")}
        </p>
      ) : null}
      <p className="mt-2 text-[10px] font-medium italic leading-snug text-emerald-200/45">
        Suggested selling target (compound model at this horizon) — illustrative only; excludes fees, taxes, and market
        timing.
      </p>
      <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 border-t border-cyan-400/15 pt-3 sm:grid-cols-3 sm:gap-2.5">
        <div className="min-w-0 rounded-xl border border-white/[0.08] bg-black/35 px-2.5 py-2 shadow-inner">
          <p className="text-[9px] font-black uppercase tracking-wide text-emerald-200/55">Future profit vs purchase</p>
          <div className="mt-1 min-w-0">
            <AutoFitSingleLine
              text={formatReSignedCcy(proj.futureProfitVsPurchase, row.currency)}
              maxRem={1.0625}
              minRem={0.4375}
              className={proj.futureProfitVsPurchase >= 0 ? "text-lime-200" : "text-rose-300"}
            />
          </div>
          {row.currency !== "NPR" && profitNpr !== 0 ? (
            <p className="mt-1 break-words text-[9px] font-bold text-emerald-200/45">≈ {formatMoney(profitNpr, "NPR")}</p>
          ) : null}
        </div>
        <div className="min-w-0 rounded-xl border border-white/[0.08] bg-black/35 px-2.5 py-2 shadow-inner">
          <p className="text-[9px] font-black uppercase tracking-wide text-emerald-200/55">Target path CAGR</p>
          <p className="mt-1 text-base font-black tabular-nums text-cyan-100 sm:text-lg">{pct.toFixed(1)}%</p>
          <p className="mt-1 text-[9px] font-semibold text-emerald-200/45">Matches your entered annual %</p>
        </div>
        <div className="min-w-0 rounded-xl border border-white/[0.08] bg-black/35 px-2.5 py-2 shadow-inner">
          <p className="text-[9px] font-black uppercase tracking-wide text-emerald-200/55">vs market-implied CAGR</p>
          {implied != null ? (
            <>
              <p className="mt-1 text-base font-black tabular-nums text-amber-100 sm:text-lg">{implied.toFixed(1)}%</p>
              <p className="mt-1 text-[9px] font-semibold leading-snug text-emerald-200/50">
                {delta != null && delta >= 0.05
                  ? `${delta.toFixed(1)} pts above target path`
                  : delta != null && delta <= -0.05
                    ? `${Math.abs(delta).toFixed(1)} pts below target path`
                    : "Roughly aligned with target path"}
              </p>
            </>
          ) : (
            <p className="mt-1 text-[10px] font-semibold leading-snug text-emerald-200/45">
              Add est. current value to compare implied CAGR to your {pct.toFixed(1)}% target.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ReProjectedSellingTargetPlaceholder({ annualPct }: { annualPct: number }) {
  return (
    <div className="min-w-0 rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-950/30 via-black/40 to-slate-950/50 p-3 shadow-inner shadow-black/30 ring-1 ring-amber-400/10 backdrop-blur-md sm:p-3.5">
      <div className="mb-1.5 flex items-center gap-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/30">
          <Target size={16} strokeWidth={2.25} />
        </div>
        <h3 className="text-xs font-black uppercase tracking-[0.08em] text-amber-100/90 sm:text-sm">
          Projected Selling Target
        </h3>
      </div>
      <p className="text-[11px] font-semibold leading-relaxed text-emerald-100/85 sm:text-xs">
        You entered{" "}
        <span className="font-black tabular-nums text-amber-200">{annualPct.toFixed(1)}%</span> annual appreciation.
        Set a <span className="text-emerald-100">positive purchase value</span> and a valid{" "}
        <span className="text-emerald-100">acquired date</span> (on or before today) to unlock the compound projection and
        selling target.
      </p>
    </div>
  );
}

function RealEstateTxnStrip({
  row,
  onMutate,
}: {
  row: RealEstateRow;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [segmentId, setSegmentId] = useState("buy");
  const [amtStr, setAmtStr] = useState("");
  const [feesStr, setFeesStr] = useState("");
  const [notes, setNotes] = useState("");
  const [tradeDate, setTradeDate] = useState(portfolioTxnTodayIso);
  const [err, setErr] = useState<string | null>(null);

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setErr(null);
      setTradeDate(portfolioTxnTodayIso());
    }
    setOpen(v);
  };

  const handleSegmentId = (id: string) => {
    setSegmentId(id);
    if (open) {
      setErr(null);
      setTradeDate(portfolioTxnTodayIso());
    }
  };

  const submit = () => {
    setErr(null);
    const amount = Number(amtStr.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setErr("Enter a valid amount.");
      return;
    }
    const fees = feesStr.trim() === "" ? undefined : Number(feesStr.replace(/,/g, ""));
    if (fees != null && (!Number.isFinite(fees) || fees < 0)) {
      setErr("Fees must be non-negative.");
      return;
    }
    const payload = { amount, tradeDate, fees, notes: notes.trim() || undefined };
    const ok =
      segmentId === "buy"
        ? onMutate((s) => recordRealEstateBuyProperty(s, row.id, payload))
        : onMutate((s) => recordRealEstateSellProperty(s, row.id, payload));
    if (!ok) {
      setErr(
        segmentId === "sell"
          ? "Sell amount exceeds purchase/estimate or invalid date."
          : "Could not record transaction.",
      );
      return;
    }
    setAmtStr("");
    setFeesStr("");
    setNotes("");
  };

  return (
    <PortfolioTransactionStrip
      open={open}
      onOpenChange={handleOpenChange}
      headerLabel="Transactions"
      summaryRight={`${row.currency}`}
      segments={RE_TX_SEGMENTS}
      segmentId={segmentId}
      onSegmentId={handleSegmentId}
      innerPanelClassName="mt-2 space-y-2 rounded-xl border border-teal-400/20 bg-gradient-to-br from-slate-950/75 via-black/45 to-teal-950/25 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md sm:p-3"
      tradeDate={tradeDate}
      onTradeDate={setTradeDate}
      feesLabel={`Fees (${row.currency})`}
      feesStr={feesStr}
      onFeesStrChange={setFeesStr}
      notes={notes}
      onNotesChange={setNotes}
      error={err}
      submitLabel={segmentId === "buy" ? "Record buy property" : "Record sell property"}
      onSubmit={submit}
      accent="teal"
    >
      <label className="block min-w-0">
        <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">
          Capital amount ({row.currency})
        </span>
        <input
          value={amtStr}
          onChange={(e) => setAmtStr(e.target.value)}
          inputMode="decimal"
          className="wealth-input-text min-w-0 w-full overflow-x-auto px-2 py-1.5 text-right text-xs font-bold tabular-nums [scrollbar-width:thin]"
          placeholder="Added to purchase & estimate on buy; deducted on sell"
        />
      </label>
    </PortfolioTransactionStrip>
  );
}

const TYPES: { value: RealEstateKind; label: string }[] = [
  { value: "land", label: "Land" },
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "commercial", label: "Commercial" },
];

function realEstateTypeLabel(kind: RealEstateKind): string {
  return TYPES.find((t) => t.value === kind)?.label ?? kind;
}

function RealEstatePropertyHero({
  row,
  krwPerNpr,
  usdPerNpr,
  onChange,
}: {
  row: RealEstateRow;
  krwPerNpr: number;
  usdPerNpr: number;
  onChange: (id: string, patch: Partial<RealEstateRow>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const roiPct = reRoiPct(row.purchaseValue, row.estimatedValue);
  const holding = reHoldingYrMo(row.acquiredDate);
  const estNpr =
    row.estimatedValue != null && row.estimatedValue > 0
      ? amountToNpr(row.estimatedValue, row.currency, krwPerNpr, usdPerNpr)
      : null;
  const roiText = roiPct == null ? "—" : `${roiPct >= 0 ? "+" : ""}${roiPct.toFixed(1)}%`;
  const holdingText =
    holding != null ? `${holding.years}y ${holding.months}m` : row.acquiredDate ? "—" : "Add acquired date";
  const photo = row.propertyPhoto?.trim();
  const locationStr = row.location?.trim() ?? "";
  const safeMapsUrl = sanitizeGoogleMapsUrl(row.mapsUrl);
  const mapsHeroLabel = locationStr || row.name.trim() || "Pinned place";

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const dataUrl = await compressImageFileToJpegDataUrl(f);
    if (!dataUrl) {
      toast.error("Could not use this image. Try a smaller JPG or PNG.");
      return;
    }
    onChange(row.id, { propertyPhoto: dataUrl });
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-teal-400/20 bg-gradient-to-br from-black/40 via-teal-950/20 to-slate-950/40 p-3 ring-1 ring-white/[0.04] sm:flex-row sm:items-stretch sm:gap-4">
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl border border-teal-400/25 bg-gradient-to-br from-teal-900/40 to-slate-950 sm:aspect-auto sm:w-[38%] sm:min-h-[148px] sm:max-w-md">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-provided https URLs + inline JPEG data URLs
          <img
            src={photo}
            alt={row.name.trim() ? `${row.name.trim()} — cover` : "Property cover"}
            className="h-full min-h-[9rem] w-full object-cover sm:min-h-[148px]"
          />
        ) : (
          <div className="flex h-full min-h-[9rem] flex-col items-center justify-center gap-2 p-4 text-center sm:min-h-[148px]">
            <ImageIcon size={32} className="text-teal-300/40" />
            <p className="text-[11px] font-bold text-emerald-200/50">No cover photo yet</p>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-teal-400/30 bg-teal-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-teal-100">
            {realEstateTypeLabel(row.propertyType)}
          </span>
        </div>
        <h3 className="truncate text-lg font-black tracking-tight text-emerald-50 sm:text-xl">
          {row.name.trim() || "Untitled property"}
        </h3>
        {safeMapsUrl ? (
          <div className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-teal-400/25 bg-gradient-to-r from-teal-950/40 via-black/30 to-slate-950/35 px-3 py-2.5 shadow-inner ring-1 ring-teal-400/10 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-2.5">
            <p className="min-w-0 text-sm font-bold leading-snug text-teal-50 sm:text-[0.9375rem]">
              <span aria-hidden="true" className="mr-1.5 inline-block shrink-0">
                📍
              </span>
              <span className="break-words">{mapsHeroLabel}</span>
            </p>
            <a
              href={safeMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 self-start rounded-full border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-cyan-50 shadow-sm transition hover:border-cyan-300/55 hover:bg-cyan-500/25 sm:min-h-0 sm:self-auto sm:py-1.5 sm:text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              Open in Google Maps
            </a>
          </div>
        ) : null}
        <p className="text-xs font-semibold leading-relaxed text-emerald-200/70">
          {!safeMapsUrl && locationStr ? (
            <>
              <span className="inline-flex max-w-full items-start gap-1 align-middle font-bold text-teal-100/95">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400/85" aria-hidden />
                <span className="min-w-0 break-words">{locationStr}</span>
              </span>
              <span className="text-emerald-200/50"> · </span>
            </>
          ) : null}
          Est. value{" "}
          <span className="font-black text-emerald-100">{formatReCcy(row.estimatedValue, row.currency)}</span>
          {estNpr != null ? (
            <span className="font-bold text-emerald-200/55"> · ≈ {formatMoney(estNpr, "NPR")}</span>
          ) : null}
          <span className="text-emerald-200/55"> · ROI </span>
          <span
            className={`font-black tabular-nums ${
              roiPct != null && roiPct >= 0 ? "text-lime-200" : roiPct != null ? "text-rose-300" : "text-emerald-200/50"
            }`}
          >
            {roiText}
          </span>
          <span className="text-emerald-200/55"> · Held </span>
          <span className="font-black text-violet-200 tabular-nums">{holdingText}</span>
        </p>
        <div className="mt-auto flex flex-col gap-2 border-t border-teal-400/10 pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onFile} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-teal-400/35 bg-teal-500/15 px-3 py-1.5 text-[11px] font-black text-teal-100 transition hover:bg-teal-500/25"
          >
            <Camera size={14} /> Upload
          </button>
          {photo ? (
            <button
              type="button"
              onClick={() => onChange(row.id, { propertyPhoto: undefined })}
              className="text-[11px] font-bold text-rose-300/80 hover:text-rose-200"
            >
              Remove photo
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function RealEstatePanel({
  rows,
  ledger,
  krwPerNpr,
  usdPerNpr,
  onMutate,
  onChange,
  onAdd,
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
  return (
    <section className="wealth-glass relative overflow-hidden rounded-[1.35rem] p-3.5 sm:rounded-[1.5rem] sm:p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(45,212,191,0.09),transparent_48%),radial-gradient(ellipse_at_100%_30%,rgba(20,184,166,0.07),transparent_52%)]" />
      <div className="relative">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-500/30 to-emerald-600/20 text-teal-100 ring-1 ring-teal-400/25">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-emerald-50 sm:text-lg">Real estate</h2>
              <p className="text-xs font-bold leading-snug text-emerald-200/65 sm:text-sm">
                Property wealth tracker · ROI, profit, holding duration & insights
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <PortfolioModuleDataResetButton module="real_estate" onMutate={onMutate} />
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-teal-400/30 bg-teal-500/15 px-2.5 py-1 text-[11px] font-black text-teal-100 transition hover:bg-teal-500/25 sm:text-xs"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {rows.map((row) => {
            const costNpr =
              row.purchaseValue != null && row.purchaseValue > 0
                ? amountToNpr(row.purchaseValue, row.currency, krwPerNpr, usdPerNpr)
                : undefined;
            const estNpr =
              row.estimatedValue != null && row.estimatedValue > 0
                ? amountToNpr(row.estimatedValue, row.currency, krwPerNpr, usdPerNpr)
                : undefined;
            const roiPct = reRoiPct(row.purchaseValue, row.estimatedValue);
            const profit = reProfitAmount(row.purchaseValue, row.estimatedValue);
            const profitNpr =
              profit != null && row.purchaseValue != null && row.purchaseValue > 0
                ? amountToNpr(profit, row.currency, krwPerNpr, usdPerNpr)
                : null;
            const holding = reHoldingYrMo(row.acquiredDate);
            const impliedAnnual = reImpliedAnnualGrowthPct(row.purchaseValue, row.estimatedValue, row.acquiredDate);
            const missingAcquiredDate = !String(row.acquiredDate ?? "").trim();
            const aiInsightBundle = reAiWealthInsightsBundle(row);
            const roiTone =
              roiPct == null ? "text-emerald-200/50" : roiPct >= 0 ? "text-lime-300" : "text-rose-300";
            const roiText = roiPct == null ? "—" : `${roiPct >= 0 ? "+" : ""}${roiPct.toFixed(1)}%`;
            const profitText = profit == null ? "—" : formatReSignedCcy(profit, row.currency);
            const impliedText =
              impliedAnnual != null
                ? `${impliedAnnual.toFixed(1)}%`
                : missingAcquiredDate
                  ? "Enter acquired date to calculate CAGR"
                  : "—";
            const impliedValueClass =
              impliedAnnual != null
                ? "text-amber-100"
                : missingAcquiredDate
                  ? "text-emerald-200/55 font-semibold"
                  : "text-emerald-200/50";
            const holdingText =
              holding != null
                ? `${holding.years}y ${holding.months}m`
                : missingAcquiredDate
                  ? "Add acquired date"
                  : "—";
            const holdingValueClass =
              holding != null
                ? "text-violet-100"
                : missingAcquiredDate
                  ? "text-emerald-200/55 font-semibold"
                  : "text-emerald-200/50";
            const appreciationProjection = reAppreciationTargetProjection(row);
            const hasAnnualPct =
              typeof row.annualAppreciationEstimatePct === "number" &&
              Number.isFinite(row.annualAppreciationEstimatePct);
            const showHeldDateMeta = parsePurchaseIso(row.acquiredDate) != null;

            return (
              <div
                key={row.id}
                className="wealth-row-card min-w-0 space-y-3 rounded-2xl border border-teal-400/15 bg-gradient-to-br from-teal-950/35 via-black/40 to-slate-950/50 p-2.5 shadow-lg shadow-black/35 ring-1 ring-white/[0.04] backdrop-blur-md sm:p-3"
              >
                <RealEstatePropertyHero
                  key={row.id}
                  row={row}
                  krwPerNpr={krwPerNpr}
                  usdPerNpr={usdPerNpr}
                  onChange={onChange}
                />
                <div className="space-y-2">
                  <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
                    <label className="min-w-0 sm:col-span-1 lg:col-span-2">
                      <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                        Type
                      </span>
                      <select
                        value={row.propertyType}
                        onChange={(e) => onChange(row.id, { propertyType: e.target.value as RealEstateKind })}
                        className="wealth-input min-w-0 w-full px-2 py-2 text-xs font-black sm:text-sm"
                      >
                        {TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="min-w-0 sm:col-span-1 lg:col-span-2">
                      <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                        Label
                      </span>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => onChange(row.id, { name: e.target.value })}
                        placeholder="Property name"
                        className="wealth-input-text min-w-0 w-full overflow-x-auto px-2.5 py-2 text-xs sm:text-sm"
                      />
                    </label>
                    <PortfolioIsoDateField
                      label="Acquired date"
                      value={row.acquiredDate}
                      onChange={(next) => onChange(row.id, { acquiredDate: next })}
                      className="min-w-0 w-full sm:col-span-2 lg:col-span-2"
                    />
                    <label className="min-w-0 sm:col-span-2 lg:col-span-6">
                      <span className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                        <MapPin className="h-3 w-3 shrink-0 text-teal-400/80" aria-hidden />
                        Location
                      </span>
                      <input
                        type="text"
                        value={row.location ?? ""}
                        onChange={(e) => onChange(row.id, { location: e.target.value })}
                        placeholder="e.g. Budhanilkantha, Kathmandu"
                        autoComplete="street-address"
                        className="wealth-input-text min-w-0 w-full overflow-x-auto px-2.5 py-2 text-xs sm:text-sm"
                      />
                    </label>
                  </div>
                  {/* Full-width row so purchase / estimate share the row (not squeezed into lg:col-span-2). */}
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-2.5 sm:gap-y-2 lg:flex-wrap lg:gap-x-3">
                    <div className="min-w-0 w-full sm:flex-1 sm:basis-[calc(50%-0.3125rem)] lg:basis-0 lg:min-w-[11rem]">
                      <NumericMoneyInput tone="dark"
                        label="Purchase value"
                        value={row.purchaseValue}
                        onChange={(n) => onChange(row.id, { purchaseValue: n })}
                        variant="amount"
                        placeholder="0"
                        formatThousandsWhileTyping
                        autoScaleFont
                        className="w-full min-w-0 [&>span]:mb-0.5 [&>span]:block [&>span]:text-[10px] [&>span]:font-bold [&>span]:uppercase [&>span]:tracking-wide [&>span]:text-zinc-200"
                        wrapperClassName="min-w-0 w-full rounded-xl border border-teal-400/20 bg-black/35 px-2.5 py-2 focus-within:border-teal-400/45 focus-within:ring-2 focus-within:ring-teal-500/20"
                        inputClassName="min-w-0 bg-transparent text-right text-xs font-bold tabular-nums text-emerald-50 outline-none sm:text-sm"
                      />
                    </div>
                    <div className="min-w-0 w-full sm:flex-1 sm:basis-[calc(50%-0.3125rem)] lg:basis-0 lg:min-w-[11rem]">
                      <NumericMoneyInput tone="dark"
                        label="Est. current value"
                        value={row.estimatedValue}
                        onChange={(n) => onChange(row.id, { estimatedValue: n })}
                        variant="amount"
                        placeholder="0"
                        formatThousandsWhileTyping
                        autoScaleFont
                        className="w-full min-w-0 [&>span]:mb-0.5 [&>span]:block [&>span]:text-[10px] [&>span]:font-bold [&>span]:uppercase [&>span]:tracking-wide [&>span]:text-zinc-200"
                        wrapperClassName="min-w-0 w-full rounded-xl border border-teal-400/20 bg-black/35 px-2.5 py-2 focus-within:border-teal-400/45 focus-within:ring-2 focus-within:ring-teal-500/20"
                        inputClassName="min-w-0 bg-transparent text-right text-xs font-bold tabular-nums text-emerald-50 outline-none sm:text-sm"
                      />
                    </div>
                    <div className="flex min-w-0 w-full items-end gap-2 sm:w-auto sm:shrink-0 sm:gap-2">
                      <label className="min-w-0 w-full shrink-0 sm:w-[5.75rem]">
                        <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                          CCY
                        </span>
                        <CurrencySelect
                          value={row.currency}
                          onChange={(c) => onChange(row.id, { currency: c })}
                          className="w-full min-w-[4.5rem]"
                        />
                      </label>
                      <div className="ml-auto flex shrink-0 items-end sm:ml-0">
                        <button
                          type="button"
                          aria-label="Remove"
                          onClick={() => onRemove(row.id)}
                          className="rounded-xl p-2 text-emerald-300/40 transition hover:bg-rose-500/15 hover:text-rose-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <label className="mt-0.5 block min-w-0">
                  <span className="mb-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                    <ExternalLink className="h-3 w-3 shrink-0 text-teal-400/75" aria-hidden />
                    Google Maps link
                  </span>
                  <input
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    value={row.mapsUrl ?? ""}
                    onChange={(e) => onChange(row.id, { mapsUrl: e.target.value })}
                    placeholder="https://maps.google.com/… or https://www.google.com/maps/…"
                    className="wealth-input-text min-w-0 w-full overflow-x-auto px-2.5 py-2 text-xs sm:text-sm"
                  />
                  <p className="mt-1 text-[10px] font-medium leading-snug text-emerald-200/45">
                    Saved only if it is a valid https Google Maps URL (opens in a new tab from the hero).
                  </p>
                </label>

                <div className="grid min-h-0 min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-4 lg:items-stretch lg:gap-2.5">
                  <ReMetricKpiCard
                    label="Property return"
                    labelClassName="text-lime-200/70"
                    shellClassName="border-lime-400/25 bg-gradient-to-br from-lime-950/40 to-black/40 shadow-inner shadow-black/40 ring-1 ring-lime-400/10"
                    valueText={roiText}
                    valueClassName={roiTone}
                    maxRem={2.125}
                    minRem={0.5}
                    footer={<p className="font-semibold text-emerald-200/45">ROI vs purchase</p>}
                  />
                  <ReMetricKpiCard
                    label="Est. selling profit"
                    labelClassName="text-sky-200/65"
                    shellClassName="border-sky-400/20 bg-black/35 shadow-inner shadow-black/30"
                    valueText={profitText}
                    valueClassName={
                      profit == null ? "text-emerald-200/50" : profit >= 0 ? "text-lime-200" : "text-rose-300"
                    }
                    maxRem={1.6875}
                    minRem={0.4375}
                    footer={
                      profitNpr != null ? (
                        <p className="hyphens-auto font-bold text-emerald-200/50">≈ {formatMoney(profitNpr, "NPR")}</p>
                      ) : (
                        <p className="font-semibold text-emerald-200/40">Current − purchase</p>
                      )
                    }
                  />
                  <ReMetricKpiCard
                    label="Implied annual growth"
                    labelClassName="text-amber-200/65"
                    shellClassName="border-amber-400/20 bg-black/35 shadow-inner shadow-black/30"
                    valueText={impliedText}
                    valueClassName={impliedValueClass}
                    maxRem={1.6875}
                    minRem={0.4375}
                    footer={<p className="font-semibold text-emerald-200/45">From purchase → current & hold</p>}
                  />
                  <ReMetricKpiCard
                    label="Holding duration"
                    labelClassName="text-violet-200/65"
                    shellClassName="border-violet-400/20 bg-black/35 shadow-inner shadow-black/30"
                    valueText={holdingText}
                    valueClassName={holdingValueClass}
                    maxRem={1.6875}
                    minRem={0.4375}
                    footer={<p className="font-semibold text-emerald-200/45">Since acquired date</p>}
                  />
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-2 border-t border-teal-400/10 pt-2 sm:grid-cols-2 sm:items-stretch sm:gap-2.5 lg:grid-cols-3">
                  <div className="flex h-full min-h-[5.25rem] min-w-0 flex-col rounded-xl border border-emerald-400/15 bg-black/25 px-3 py-2 sm:min-h-[5.5rem]">
                    <p className="shrink-0 text-[10px] font-black uppercase leading-tight tracking-[0.06em] text-emerald-200/55">
                      Purchase (book)
                    </p>
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center py-0.5">
                      <AutoFitSingleLine
                        text={formatReCcy(row.purchaseValue, row.currency)}
                        maxRem={1.125}
                        minRem={0.4375}
                        className="text-emerald-50"
                      />
                    </div>
                    {costNpr != null ? (
                      <p className="mt-auto min-w-0 max-w-full hyphens-auto break-words text-[10px] font-bold leading-snug text-emerald-200/50">
                        ≈ {formatMoney(costNpr, "NPR")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex h-full min-h-[5.25rem] min-w-0 flex-col rounded-xl border border-emerald-400/15 bg-black/25 px-3 py-2 sm:min-h-[5.5rem]">
                    <p className="shrink-0 text-[10px] font-black uppercase leading-tight tracking-[0.06em] text-emerald-200/55">
                      Est. current value
                    </p>
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center py-0.5">
                      <AutoFitSingleLine
                        text={formatReCcy(row.estimatedValue, row.currency)}
                        maxRem={1.125}
                        minRem={0.4375}
                        className="text-emerald-50"
                      />
                    </div>
                    {estNpr != null ? (
                      <p className="mt-auto min-w-0 max-w-full hyphens-auto break-words text-[10px] font-bold leading-snug text-emerald-200/50">
                        ≈ {formatMoney(estNpr, "NPR")}
                      </p>
                    ) : null}
                  </div>
                  <label className="flex h-full min-h-[5.25rem] min-w-0 flex-col rounded-xl border border-teal-400/15 bg-black/25 px-3 py-2 sm:col-span-2 sm:min-h-[5.5rem] lg:col-span-1">
                    <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-teal-200/60">
                      Annual appreciation estimate (optional %)
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.annualAppreciationEstimatePct ?? ""}
                      onChange={(e) => {
                        const t = e.target.value.trim();
                        if (t === "") {
                          onChange(row.id, { annualAppreciationEstimatePct: undefined });
                          return;
                        }
                        const n = Number(t.replace(/,/g, ""));
                        if (!Number.isFinite(n)) {
                          onChange(row.id, { annualAppreciationEstimatePct: undefined });
                          return;
                        }
                        onChange(row.id, { annualAppreciationEstimatePct: Math.min(80, Math.max(0, n)) });
                      }}
                      placeholder={`e.g. ${REAL_ESTATE_INFLATION_PROXY_PCT}`}
                      className="wealth-input-text mt-1 min-w-0 w-full overflow-x-auto px-2 py-1.5 text-right text-xs font-bold tabular-nums [scrollbar-width:thin]"
                    />
                    <p className="mt-1 text-[10px] font-semibold text-emerald-200/45">
                      Compared to implied growth in Wealth insights
                    </p>
                  </label>
                </div>

                {hasAnnualPct ? (
                  appreciationProjection ? (
                    <ReProjectedSellingTargetCard
                      row={row}
                      proj={appreciationProjection}
                      krwPerNpr={krwPerNpr}
                      usdPerNpr={usdPerNpr}
                    />
                  ) : (
                    <ReProjectedSellingTargetPlaceholder annualPct={row.annualAppreciationEstimatePct ?? 0} />
                  )
                ) : null}

                {showHeldDateMeta ? (
                  <div className="flex min-w-0 flex-col gap-2 border-t border-teal-400/10 pt-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-4 sm:gap-y-2">
                    <PortfolioDateMeta dateIso={row.acquiredDate} basisNpr={costNpr} markNpr={estNpr} leadText="Held" />
                  </div>
                ) : null}

                <RealEstateAiInsightsEngine bundle={aiInsightBundle} />

                <RealEstateTxnStrip row={row} onMutate={onMutate} />
              </div>
            );
          })}
        </div>
        <ModuleLedgerCard
          bucket="real_estate"
          ledger={ledger}
          title="Real estate ledger"
          subtitle="Property purchases and sales for this module."
        />
      </div>
    </section>
  );
}
