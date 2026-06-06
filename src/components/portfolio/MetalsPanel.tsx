"use client";

import { Gem, Plus, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import {
  resolveMetalGramRatesForUi,
  resolveMetalTolaRatesForUi,
} from "@/components/portfolio/calculations";
import { PortfolioDateMeta } from "@/components/portfolio/PortfolioDateMeta";
import { ModuleLedgerCard } from "@/components/portfolio/ledger-ui/ModuleLedgerCard";
import { MetalHoldingPhotos } from "@/components/portfolio/MetalHoldingPhotos";
import {
  compressMetalImageFile,
  METAL_PURCHASE_BILL_MAX_COUNT,
  sanitizeMetalPurchaseBillUrls,
} from "@/components/portfolio/metal-photo-utils";
import { MetalsPremiumDashboard } from "@/components/portfolio/MetalsPremiumSections";
import { metalRowFirstBuyIso } from "@/components/portfolio/metals-premium-metrics";
import { ensureMetalHoldingRow, recordMetalBuy, recordMetalSell } from "@/components/portfolio/portfolio-ledger";
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
import { PortfolioModuleDataResetButton } from "@/components/fire-nepal/PortfolioModuleDataResetButton";

function todayIso() {
  return portfolioTxnTodayIso();
}

function MetalPurchaseBillsGallery({
  billUrls,
  onMutate,
  fileInputRef,
}: {
  billUrls: readonly string[];
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
}) {
  const inputId = useId();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of files) {
        const u = await compressMetalImageFile(f);
        if (u) urls.push(u);
      }
      if (!urls.length) {
        toast.error("Could not process images.");
        return;
      }
      let added = 0;
      const ok = onMutate((s) => {
        const cur = sanitizeMetalPurchaseBillUrls(s.metalPurchaseBillUrls);
        const room = Math.max(0, METAL_PURCHASE_BILL_MAX_COUNT - cur.length);
        const slice = urls.slice(0, room);
        if (slice.length === 0) return null;
        added = slice.length;
        return { ...s, metalPurchaseBillUrls: [...cur, ...slice] };
      });
      if (ok && added > 0) {
        toast.success(`Saved ${added} bill image(s).`);
      } else if (!ok) {
        toast.error(`Bill limit reached (${METAL_PURCHASE_BILL_MAX_COUNT}).`);
      }
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (idx: number) => {
    const ok = onMutate((s) => {
      const cur = [...sanitizeMetalPurchaseBillUrls(s.metalPurchaseBillUrls)];
      if (idx < 0 || idx >= cur.length) return null;
      cur.splice(idx, 1);
      return { ...s, metalPurchaseBillUrls: cur };
    });
    if (ok) toast.success("Bill removed.");
  };

  return (
    <div className="mb-3 rounded-xl border border-emerald-400/15 bg-black/20 px-2.5 py-2 sm:px-3">
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        onChange={(e) => void onFiles(e)}
      />
      <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/70">Purchase bills</p>
      <p className="mt-0.5 text-[10px] font-semibold text-emerald-200/45">
        Stored with your Gold &amp; Silver portfolio (max {METAL_PURCHASE_BILL_MAX_COUNT} images).
      </p>
      {billUrls.length > 0 ? (
        <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6">
          {billUrls.map((url, idx) => (
            <div
              key={`${idx}-${url.slice(0, 32)}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-emerald-400/20 bg-black/40"
            >
              <button
                type="button"
                className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80"
                onClick={() => setPreviewUrl(url)}
                aria-label="Preview bill"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
              <button
                type="button"
                className="absolute right-0.5 top-0.5 z-20 rounded-md border border-rose-400/40 bg-black/70 p-0.5 text-rose-200 opacity-90 transition hover:bg-rose-500/30"
                aria-label="Delete bill"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(idx);
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-1.5 text-[10px] font-bold text-emerald-200/40">No bills uploaded yet.</p>
      )}
      {busy ? (
        <p className="mt-2 text-[10px] font-bold text-emerald-200/60">Processing…</p>
      ) : null}

      {previewUrl ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-label="Bill preview"
        >
          <button
            type="button"
            className="absolute right-3 top-3 rounded-lg border border-white/20 bg-white/10 p-2 text-white"
            onClick={() => setPreviewUrl(null)}
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Bill preview" className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl" />
        </div>
      ) : null}
    </div>
  );
}

const METAL_TX_SEGMENTS: TxnSegmentDef[] = [
  { id: "buy", label: "Buy", tone: "in" },
  { id: "sell", label: "Sell", tone: "out" },
];

function UniversalMetalTransactionForm({
  rows,
  onMutate,
}: {
  rows: MetalRow[];
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  const [open, setOpen] = useState(true);
  const [formMetal, setFormMetal] = useState<"gold" | "silver">("gold");
  const [targetRowId, setTargetRowId] = useState<string | null>(null);
  const [segmentId, setSegmentId] = useState<string>("buy");
  const [gramQtyStr, setGramQtyStr] = useState("");
  const [tolaQtyStr, setTolaQtyStr] = useState("");
  const [buyPriceStr, setBuyPriceStr] = useState("");
  const [buyPriceUnit, setBuyPriceUnit] = useState<"gram" | "tola">("gram");
  const [sellPriceStr, setSellPriceStr] = useState("");
  const [sellPriceUnit, setSellPriceUnit] = useState<"gram" | "tola">("gram");
  const [feesStr, setFeesStr] = useState("");
  const [notes, setNotes] = useState("");
  const [tradeDate, setTradeDate] = useState(todayIso);
  const [err, setErr] = useState<string | null>(null);

  const candidates = useMemo(() => rows.filter((r) => r.metal === formMetal), [rows, formMetal]);

  const resolvedTargetRowId = useMemo(() => {
    if (candidates.length === 0) return null;
    if (targetRowId != null && candidates.some((r) => r.id === targetRowId)) return targetRowId;
    return candidates[0]!.id;
  }, [candidates, targetRowId]);

  const targetRow = resolvedTargetRowId ? rows.find((r) => r.id === resolvedTargetRowId) : undefined;
  const held = targetRow?.grams ?? 0;
  const basis = targetRow?.totalCostBasisNpr;
  const avgPerG = held > 0 && basis != null && basis > 0 ? basis / held : null;

  const resetAllFields = () => {
    setFormMetal("gold");
    setSegmentId("buy");
    setGramQtyStr("");
    setTolaQtyStr("");
    setBuyPriceStr("");
    setBuyPriceUnit("gram");
    setSellPriceStr("");
    setSellPriceUnit("gram");
    setFeesStr("");
    setNotes("");
    setTradeDate(todayIso());
    setTargetRowId(null);
    setErr(null);
  };

  const onGramQtyChange = useCallback((raw: string) => {
    setGramQtyStr(raw);
    const trimmed = raw.replace(/,/g, "").trim();
    if (trimmed === "") {
      setTolaQtyStr("");
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0) {
      setTolaQtyStr("");
      return;
    }
    const tola = gramsToTolaUi(n);
    setTolaQtyStr(Number(tola.toFixed(6)).toString());
  }, []);

  const onTolaQtyChange = useCallback((raw: string) => {
    setTolaQtyStr(raw);
    const trimmed = raw.replace(/,/g, "").trim();
    if (trimmed === "") {
      setGramQtyStr("");
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0) {
      setGramQtyStr("");
      return;
    }
    const g = tolaUiToGrams(n);
    setGramQtyStr(Number(g.toFixed(6)).toString());
  }, []);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setErr(null);
    });
  }, [open, segmentId, formMetal, resolvedTargetRowId]);

  const parseQtyGrams = (): number | null => {
    const gRaw = gramQtyStr.replace(/,/g, "").trim();
    if (gRaw !== "") {
      const n = Number(gRaw);
      if (!Number.isFinite(n) || n <= 0) return null;
      return n;
    }
    const tRaw = tolaQtyStr.replace(/,/g, "").trim();
    if (tRaw === "") return null;
    const t = Number(tRaw);
    if (!Number.isFinite(t) || t <= 0) return null;
    return Number(tolaUiToGrams(t).toFixed(6));
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
      setErr("Enter a valid quantity in grams and/or tola (1 tola = 11.66 g).");
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
      const ok = onMutate((s) => {
        let sWork = s;
        let rowId: string;
        if (resolvedTargetRowId != null && sWork.metals.some((r) => r.id === resolvedTargetRowId)) {
          rowId = resolvedTargetRowId;
        } else {
          const ensured = ensureMetalHoldingRow(sWork, formMetal);
          sWork = ensured.state;
          rowId = ensured.rowId;
        }
        const row = sWork.metals.find((r) => r.id === rowId);
        const g0 = row?.grams ?? 0;
        if (grams > g0 + 1e-9) return null;
        return recordMetalSell(sWork, rowId, { grams, unitPriceNprPerGram, tradeDate, feesNpr, notes });
      });
      if (!ok) {
        setErr("Could not record sell (check quantity vs. holdings).");
        return;
      }
      toast.success("Sell recorded.");
    } else {
      const buyPriceNpr = parseBuyPriceNpr();
      if (buyPriceNpr == null) {
        setErr(`Enter buy price (NPR per ${buyPriceUnit === "gram" ? "gram" : "tola"}).`);
        return;
      }

      const ok = onMutate((s) => {
        let sWork = s;
        let rowId: string;
        if (resolvedTargetRowId != null && sWork.metals.some((r) => r.id === resolvedTargetRowId)) {
          rowId = resolvedTargetRowId;
        } else {
          const ensured = ensureMetalHoldingRow(sWork, formMetal);
          sWork = ensured.state;
          rowId = ensured.rowId;
        }
        return recordMetalBuy(sWork, rowId, {
          grams,
          tradeDate,
          buyPriceNpr,
          buyPriceUnit,
          feesNpr,
          notes,
        });
      });
      if (!ok) {
        setErr("Could not record buy.");
        return;
      }
      toast.success("Buy recorded.");
    }

    resetAllFields();
  };

  const previewBuyGrams = parseQtyGrams();
  const previewBuyPrice = parseBuyPriceNpr();
  const previewFees = feesStr.trim() === "" ? 0 : Number(feesStr.replace(/,/g, ""));
  const previewLineGrams = resolvedTargetRowId != null ? (rows.find((r) => r.id === resolvedTargetRowId)?.grams ?? 0) : 0;
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
        resolvedTargetRowId != null && targetRow ? (
          <>
            {held.toLocaleString()} g · basis {basis != null ? formatMoney(basis, "NPR") : "—"}
            {avgPerG != null ? ` · avg ${formatMoney(avgPerG, "NPR")}/g` : ""}
          </>
        ) : (
          <span className="text-emerald-200/70">No {formMetal} line yet — first buy creates it</span>
        )
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
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">Metal</span>
            <select
              value={formMetal}
              onChange={(e) => setFormMetal(e.target.value as "gold" | "silver")}
              className="wealth-input w-full px-2 py-2 text-xs font-black sm:text-sm"
            >
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
            </select>
          </label>
          {candidates.length > 1 ? (
            <label className="block">
              <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">Holding line</span>
              <select
                value={resolvedTargetRowId ?? ""}
                onChange={(e) => setTargetRowId(e.target.value || null)}
                className="wealth-input w-full px-2 py-2 text-xs font-black sm:text-sm"
              >
                {candidates.map((r, i) => (
                  <option key={r.id} value={r.id}>
                    #{i + 1} · {(r.grams ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} g
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">Grams</span>
            <input
              value={gramQtyStr}
              onChange={(e) => onGramQtyChange(e.target.value)}
              inputMode="decimal"
              className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold"
              placeholder="0"
            />
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">Tola (1 tola = 11.66 g)</span>
            <input
              value={tolaQtyStr}
              onChange={(e) => onTolaQtyChange(e.target.value)}
              inputMode="decimal"
              className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold"
              placeholder="0"
            />
          </label>
        </div>

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
            {previewAddBasis != null && Number.isFinite(previewAddBasis) && segmentId === "buy" && previewBuyGrams != null ? (
              <p className="text-[10px] font-bold text-emerald-200/70">
                This buy total (incl. fees):{" "}
                <span className="tabular-nums text-emerald-50">{formatMoney(previewAddBasis, "NPR")}</span>
                {" · after submit ~ "}
                <span className="tabular-nums text-amber-100">
                  {(previewLineGrams + previewBuyGrams).toLocaleString(undefined, { maximumFractionDigits: 4 })} g
                </span>{" "}
                on this line
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
    state: portfolioState,
  } = useWealthPortfolio();
  const purchaseBillsInputRef = useRef<HTMLInputElement>(null);
  const billUrls = portfolioState.metalPurchaseBillUrls ?? [];
  const showWarning = Boolean(bullionSpot?.degraded) || Boolean(bullionError);
  const lastUpdatedLabel = bullionSpot?.updatedAt
    ? new Date(bullionSpot.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";
  const sourceLabel = bullionSpot?.source ?? "FX-anchored estimate";
  const gramRates = resolveMetalGramRatesForUi(bullionSpot, usdPerNpr);
  const tolaRates = resolveMetalTolaRatesForUi(bullionSpot, usdPerNpr);
  const usingFallbackStrip = !bullionSpot && Boolean(bullionError);

  return (
    <section className="wealth-glass rounded-[1.35rem] p-3 sm:rounded-[1.5rem] sm:p-3.5">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
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
        <button
          type="button"
          onClick={() => purchaseBillsInputRef.current?.click()}
          className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-100 transition hover:bg-emerald-500/20"
        >
          Upload purchase bills
        </button>
        <PortfolioModuleDataResetButton module="metals" onMutate={onMutate} />
      </div>
      <div className="mb-2 flex items-start gap-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-400/15 text-amber-200">
          <Gem size={16} />
        </div>
        <p className="min-w-0 text-[11px] font-bold leading-snug text-emerald-200/70 sm:text-xs">
          Marks follow the <span className="text-emerald-100">FENEGOSIDA Nepal board</span>. USD/oz is reference only.
        </p>
      </div>

      <MetalPurchaseBillsGallery billUrls={billUrls} onMutate={onMutate} fileInputRef={purchaseBillsInputRef} />

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
          const metalLabel = row.metal === "gold" ? "Gold" : "Silver";
          return (
            <div
              key={row.id}
              className="wealth-row-card flex flex-col gap-2 rounded-xl p-2.5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-2">
                <p
                  className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                    row.metal === "gold"
                      ? "border-amber-400/35 bg-amber-500/15 text-amber-100"
                      : "border-slate-400/35 bg-slate-500/15 text-slate-100"
                  }`}
                >
                  {metalLabel} holding
                </p>

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
              </div>
              <button
                type="button"
                aria-label="Remove holding"
                onClick={() => onRemove(row.id)}
                className="self-end rounded-xl p-2 text-emerald-300/40 transition hover:bg-rose-500/15 hover:text-rose-300 sm:self-center"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-3 border-t border-emerald-400/10 pt-3">
        <UniversalMetalTransactionForm rows={rows} onMutate={onMutate} />
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
