"use client";

import { Gem, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  resolveMetalGramRatesForUi,
  resolveMetalTolaRatesForUi,
} from "@/components/portfolio/calculations";
import { PortfolioDateMeta } from "@/components/portfolio/PortfolioDateMeta";
import { ModuleLedgerCard } from "@/components/portfolio/ledger-ui/ModuleLedgerCard";
import { MetalHoldingPhotos } from "@/components/portfolio/MetalHoldingPhotos";
import {
  compressMetalImageFile,
  METAL_PHOTO_MAX_COUNT,
} from "@/components/portfolio/metal-photo-utils";
import { MetalsPremiumDashboard } from "@/components/portfolio/MetalsPremiumSections";
import { metalRowFirstBuyIso } from "@/components/portfolio/metals-premium-metrics";
import { recordMetalBuy, recordMetalSell } from "@/components/portfolio/portfolio-ledger";
import {
  PortfolioTransactionStrip,
  portfolioTxnTodayIso,
  type TxnSegmentDef,
} from "@/components/portfolio/transaction-ui/PortfolioTransactionStrip";
import type { MetalRow, PortfolioLedgerEntry, WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { formatMoney } from "@/lib/expense-utils";
import { NEPAL_METAL_TOLA_GRAMS } from "@/lib/market/bullion-estimate";
import { gramsToTolaUi, NEPAL_UI_GRAMS_PER_TOLA, tolaUiToGrams } from "@/lib/portfolio/nepal-metal-ui-convert";
import { toast } from "sonner";

function todayIso() {
  return portfolioTxnTodayIso();
}

const METAL_TX_SEGMENTS: TxnSegmentDef[] = [
  { id: "buy", label: "Buy", tone: "in" },
  { id: "sell", label: "Sell", tone: "out" },
];

function MetalTradeStrip({
  row,
  onMutate,
}: {
  row: MetalRow;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [segmentId, setSegmentId] = useState<string>("sell");
  const [qtyStr, setQtyStr] = useState("");
  const [qtyUnit, setQtyUnit] = useState<"gram" | "tola">("gram");
  const [buyPriceStr, setBuyPriceStr] = useState("");
  const [buyPriceUnit, setBuyPriceUnit] = useState<"gram" | "tola">("gram");
  const [sellPriceStr, setSellPriceStr] = useState("");
  const [sellPriceUnit, setSellPriceUnit] = useState<"gram" | "tola">("gram");
  const [feesStr, setFeesStr] = useState("");
  const [notes, setNotes] = useState("");
  const [tradeDate, setTradeDate] = useState(todayIso);
  const [err, setErr] = useState<string | null>(null);
  const buyPhotoInputId = useId();
  const buyPhotoRef = useRef<HTMLInputElement>(null);

  const held = row.grams ?? 0;
  const basis = row.totalCostBasisNpr;
  const avgPerG = held > 0 && basis != null && basis > 0 ? basis / held : null;

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setErr(null);
      setTradeDate(todayIso());
    });
  }, [open, segmentId, row.id]);

  const parseQtyGrams = (): number | null => {
    const raw = qtyStr.replace(/,/g, "").trim();
    if (raw === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (qtyUnit === "gram") return n;
    return Number(tolaUiToGrams(n).toFixed(6));
  };

  const parseSellUnitPriceNprPerGram = (): number | null => {
    const raw = sellPriceStr.replace(/,/g, "").trim();
    if (raw === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return null;
    if (sellPriceUnit === "gram") return n;
    return n / NEPAL_UI_GRAMS_PER_TOLA;
  };

  const parseBuyPriceNpr = (): number | null => {
    const raw = buyPriceStr.replace(/,/g, "").trim();
    if (raw === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  };

  const submit = async () => {
    setErr(null);
    const grams = parseQtyGrams();
    if (grams == null) {
      setErr(`Enter a valid quantity (${qtyUnit === "gram" ? "grams" : "tola"}).`);
      return;
    }
    if (segmentId === "sell" && grams > held + 1e-9) {
      setErr("Cannot sell more than you hold.");
      return;
    }
    const feesNpr = feesStr.trim() === "" ? undefined : Number(feesStr.replace(/,/g, ""));
    if (feesNpr != null && (!Number.isFinite(feesNpr) || feesNpr < 0)) {
      setErr("Fees must be non-negative NPR.");
      return;
    }

    if (segmentId === "sell") {
      const unitPriceNprPerGram = parseSellUnitPriceNprPerGram();
      if (unitPriceNprPerGram == null) {
        setErr(`Enter sell price (NPR per ${sellPriceUnit === "gram" ? "gram" : "tola"}).`);
        return;
      }
      const ok = onMutate((s) =>
        recordMetalSell(s, row.id, { grams, unitPriceNprPerGram, tradeDate, feesNpr, notes }),
      );
      if (!ok) {
        setErr("Could not record sell.");
        return;
      }
    } else {
      const buyPriceNpr = parseBuyPriceNpr();
      if (buyPriceNpr == null) {
        setErr(`Enter buy price (NPR per ${buyPriceUnit === "gram" ? "gram" : "tola"}).`);
        return;
      }

      let photoUrlsToAppend: string[] | undefined;
      const inputEl = buyPhotoRef.current;
      if (inputEl?.files?.length) {
        const files = Array.from(inputEl.files).filter((f) => f.type.startsWith("image/"));
        const existing = row.photoUrls?.length ?? 0;
        const room = Math.max(0, METAL_PHOTO_MAX_COUNT - existing);
        if (files.length > room && room === 0) {
          setErr(`Photo limit reached (${METAL_PHOTO_MAX_COUNT} per holding).`);
          return;
        }
        const urls: string[] = [];
        for (const f of files.slice(0, room)) {
          const dataUrl = await compressMetalImageFile(f);
          if (!dataUrl) {
            setErr(`Could not compress "${f.name}". Try a smaller image.`);
            return;
          }
          urls.push(dataUrl);
        }
        if (urls.length > 0) {
          photoUrlsToAppend = urls;
          toast.success(`Added ${urls.length} photo(s) with this buy.`);
        }
      }

      const ok = onMutate((s) =>
        recordMetalBuy(s, row.id, {
          grams,
          tradeDate,
          buyPriceNpr,
          buyPriceUnit,
          feesNpr,
          notes,
          photoUrlsToAppend,
        }),
      );
      if (!ok) {
        setErr("Could not record buy.");
        return;
      }
      if (inputEl) inputEl.value = "";
    }

    setQtyStr("");
    setBuyPriceStr("");
    setSellPriceStr("");
    setFeesStr("");
    setNotes("");
  };

  const previewBuyGrams = parseQtyGrams();
  const previewBuyPrice = parseBuyPriceNpr();
  const previewFees = feesStr.trim() === "" ? 0 : Number(feesStr.replace(/,/g, ""));
  let previewAddBasis: number | null = null;
  if (
    segmentId === "buy" &&
    previewBuyGrams != null &&
    previewBuyPrice != null &&
    Number.isFinite(previewFees) &&
    previewFees >= 0
  ) {
    const npg = buyPriceUnit === "tola" ? previewBuyPrice / NEPAL_UI_GRAMS_PER_TOLA : previewBuyPrice;
    if (Number.isFinite(npg) && npg >= 0) {
      previewAddBasis = previewBuyGrams * npg + previewFees;
    }
  }

  return (
    <PortfolioTransactionStrip
      open={open}
      onOpenChange={setOpen}
      headerLabel="Transactions"
      summaryRight={
        <>
          {held.toLocaleString()} g · basis {basis != null ? formatMoney(basis, "NPR") : "—"}
          {avgPerG != null ? ` · avg ${formatMoney(avgPerG, "NPR")}/g` : ""}
        </>
      }
      segments={METAL_TX_SEGMENTS}
      segmentId={segmentId}
      onSegmentId={setSegmentId}
      tradeDate={tradeDate}
      onTradeDate={setTradeDate}
      feesLabel="Fees (NPR)"
      feesStr={feesStr}
      onFeesStrChange={setFeesStr}
      notes={notes}
      onNotesChange={setNotes}
      error={err}
      submitLabel={segmentId === "sell" ? "Record sell" : "Record buy"}
      onSubmit={() => void submit()}
      accent="amber"
    >
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <span className="w-full text-[10px] font-bold uppercase text-emerald-200/55">Quantity unit</span>
          {(["gram", "tola"] as const).map((u) => {
            const active = qtyUnit === u;
            return (
              <button
                key={u}
                type="button"
                className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                  active
                    ? "border-amber-400/50 bg-amber-500/20 text-amber-100"
                    : "border-emerald-400/20 bg-black/30 text-emerald-200/70"
                }`}
                onClick={() => setQtyUnit(u)}
              >
                {u === "gram" ? "Grams" : "Tola (UI)"}
              </button>
            );
          })}
        </div>
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">
            {qtyUnit === "gram" ? "Quantity (grams)" : "Quantity (tola)"}
          </span>
          <input
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
            inputMode="decimal"
            className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold"
            placeholder="0"
          />
        </label>

        {segmentId === "sell" ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              <span className="w-full text-[10px] font-bold uppercase text-emerald-200/55">Sell price unit</span>
              {(["gram", "tola"] as const).map((u) => {
                const active = sellPriceUnit === u;
                return (
                  <button
                    key={u}
                    type="button"
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                      active
                        ? "border-rose-400/45 bg-rose-500/15 text-rose-100"
                        : "border-emerald-400/20 bg-black/30 text-emerald-200/70"
                    }`}
                    onClick={() => setSellPriceUnit(u)}
                  >
                    NPR / {u === "gram" ? "g" : "tola"}
                  </button>
                );
              })}
            </div>
            <label className="block">
              <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">
                Sell price ({sellPriceUnit === "gram" ? "NPR per gram" : "NPR per tola"})
              </span>
              <input
                value={sellPriceStr}
                onChange={(e) => setSellPriceStr(e.target.value)}
                inputMode="decimal"
                className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold"
                placeholder="0"
              />
            </label>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              <span className="w-full text-[10px] font-bold uppercase text-emerald-200/55">Buy price unit</span>
              {(["gram", "tola"] as const).map((u) => {
                const active = buyPriceUnit === u;
                return (
                  <button
                    key={u}
                    type="button"
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                      active
                        ? "border-lime-400/45 bg-lime-500/15 text-lime-100"
                        : "border-emerald-400/20 bg-black/30 text-emerald-200/70"
                    }`}
                    onClick={() => setBuyPriceUnit(u)}
                  >
                    NPR / {u === "gram" ? "g" : "tola"}
                  </button>
                );
              })}
            </div>
            <label className="block">
              <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">
                Buy price ({buyPriceUnit === "gram" ? "NPR per gram" : "NPR per tola"})
              </span>
              <input
                value={buyPriceStr}
                onChange={(e) => setBuyPriceStr(e.target.value)}
                inputMode="decimal"
                className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold"
                placeholder="0"
              />
            </label>
            <div className="rounded-lg border border-emerald-400/15 bg-black/30 px-2 py-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/55">Photos (optional)</p>
              <input
                ref={buyPhotoRef}
                id={buyPhotoInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
              />
              <label
                htmlFor={buyPhotoInputId}
                className="mt-1 inline-flex cursor-pointer rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-amber-100"
              >
                Attach images
              </label>
              <p className="mt-1 text-[10px] font-semibold text-emerald-200/45">
                Merged into this holding when you submit the buy (max {METAL_PHOTO_MAX_COUNT} total).
              </p>
            </div>
            {previewAddBasis != null && Number.isFinite(previewAddBasis) ? (
              <p className="text-[10px] font-bold text-emerald-200/70">
                This buy total (incl. fees):{" "}
                <span className="tabular-nums text-emerald-50">{formatMoney(previewAddBasis, "NPR")}</span>
                {previewBuyGrams != null ? (
                  <>
                    {" "}
                    · after submit ~{" "}
                    <span className="tabular-nums text-amber-100">
                      {(held + previewBuyGrams).toLocaleString(undefined, { maximumFractionDigits: 4 })} g
                    </span>{" "}
                    held
                  </>
                ) : null}
              </p>
            ) : null}
          </>
        )}
      </div>
    </PortfolioTransactionStrip>
  );
}

export function MetalsPanel({
  rows,
  ledger,
  onChange,
  onAdd,
  onRemove,
  onMutate,
}: {
  rows: MetalRow[];
  ledger: readonly PortfolioLedgerEntry[];
  onChange: (id: string, patch: Partial<MetalRow>) => void;
  onAdd: (metal: "gold" | "silver") => void;
  onRemove: (id: string) => void;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  const {
    bullionSpot,
    bullionError,
    usdPerNpr,
    bullionPriceLoading,
    bullionPriceRefreshing,
  } = useWealthPortfolio();
  const showWarning = Boolean(bullionSpot?.degraded) || Boolean(bullionError);
  const lastUpdatedLabel = bullionSpot?.updatedAt
    ? new Date(bullionSpot.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";
  const sourceLabel = bullionSpot?.source ?? "FX-anchored estimate";
  const gramRates = resolveMetalGramRatesForUi(bullionSpot, usdPerNpr);
  const tolaRates = resolveMetalTolaRatesForUi(bullionSpot, usdPerNpr);
  const usingFallbackStrip = !bullionSpot && Boolean(bullionError);

  return (
    <section className="wealth-glass rounded-[1.35rem] p-3.5 sm:rounded-[1.5rem] sm:p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-200">
            <Gem size={18} />
          </div>
          <div>
            <h2 className="text-base font-black text-emerald-50 sm:text-lg">Gold & silver</h2>
            <p className="text-xs font-bold leading-snug text-emerald-200/65 sm:text-sm">
              Use <span className="text-emerald-100">Buy</span> and <span className="text-emerald-100">Sell</span>{" "}
              transactions for quantities, prices, and cost basis. Portfolio marks follow the{" "}
              <span className="text-emerald-100">FENEGOSIDA-published Nepal board</span> (Fine Gold 9999 &amp; Silver per
              10 g and per tola on fenegosida.org; aligned with FNGSGJA industry rates). International USD/oz is
              reference only.
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onAdd("gold")}
            className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-black text-amber-100 transition hover:bg-amber-500/20"
          >
            <Plus size={12} className="inline" /> Gold
          </button>
          <button
            type="button"
            onClick={() => onAdd("silver")}
            className="rounded-full border border-slate-400/25 bg-slate-500/10 px-2.5 py-1 text-[11px] font-black text-slate-100 transition hover:bg-slate-500/20"
          >
            <Plus size={12} className="inline" /> Silver
          </button>
        </div>
      </div>

      <div className="mb-3 space-y-2 rounded-xl border border-amber-400/20 bg-black/25 px-2.5 py-2.5 sm:px-3">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-emerald-100/90 sm:gap-3 sm:text-[11px]">
          <span
            className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 font-black uppercase tracking-widest text-emerald-100 shadow-[0_0_20px_-6px_rgba(52,211,153,0.45)]"
            title="Quotes refresh about every 6 minutes while this page is open."
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            Live
          </span>
          {bullionPriceLoading ? (
            <span className="text-emerald-200/75">Loading spot prices…</span>
          ) : bullionPriceRefreshing ? (
            <span className="text-emerald-200/75">Refreshing…</span>
          ) : null}
          <span className="text-emerald-200/75">
            Last updated: <span className="text-emerald-50">{lastUpdatedLabel}</span>
          </span>
          {showWarning ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-black uppercase tracking-wide text-amber-200">
              {bullionSpot?.degraded ? "Stale quote" : "Feed warning"}
            </span>
          ) : null}
        </div>

        {usingFallbackStrip ? (
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-[10px] font-bold leading-snug text-amber-100/95 sm:text-[11px]">
            Live feed unavailable ({bullionError}). Showing NPR estimates from USD anchors and your NPR/USD rate — Nepal
            board (fenegosida.org) could not be reached; add API keys (see .env.example) for stronger international
            feeds.
          </p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <div
            className={`rounded-lg border px-2 py-2 sm:px-2.5 ${
              bullionPriceLoading && !bullionSpot
                ? "border-amber-400/15 bg-black/20"
                : "border-amber-400/25 bg-amber-500/[0.07]"
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-200/80">
              Nepal gold (today)
            </p>
            {bullionPriceLoading && !bullionSpot ? (
              <div className="mt-1.5 space-y-1.5">
                <div className="h-4 max-w-[12rem] w-[75%] animate-pulse rounded bg-emerald-400/10" />
                <div className="h-4 max-w-[10rem] w-[60%] animate-pulse rounded bg-emerald-400/10" />
              </div>
            ) : (
              <>
                {bullionSpot?.nepalDomesticPrimary &&
                typeof bullionSpot.goldNepalPer10GramNPR === "number" &&
                bullionSpot.goldNepalPer10GramNPR > 0 ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200/60">
                      Fine Gold (9999) — FENEGOSIDA board
                    </p>
                    <p className="mt-1 font-black tabular-nums text-amber-100 sm:text-sm">
                      {formatMoney(bullionSpot.goldNepalPer10GramNPR, "NPR")} / 10 g
                    </p>
                    <p className="mt-0.5 text-[11px] font-bold tabular-nums text-amber-200/90">
                      {formatMoney(bullionSpot.goldPerTolaNPR, "NPR")} / tola
                    </p>
                    <p className="mt-1 border-t border-amber-400/15 pt-1 text-[10px] font-bold text-emerald-200/70">
                      Portfolio / g (board 10 g ÷ 10):{" "}
                      <span className="font-black text-amber-100">{formatMoney(gramRates.goldNprPerGram, "NPR")}</span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 font-black tabular-nums text-amber-100 sm:text-sm">
                      {formatMoney(gramRates.goldNprPerGram, "NPR")} / g
                    </p>
                    <p className="mt-0.5 text-[11px] font-bold tabular-nums text-amber-200/90">
                      {formatMoney(tolaRates.goldNprPerTola, "NPR")} / tola
                    </p>
                  </>
                )}
                {bullionSpot?.nepalDomesticPrimary ? (
                  <p className="mt-1 text-[10px] font-bold text-emerald-200/55">
                    Intl reference: ≈ ${bullionSpot.goldUsdPerTroyOz.toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
                    USD/troy oz
                    {bullionSpot.internationalRefSource ? (
                      <span className="text-emerald-200/40"> ({bullionSpot.internationalRefSource})</span>
                    ) : null}
                  </p>
                ) : bullionSpot ? (
                  <p className="mt-1 text-[10px] font-bold text-emerald-200/55">
                    Spot-derived NPR (intl): ≈ ${bullionSpot.goldUsdPerTroyOz.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    USD/troy oz
                  </p>
                ) : null}
              </>
            )}
          </div>
          <div
            className={`rounded-lg border px-2 py-2 sm:px-2.5 ${
              bullionPriceLoading && !bullionSpot
                ? "border-slate-400/15 bg-black/20"
                : "border-slate-400/25 bg-slate-500/[0.07]"
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-200/80">
              Nepal silver (today)
            </p>
            {bullionPriceLoading && !bullionSpot ? (
              <div className="mt-1.5 space-y-1.5">
                <div className="h-4 max-w-[12rem] w-[75%] animate-pulse rounded bg-slate-400/10" />
                <div className="h-4 max-w-[10rem] w-[60%] animate-pulse rounded bg-slate-400/10" />
              </div>
            ) : (
              <>
                {bullionSpot?.nepalDomesticPrimary &&
                typeof bullionSpot.silverNepalPer10GramNPR === "number" &&
                bullionSpot.silverNepalPer10GramNPR > 0 ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-200/60">
                      Silver — FENEGOSIDA board
                    </p>
                    <p className="mt-1 font-black tabular-nums text-slate-50 sm:text-sm">
                      {formatMoney(bullionSpot.silverNepalPer10GramNPR, "NPR")} / 10 g
                    </p>
                    <p className="mt-0.5 text-[11px] font-bold tabular-nums text-slate-200/90">
                      {formatMoney(bullionSpot.silverPerTolaNPR, "NPR")} / tola
                    </p>
                    <p className="mt-1 border-t border-slate-400/15 pt-1 text-[10px] font-bold text-emerald-200/70">
                      Portfolio / g (board 10 g ÷ 10):{" "}
                      <span className="font-black text-slate-100">{formatMoney(gramRates.silverNprPerGram, "NPR")}</span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 font-black tabular-nums text-slate-50 sm:text-sm">
                      {formatMoney(gramRates.silverNprPerGram, "NPR")} / g
                    </p>
                    <p className="mt-0.5 text-[11px] font-bold tabular-nums text-slate-200/90">
                      {formatMoney(tolaRates.silverNprPerTola, "NPR")} / tola
                    </p>
                  </>
                )}
                {bullionSpot?.nepalDomesticPrimary ? (
                  <p className="mt-1 text-[10px] font-bold text-emerald-200/55">
                    Intl reference: ≈ ${bullionSpot.silverUsdPerTroyOz.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                    USD/troy oz
                    {bullionSpot.internationalRefSource ? (
                      <span className="text-emerald-200/40"> ({bullionSpot.internationalRefSource})</span>
                    ) : null}
                  </p>
                ) : bullionSpot ? (
                  <p className="mt-1 text-[10px] font-bold text-emerald-200/55">
                    Spot-derived NPR (intl): ≈ ${bullionSpot.silverUsdPerTroyOz.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    USD/troy oz
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

        <p className="text-[10px] font-bold leading-snug text-emerald-200/65 sm:text-[11px]">
          <span className="text-emerald-200/55">Source:</span>{" "}
          <span className="break-all text-emerald-50">{sourceLabel}</span>
          <span className="mx-1.5 text-emerald-500/40">·</span>
          <span className="text-emerald-200/55">Board 1 tola =</span> {NEPAL_METAL_TOLA_GRAMS.toFixed(2)} g (Nepal bullion
          convention). <span className="text-emerald-200/55">Holdings UI conversion:</span> 1 tola = {NEPAL_UI_GRAMS_PER_TOLA} g.
        </p>
      </div>

      <MetalsPremiumDashboard rows={rows} gramRates={gramRates} ledger={ledger} />

      <div className="space-y-2">
        {rows.map((row) => {
          const g = row.grams ?? 0;
          const uiRates = resolveMetalGramRatesForUi(bullionSpot, usdPerNpr);
          const uiTola = resolveMetalTolaRatesForUi(bullionSpot, usdPerNpr);
          const rate = row.metal === "gold" ? uiRates.goldNprPerGram : uiRates.silverNprPerGram;
          const rateTola = row.metal === "gold" ? uiTola.goldNprPerTola : uiTola.silverNprPerTola;
          const total = g * rate;
          const basis = row.totalCostBasisNpr;
          const avgPerG = g > 0 && basis != null && basis > 0 ? basis / g : null;
          const unrealizedNpr =
            typeof basis === "number" && basis > 0 && g > 0 ? total - basis : null;
          const firstBuyIso = metalRowFirstBuyIso(row, ledger);
          return (
            <div
              key={row.id}
              className="wealth-row-card flex flex-col gap-2 rounded-xl p-2.5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-2">
                <div className="grid gap-2 sm:grid-cols-2 sm:items-end">
                  <label className="block">
                    <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">Metal</span>
                    <select
                      value={row.metal}
                      onChange={(e) => onChange(row.id, { metal: e.target.value as "gold" | "silver" })}
                      className="wealth-input w-full px-2 py-2 text-xs font-black sm:text-sm"
                    >
                      <option value="gold">Gold</option>
                      <option value="silver">Silver</option>
                    </select>
                  </label>
                </div>

                <div className="rounded-lg border border-emerald-400/15 bg-black/30 px-2.5 py-2 text-[11px] font-bold sm:text-xs">
                  <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/70">Holdings (from transactions)</p>
                  <dl className="mt-1.5 space-y-1">
                    <div className="flex justify-between gap-2">
                      <dt className="text-emerald-200/55">Quantity</dt>
                      <dd className="text-end tabular-nums text-emerald-50">
                        {g > 0 ? (
                          <>
                            {g.toLocaleString(undefined, { maximumFractionDigits: 4 })} g
                            <span className="text-emerald-200/50"> (~{gramsToTolaUi(g).toFixed(4)} tola UI)</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-emerald-200/55">Total cost basis</dt>
                      <dd className="tabular-nums text-emerald-50">
                        {basis != null && basis > 0 ? formatMoney(basis, "NPR") : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-emerald-200/55">Average cost</dt>
                      <dd className="tabular-nums text-emerald-50">
                        {avgPerG != null ? `${formatMoney(avgPerG, "NPR")} / g` : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 border-t border-emerald-400/10 pt-1">
                      <dt className="text-emerald-200/55">Live mark</dt>
                      <dd className="text-end text-emerald-50">
                        <span className="font-black">{formatMoney(rate, "NPR")} / g</span>
                        <span className="block text-[10px] font-bold text-emerald-200/65">
                          {formatMoney(rateTola, "NPR")} / tola
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-emerald-200/55">Current value</dt>
                      <dd className="tabular-nums font-black text-amber-100">
                        {g > 0 ? formatMoney(total, "NPR") : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-emerald-200/55">Unrealized P/L</dt>
                      <dd>
                        {unrealizedNpr != null ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-black ${
                              unrealizedNpr >= 0
                                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                                : "border-rose-400/30 bg-rose-500/10 text-rose-200"
                            }`}
                          >
                            {unrealizedNpr >= 0 ? (
                              <TrendingUp size={12} className="shrink-0" aria-hidden />
                            ) : (
                              <TrendingDown size={12} className="shrink-0" aria-hidden />
                            )}
                            {unrealizedNpr >= 0 ? "+" : ""}
                            {formatMoney(unrealizedNpr, "NPR")}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-200/45">Record a buy with price to track P/L</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                <MetalHoldingPhotos row={row} onPatch={(patch) => onChange(row.id, patch)} uploadEnabled={false} />

                <div className="border-t border-emerald-400/10 pt-2">
                  {firstBuyIso ? (
                    <PortfolioDateMeta dateIso={firstBuyIso} leadText="First activity" />
                  ) : (
                    <p className="text-[10px] font-bold text-emerald-200/45">
                      First purchase date appears after you record a buy with a date.
                    </p>
                  )}
                </div>

                <MetalTradeStrip row={row} onMutate={onMutate} />
              </div>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => onRemove(row.id)}
                className="self-end rounded-xl p-2 text-emerald-300/40 transition hover:bg-rose-500/15 hover:text-rose-300 sm:self-center"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>
      <ModuleLedgerCard
        bucket="metal"
        ledger={ledger}
        title="Gold & Silver ledger"
        subtitle="Buys and sells for precious metals in this module."
      />
    </section>
  );
}
