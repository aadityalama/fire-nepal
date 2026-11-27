"use client";

import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type RefObject } from "react";
import {
  resolveMetalGramRatesForUi,
  resolveMetalTolaRatesForUi,
} from "@/components/portfolio/calculations";
import { calendarDaysInvested, formatHoldingDurationApprox, parsePurchaseIso } from "@/components/portfolio/holding-stats";
import { ModuleLedgerCard } from "@/components/portfolio/ledger-ui/ModuleLedgerCard";
import {
  compressMetalLedgerAttachmentFile,
  METAL_LEDGER_MAX_BILLS_PER_TX,
  METAL_LEDGER_MAX_PHOTOS_PER_TX,
  metalItemCoverFromLedger,
  sanitizeMetalTxBillUrls,
  sanitizeMetalTxPhotoUrls,
} from "@/components/portfolio/metal-photo-utils";
import { MetalsDownloadBillsSection } from "@/components/portfolio/MetalsDownloadBillsSection";
import { MetalsPremiumDashboard } from "@/components/portfolio/MetalsPremiumSections";
import { metalRowFirstBuyIso, roiPct } from "@/components/portfolio/metals-premium-metrics";
import { PortfolioIsoDateField } from "@/components/portfolio/PortfolioIsoDateField";
import {
  recordMetalBuy,
  recordMetalSell,
  updateMetalHolding,
  updateMetalTxn,
} from "@/components/portfolio/portfolio-ledger";
import {
  PortfolioTransactionStrip,
  portfolioTxnTodayIso,
  type TxnSegmentDef,
} from "@/components/portfolio/transaction-ui/PortfolioTransactionStrip";
import type { MetalRow, PortfolioLedgerEntry, WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { formatMoney } from "@/lib/expense-utils";
import { gramsToTolaUi, NEPAL_UI_GRAMS_PER_TOLA, tolaUiToGrams } from "@/lib/portfolio/nepal-metal-ui-convert";
import {
  HAMRO_PATRO_GOLD_SOURCE_URL,
  resolveNepalMarketFreshness,
} from "@/services/market/hamropatro-nepal-rates";
import { toast } from "sonner";
function todayIso() {
  return portfolioTxnTodayIso();
}

const METAL_TX_SEGMENTS: TxnSegmentDef[] = [
  { id: "buy", label: "Buy", tone: "in" },
  { id: "sell", label: "Sell", tone: "out" },
];

export type MetalTxnFormHandle = {
  openBuyForMetal: (metal: "gold" | "silver") => void;
  focusBillsInput: () => void;
  /** Prefill the form from an existing metal ledger entry and switch to edit mode. */
  openEditEntry: (entry: PortfolioLedgerEntry) => void;
};

const UniversalMetalTransactionForm = forwardRef<
  MetalTxnFormHandle,
  {
    rows: MetalRow[];
    onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
    billsFileInputRef?: RefObject<HTMLInputElement | null>;
  }
>(function UniversalMetalTransactionForm({ rows, onMutate, billsFileInputRef }, ref) {
  const [open, setOpen] = useState(true);
  const [formMetal, setFormMetal] = useState<"gold" | "silver">("gold");
  const [segmentId, setSegmentId] = useState<string>("buy");
  const [buyMode, setBuyMode] = useState<"new" | "existing">("new");
  const [itemName, setItemName] = useState("");
  const [existingBuyRowId, setExistingBuyRowId] = useState<string | null>(null);
  const [sellRowId, setSellRowId] = useState<string | null>(null);
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
  const [pendingBillUrls, setPendingBillUrls] = useState<string[]>([]);
  const [pendingPhotoUrls, setPendingPhotoUrls] = useState<string[]>([]);
  const [attachBusy, setAttachBusy] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const internalBillsRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const billsInputRef = billsFileInputRef ?? internalBillsRef;
  const billsInputId = useId();
  const photosInputId = useId();
  const isEditing = editingEntryId != null;

  const candidates = useMemo(() => rows.filter((r) => r.metal === formMetal), [rows, formMetal]);
  const sellCandidates = useMemo(() => candidates.filter((r) => (r.grams ?? 0) > 1e-9), [candidates]);
  const canUseExistingBuy = candidates.length > 0;
  const buyModeActive: "new" | "existing" =
    isEditing ? "existing" : buyMode === "existing" && canUseExistingBuy ? "existing" : "new";

  useImperativeHandle(
    ref,
    () => ({
      openBuyForMetal(metal) {
        setEditingEntryId(null);
        setFormMetal(metal);
        setSegmentId("buy");
        setBuyMode("new");
        setOpen(true);
      },
      focusBillsInput() {
        billsInputRef.current?.click();
      },
      openEditEntry(entry) {
        if (entry.bucket !== "metal" || (entry.txType !== "buy" && entry.txType !== "sell")) {
          toast.error("Only gold and silver buy/sell records can be edited.");
          return;
        }
        const meta = entry.meta && typeof entry.meta === "object" ? (entry.meta as Record<string, unknown>) : {};
        const metal = entry.metal === "silver" ? "silver" : "gold";
        const grams = entry.quantity;
        const tola = gramsToTolaUi(grams);
        setEditingEntryId(entry.id);
        setFormMetal(metal);
        setSegmentId(entry.txType);
        setBuyMode("existing");
        setExistingBuyRowId(entry.rowId);
        setSellRowId(entry.rowId);
        setItemName(entry.assetLabel || "");
        setGramQtyStr(Number(grams.toFixed(6)).toString());
        setTolaQtyStr(Number(tola.toFixed(6)).toString());
        if (entry.txType === "buy") {
          const unit = meta.buyPriceUnit === "tola" ? "tola" : "gram";
          const stored =
            typeof meta.metalBuyPriceNpr === "number" && Number.isFinite(meta.metalBuyPriceNpr)
              ? meta.metalBuyPriceNpr
              : unit === "tola"
                ? entry.unitPrice * NEPAL_UI_GRAMS_PER_TOLA
                : entry.unitPrice;
          setBuyPriceUnit(unit);
          setBuyPriceStr(Number(stored.toFixed(6)).toString());
          setSellPriceStr("");
          setSellPriceUnit("gram");
        } else {
          setSellPriceUnit("gram");
          setSellPriceStr(Number(entry.unitPrice.toFixed(6)).toString());
          setBuyPriceStr("");
          setBuyPriceUnit("gram");
        }
        setFeesStr(entry.fees != null && entry.fees > 0 ? String(entry.fees) : "");
        setNotes(entry.notes ?? "");
        setTradeDate(entry.tradeDate);
        setPendingBillUrls(sanitizeMetalTxBillUrls(meta.metalTxBillUrls));
        setPendingPhotoUrls(sanitizeMetalTxPhotoUrls(meta.metalTxPhotoUrls));
        setErr(null);
        setOpen(true);
        queueMicrotask(() => {
          document.getElementById("metal-transactions")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      },
    }),
    [billsInputRef],
  );

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setErr(null);
    });
  }, [open, segmentId, formMetal, buyModeActive, existingBuyRowId, sellRowId]);

  const resolvedSellRowId = useMemo(() => {
    if (sellCandidates.length === 0) return null;
    if (sellRowId != null && sellCandidates.some((r) => r.id === sellRowId)) return sellRowId;
    return sellCandidates[0]!.id;
  }, [sellCandidates, sellRowId]);

  const resolvedBuyExistingId = useMemo(() => {
    if (candidates.length === 0) return null;
    if (existingBuyRowId != null && candidates.some((r) => r.id === existingBuyRowId)) return existingBuyRowId;
    return candidates[0]!.id;
  }, [candidates, existingBuyRowId]);

  const resetAllFields = () => {
    setEditingEntryId(null);
    setSegmentId("buy");
    setBuyMode("new");
    setItemName("");
    setExistingBuyRowId(null);
    setSellRowId(null);
    setGramQtyStr("");
    setTolaQtyStr("");
    setBuyPriceStr("");
    setBuyPriceUnit("gram");
    setSellPriceStr("");
    setSellPriceUnit("gram");
    setFeesStr("");
    setNotes("");
    setTradeDate(todayIso());
    setErr(null);
    setPendingBillUrls([]);
    setPendingPhotoUrls([]);
  };

  const cancelEdit = () => {
    resetAllFields();
    toast.message("Edit cancelled — no changes saved.");
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

  const appendFiles = async (files: File[], kind: "bill" | "photo") => {
    setAttachBusy(true);
    try {
      const next: string[] = [];
      for (const f of files) {
        const u = await compressMetalLedgerAttachmentFile(f);
        if (u) next.push(u);
      }
      if (!next.length) {
        toast.error("Could not process files (images or small PDFs only).");
        return;
      }
      if (kind === "bill") {
        setPendingBillUrls((prev) => {
          const room = Math.max(0, METAL_LEDGER_MAX_BILLS_PER_TX - prev.length);
          return [...prev, ...next.slice(0, room)];
        });
      } else {
        setPendingPhotoUrls((prev) => {
          const room = Math.max(0, METAL_LEDGER_MAX_PHOTOS_PER_TX - prev.length);
          return [...prev, ...next.slice(0, room)];
        });
      }
    } finally {
      setAttachBusy(false);
    }
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

    if (isEditing && editingEntryId) {
      if (segmentId === "sell") {
        const unitPriceNprPerGram = parseSellUnitPriceNprPerGram();
        if (unitPriceNprPerGram == null) {
          setErr(`Enter sell price (NPR per ${sellPriceUnit === "gram" ? "gram" : "tola"}).`);
          return;
        }
        const ok = onMutate((s) =>
          updateMetalTxn(s, editingEntryId, {
            grams,
            unitPriceNprPerGram,
            tradeDate,
            feesNpr,
            notes,
            billAttachmentUrls: pendingBillUrls,
            photoAttachmentUrls: pendingPhotoUrls,
          }),
        );
        if (!ok) {
          setErr("Could not update sell (invalid quantity or sequence). Original record unchanged.");
          return;
        }
      } else {
        const buyPriceNpr = parseBuyPriceNpr();
        if (buyPriceNpr == null) {
          setErr(`Enter buy price (NPR per ${buyPriceUnit === "gram" ? "gram" : "tola"}).`);
          return;
        }
        const ok = onMutate((s) =>
          updateMetalTxn(s, editingEntryId, {
            grams,
            buyPriceNpr,
            buyPriceUnit,
            tradeDate,
            feesNpr,
            notes,
            billAttachmentUrls: pendingBillUrls,
            photoAttachmentUrls: pendingPhotoUrls,
          }),
        );
        if (!ok) {
          setErr("Could not update buy (invalid values or sell sequence). Original record unchanged.");
          return;
        }
      }
      toast.success("Transaction updated successfully.");
      resetAllFields();
      return;
    }

    if (segmentId === "sell") {
      if (sellCandidates.length === 0) {
        setErr("Nothing to sell — record a buy first.");
        return;
      }
      const rowId = resolvedSellRowId;
      if (!rowId) {
        setErr("Select an item to sell from.");
        return;
      }
      const unitPriceNprPerGram = parseSellUnitPriceNprPerGram();
      if (unitPriceNprPerGram == null) {
        setErr(`Enter sell price (NPR per ${sellPriceUnit === "gram" ? "gram" : "tola"}).`);
        return;
      }
      const ok = onMutate((s) =>
        recordMetalSell(s, rowId, {
          grams,
          unitPriceNprPerGram,
          tradeDate,
          feesNpr,
          notes,
          billAttachmentUrls: pendingBillUrls,
          photoAttachmentUrls: pendingPhotoUrls,
        }),
      );
      if (!ok) {
        setErr("Could not record sell (check quantity vs. item).");
        return;
      }
      toast.success("Sell recorded.");
    } else {
      const buyPriceNpr = parseBuyPriceNpr();
      if (buyPriceNpr == null) {
        setErr(`Enter buy price (NPR per ${buyPriceUnit === "gram" ? "gram" : "tola"}).`);
        return;
      }
      if (buyModeActive === "new") {
        const nm = itemName.replace(/\s+/g, " ").trim();
        if (!nm) {
          setErr("Item name is required for a new buy.");
          return;
        }
      } else if (!resolvedBuyExistingId) {
        setErr("No existing item for this metal — choose New item or a different metal.");
        return;
      }
      const ok = onMutate((s) =>
        recordMetalBuy(s, {
          metal: formMetal,
          existingRowId: buyModeActive === "existing" ? resolvedBuyExistingId : null,
          itemName: buyModeActive === "new" ? itemName : (candidates.find((r) => r.id === resolvedBuyExistingId)?.name ?? ""),
          grams,
          tradeDate,
          buyPriceNpr,
          buyPriceUnit,
          feesNpr,
          notes,
          billAttachmentUrls: pendingBillUrls,
          photoAttachmentUrls: pendingPhotoUrls,
        }),
      );
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
  const buyTargetRow =
    buyModeActive === "existing" && resolvedBuyExistingId ? rows.find((r) => r.id === resolvedBuyExistingId) : undefined;
  const previewLineGrams = buyTargetRow?.grams ?? 0;
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
    <div id="metal-transactions">
      <PortfolioTransactionStrip
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v && isEditing) resetAllFields();
        }}
        headerLabel={isEditing ? "Edit Transaction" : "Transactions"}
        summaryRight={
          isEditing ? (
            <span className="text-amber-100/90">Editing existing record · ID preserved</span>
          ) : segmentId === "sell" && resolvedSellRowId ? (
            <span className="text-emerald-200/80">
              Selling from{" "}
              <span className="font-black text-emerald-50">
                {rows.find((r) => r.id === resolvedSellRowId)?.name ?? "Item"}
              </span>
            </span>
          ) : segmentId === "buy" && buyModeActive === "existing" && resolvedBuyExistingId ? (
            <span className="text-emerald-200/80">
              Adding to{" "}
              <span className="font-black text-emerald-50">
                {rows.find((r) => r.id === resolvedBuyExistingId)?.name ?? "Item"}
              </span>
            </span>
          ) : (
            <span className="text-emerald-200/70">Buy creates an item; sell reduces quantity</span>
          )
        }
        segments={METAL_TX_SEGMENTS}
        segmentId={segmentId}
        onSegmentId={setSegmentId}
        segmentsLocked={isEditing}
        tradeDate={tradeDate}
        onTradeDate={setTradeDate}
        feesLabel="Fees / making charges (NPR)"
        feesStr={feesStr}
        onFeesStrChange={setFeesStr}
        notes={notes}
        onNotesChange={setNotes}
        error={err}
        submitLabel={isEditing ? "Save Changes" : segmentId === "sell" ? "Record sell" : "Record buy"}
        onSubmit={() => void submit()}
        cancelLabel={isEditing ? "Cancel" : undefined}
        onCancel={isEditing ? cancelEdit : undefined}
        accent="amber"
      >
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">Metal</span>
              <select
                value={formMetal}
                disabled={isEditing}
                onChange={(e) => setFormMetal(e.target.value as "gold" | "silver")}
                className="wealth-input w-full px-2 py-2 text-xs font-black sm:text-sm disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
              </select>
            </label>
            {segmentId === "sell" && !isEditing && sellCandidates.length > 1 ? (
              <label className="block">
                <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">Sell from item</span>
                <select
                  value={resolvedSellRowId ?? ""}
                  onChange={(e) => setSellRowId(e.target.value || null)}
                  className="wealth-input w-full px-2 py-2 text-xs font-black sm:text-sm"
                >
                  {sellCandidates.map((r) => (
                    <option key={r.id} value={r.id}>
                      {(r.name || "Item").slice(0, 48)} · {(r.grams ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} g
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {isEditing ? (
              <p className="sm:col-span-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-2 py-1.5 text-[10px] font-bold text-amber-100/90">
                Edit mode — buy/sell type and metal stay with the original record. Saving updates the same transaction ID.
              </p>
            ) : null}
          </div>

          {segmentId === "buy" && !isEditing ? (
            <div className="flex flex-wrap gap-1.5">
              <span className="w-full text-[10px] font-bold uppercase text-emerald-200/55">Buy type</span>
              {(["new", "existing"] as const).map((m) => {
                const active = buyModeActive === m;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={m === "existing" && !canUseExistingBuy}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                      m === "existing" && !canUseExistingBuy ? "cursor-not-allowed opacity-40" : ""
                    } ${
                      active
                        ? "border-lime-400/45 bg-lime-500/15 text-lime-100"
                        : "border-emerald-400/20 bg-black/30 text-emerald-200/70"
                    }`}
                    onClick={() => {
                      if (m === "existing" && !canUseExistingBuy) return;
                      setBuyMode(m);
                    }}
                  >
                    {m === "new" ? "New item" : "Add to existing"}
                  </button>
                );
              })}
            </div>
          ) : null}

          {segmentId === "buy" && buyModeActive === "new" && !isEditing ? (
            <label className="block">
              <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">Item name</span>
              <input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold"
                placeholder="e.g. Gold Ring, Silver Chain"
                maxLength={120}
              />
            </label>
          ) : null}

          {isEditing ? (
            <p className="text-[11px] font-bold text-emerald-100/85">
              Item: <span className="text-[#F4D06F]">{itemName || "Metal item"}</span>
            </p>
          ) : null}

          {segmentId === "buy" && buyModeActive === "existing" && candidates.length > 0 && !isEditing ? (
            <label className="block">
              <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">Item</span>
              <select
                value={resolvedBuyExistingId ?? ""}
                onChange={(e) => setExistingBuyRowId(e.target.value || null)}
                className="wealth-input w-full px-2 py-2 text-xs font-black sm:text-sm"
              >
                {candidates.map((r) => (
                  <option key={r.id} value={r.id}>
                    {(r.name || "Item").slice(0, 56)} · {(r.grams ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} g
                  </option>
                ))}
              </select>
            </label>
          ) : null}

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
                  {buyModeActive === "existing" && !isEditing ? (
                    <>
                      {" · after submit ~ "}
                      <span className="tabular-nums text-amber-100">
                        {(previewLineGrams + previewBuyGrams).toLocaleString(undefined, { maximumFractionDigits: 4 })} g
                      </span>{" "}
                      on this item
                    </>
                  ) : null}
                </p>
              ) : null}
            </>
          )}

          <div className="rounded-lg border border-emerald-400/15 bg-black/25 px-2 py-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/60">Attachments (this transaction)</p>
            <p className="mt-0.5 text-[10px] font-semibold text-emerald-200/45">
              Bills / invoices (images or PDF, max {METAL_LEDGER_MAX_BILLS_PER_TX}) · Photos (max {METAL_LEDGER_MAX_PHOTOS_PER_TX})
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                ref={billsInputRef}
                id={billsInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  void appendFiles(files, "bill");
                }}
              />
              <button
                type="button"
                onClick={() => billsInputRef.current?.click()}
                className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-100"
              >
                Add bills
              </button>
              <input
                ref={photosInputRef}
                id={photosInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  void appendFiles(files, "photo");
                }}
              />
              <button
                type="button"
                onClick={() => photosInputRef.current?.click()}
                className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase text-amber-100"
              >
                Add photos
              </button>
              {attachBusy ? <span className="text-[10px] font-bold text-emerald-200/60">Processing…</span> : null}
            </div>
            {(pendingBillUrls.length > 0 || pendingPhotoUrls.length > 0) && (
              <p className="mt-1.5 text-[10px] font-bold text-emerald-200/70">
                {pendingBillUrls.length} bill(s), {pendingPhotoUrls.length} photo(s) — saved when you submit.
              </p>
            )}
          </div>
        </div>
      </PortfolioTransactionStrip>
    </div>
  );
});

UniversalMetalTransactionForm.displayName = "UniversalMetalTransactionForm";

function EditMetalHoldingForm({
  row,
  ledger,
  onMutate,
  onCancel,
}: {
  row: MetalRow;
  ledger: readonly PortfolioLedgerEntry[];
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
  onCancel: () => void;
}) {
  const buys = useMemo(
    () =>
      ledger
        .filter((e) => e.bucket === "metal" && e.rowId === row.id && e.txType === "buy")
        .slice()
        .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate)),
    [ledger, row.id],
  );
  const anchor = buys[0];
  const multiBuy = buys.length > 1;
  const meta = anchor?.meta && typeof anchor.meta === "object" ? (anchor.meta as Record<string, unknown>) : {};

  const [itemName, setItemName] = useState(row.name || "");
  const [tradeDate, setTradeDate] = useState(
    () => metalRowFirstBuyIso(row, ledger) || row.boughtDate || todayIso(),
  );
  const [gramQtyStr, setGramQtyStr] = useState(() => {
    const g = row.grams ?? 0;
    return g > 0 ? Number(g.toFixed(6)).toString() : "";
  });
  const [tolaQtyStr, setTolaQtyStr] = useState(() => {
    const g = row.grams ?? 0;
    return g > 0 ? Number(gramsToTolaUi(g).toFixed(6)).toString() : "";
  });
  const [buyPriceUnit, setBuyPriceUnit] = useState<"gram" | "tola">(() =>
    meta.buyPriceUnit === "tola" ? "tola" : "gram",
  );
  const [buyPriceStr, setBuyPriceStr] = useState(() => {
    if (typeof meta.metalBuyPriceNpr === "number" && Number.isFinite(meta.metalBuyPriceNpr) && meta.metalBuyPriceNpr > 0) {
      return Number(meta.metalBuyPriceNpr.toFixed(6)).toString();
    }
    if (anchor && anchor.quantity > 0) {
      const unit = meta.buyPriceUnit === "tola" ? "tola" : "gram";
      const npr = unit === "tola" ? anchor.unitPrice * NEPAL_UI_GRAMS_PER_TOLA : anchor.unitPrice;
      return Number(npr.toFixed(6)).toString();
    }
    const g = row.grams ?? 0;
    const basis = row.totalCostBasisNpr ?? 0;
    if (g > 0 && basis > 0) return Number((basis / g).toFixed(6)).toString();
    return "";
  });
  const [feesStr, setFeesStr] = useState(() =>
    anchor?.fees != null && anchor.fees > 0 ? String(anchor.fees) : "",
  );
  const [notes, setNotes] = useState(anchor?.notes ?? "");
  const [err, setErr] = useState<string | null>(null);

  const onGramQtyChange = (raw: string) => {
    setGramQtyStr(raw);
    const trimmed = raw.replace(/,/g, "").trim();
    if (trimmed === "") {
      setTolaQtyStr("");
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) {
      setTolaQtyStr("");
      return;
    }
    setTolaQtyStr(Number(gramsToTolaUi(n).toFixed(6)).toString());
  };
  const onTolaQtyChange = (raw: string) => {
    setTolaQtyStr(raw);
    const trimmed = raw.replace(/,/g, "").trim();
    if (trimmed === "") {
      setGramQtyStr("");
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) {
      setGramQtyStr("");
      return;
    }
    setGramQtyStr(Number(tolaUiToGrams(n).toFixed(6)).toString());
  };

  const parseQtyGrams = (): number | null => {
    const gRaw = gramQtyStr.replace(/,/g, "").trim();
    if (gRaw !== "") {
      const n = Number(gRaw);
      if (!Number.isFinite(n) || n < 0) return null;
      return n;
    }
    const tRaw = tolaQtyStr.replace(/,/g, "").trim();
    if (tRaw === "") return null;
    const t = Number(tRaw);
    if (!Number.isFinite(t) || t < 0) return null;
    return Number(tolaUiToGrams(t).toFixed(6));
  };

  const submit = () => {
    setErr(null);
    const grams = parseQtyGrams();
    if (grams == null || grams <= 0) {
      setErr("Enter a valid quantity in grams and/or tola (1 tola = 11.66 g).");
      return;
    }
    const buyPriceNpr = Number(buyPriceStr.replace(/,/g, "").trim());
    if (!Number.isFinite(buyPriceNpr) || buyPriceNpr <= 0) {
      setErr(`Enter purchase price (NPR per ${buyPriceUnit === "gram" ? "gram" : "tola"}).`);
      return;
    }
    const feesNpr = feesStr.trim() === "" ? undefined : Number(feesStr.replace(/,/g, ""));
    if (feesNpr != null && (!Number.isFinite(feesNpr) || feesNpr < 0)) {
      setErr("Fees / making charges must be non-negative NPR.");
      return;
    }
    const nm = itemName.replace(/\s+/g, " ").trim();
    if (!nm) {
      setErr("Item name is required.");
      return;
    }
    if (multiBuy) {
      const curG = row.grams ?? 0;
      const economic =
        Math.abs(curG - grams) > 1e-6 ||
        Math.abs((anchor?.unitPrice ?? 0) - (buyPriceUnit === "tola" ? buyPriceNpr / NEPAL_UI_GRAMS_PER_TOLA : buyPriceNpr)) >
          1e-6;
      if (economic) {
        setErr("This item has multiple buy trades. Edit quantity or price from Trades & Transaction History.");
        return;
      }
    }
    const ok = onMutate((s) =>
      updateMetalHolding(s, row.id, {
        name: nm,
        tradeDate,
        grams,
        buyPriceNpr,
        buyPriceUnit,
        feesNpr,
        notes,
      }),
    );
    if (!ok) {
      setErr("Could not update holding (invalid values or sell sequence). Original data unchanged.");
      return;
    }
    toast.success("Holding updated successfully.");
    onCancel();
  };

  const gramsPreview = parseQtyGrams();
  const pricePreview = Number(buyPriceStr.replace(/,/g, "").trim());
  const feesPreview = feesStr.trim() === "" ? 0 : Number(feesStr.replace(/,/g, ""));
  let totalPreview: number | null = null;
  if (
    gramsPreview != null &&
    gramsPreview > 0 &&
    Number.isFinite(pricePreview) &&
    pricePreview > 0 &&
    Number.isFinite(feesPreview) &&
    feesPreview >= 0
  ) {
    const npg = buyPriceUnit === "tola" ? pricePreview / NEPAL_UI_GRAMS_PER_TOLA : pricePreview;
    totalPreview = gramsPreview * npg + feesPreview;
  }

  return (
    <div
      id="edit-metal-holding"
      className="mb-3 rounded-xl border border-[#D4AF37]/35 bg-gradient-to-br from-[#062B24]/70 to-[#03100F]/95 p-3 sm:p-3.5"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.08em] text-[#F4D06F]">Edit Holding</p>
        <p className="text-[10px] font-bold text-[#CBD5E1]/70">
          {row.metal === "gold" ? "Gold" : "Silver"} · same item ID preserved
        </p>
      </div>
      {multiBuy ? (
        <p className="mb-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-[10px] font-bold text-amber-100/90">
          Multiple buy trades linked — rename and date are editable here; change qty/price via transaction Edit.
        </p>
      ) : null}
      <div className="space-y-2">
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">Item name</span>
          <input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold"
            maxLength={120}
          />
        </label>
        <PortfolioIsoDateField
          label="Purchase date"
          value={tradeDate}
          onChange={(next) => setTradeDate(next ?? todayIso())}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">Grams</span>
            <input
              value={gramQtyStr}
              onChange={(e) => onGramQtyChange(e.target.value)}
              inputMode="decimal"
              disabled={multiBuy}
              className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">Tola (1 tola = 11.66 g)</span>
            <input
              value={tolaQtyStr}
              onChange={(e) => onTolaQtyChange(e.target.value)}
              inputMode="decimal"
              disabled={multiBuy}
              className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold disabled:opacity-60"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="w-full text-[10px] font-bold uppercase text-emerald-200/55">Purchase price unit</span>
          {(["gram", "tola"] as const).map((u) => (
            <button
              key={u}
              type="button"
              disabled={multiBuy}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                buyPriceUnit === u
                  ? "border-lime-400/45 bg-lime-500/15 text-lime-100"
                  : "border-emerald-400/20 bg-black/30 text-emerald-200/70"
              } ${multiBuy ? "opacity-50" : ""}`}
              onClick={() => setBuyPriceUnit(u)}
            >
              NPR / {u === "gram" ? "g" : "tola"}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">
            Purchase price ({buyPriceUnit === "gram" ? "NPR per gram" : "NPR per tola"})
          </span>
          <input
            value={buyPriceStr}
            onChange={(e) => setBuyPriceStr(e.target.value)}
            inputMode="decimal"
            disabled={multiBuy}
            className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold disabled:opacity-60"
          />
        </label>
        {totalPreview != null ? (
          <p className="text-[10px] font-bold text-emerald-200/70">
            Total purchase cost (incl. fees):{" "}
            <span className="tabular-nums text-emerald-50">{formatMoney(totalPreview, "NPR")}</span>
          </p>
        ) : null}
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">
            Fees / making charges (NPR)
          </span>
          <input
            value={feesStr}
            onChange={(e) => setFeesStr(e.target.value)}
            inputMode="decimal"
            disabled={multiBuy}
            className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold disabled:opacity-60"
            placeholder="Optional"
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">Notes</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="wealth-input-text w-full px-2 py-1.5 text-xs font-semibold"
            placeholder="Optional"
          />
        </label>
        {err ? <p className="text-[11px] font-bold text-rose-300">{err}</p> : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={submit}
            className="rounded-xl bg-gradient-to-r from-amber-700 to-amber-600 px-5 py-2 text-xs font-black text-white shadow-lg shadow-amber-900/30 transition hover:from-amber-600 hover:to-amber-500"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-emerald-400/25 bg-black/30 px-4 py-2 text-xs font-black text-emerald-100/90 transition hover:border-emerald-400/40"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function MetalsPanel({
  rows,
  ledger,
  onChange: _onChange,
  onRemove,
  onMutate,
}: {
  rows: MetalRow[];
  ledger: readonly PortfolioLedgerEntry[];
  onChange: (id: string, patch: Partial<MetalRow>) => void;
  onRemove: (id: string) => void;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  void _onChange;
  const {
    bullionSpot,
    bullionError,
    usdPerNpr,
    bullionPriceLoading,
    bullionPriceRefreshing,
  } = useWealthPortfolio();
  const txnAnchorRef = useRef<HTMLDivElement>(null);
  const holdingsAnchorRef = useRef<HTMLDivElement>(null);
  const metalFormRef = useRef<MetalTxnFormHandle>(null);
  const [holdingsOpen, setHoldingsOpen] = useState(true);
  const [tradesOpen, setTradesOpen] = useState(true);
  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null);
  const syncLabel = bullionSpot?.updatedAt
    ? new Date(bullionSpot.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";
  const gramRates = resolveMetalGramRatesForUi(bullionSpot, usdPerNpr);
  const tolaRates = resolveMetalTolaRatesForUi(bullionSpot, usdPerNpr);
  const hasDomesticPrice =
    Boolean(bullionSpot?.nepalDomesticPrimary) &&
    (bullionSpot?.goldPerTolaNPR ?? 0) > 0 &&
    (bullionSpot?.silverPerTolaNPR ?? 0) > 0;
  const priceUnavailable =
    bullionSpot?.domesticProvider === "unavailable" ||
    (!bullionPriceLoading && !hasDomesticPrice && Boolean(bullionSpot || bullionError));
  const freshness = resolveNepalMarketFreshness({
    publishedDate: bullionSpot?.publishedDate,
    degraded: bullionSpot?.degraded,
    loading: bullionPriceLoading || bullionPriceRefreshing,
    hasPrice: hasDomesticPrice,
  });
  const statusLabel =
    freshness === "updated_today"
      ? "Updated Today"
      : freshness === "last_published"
        ? "Last Published Rate"
        : freshness === "stale"
          ? "Stale Data"
          : freshness === "updating"
            ? "Updating"
            : "Price Unavailable";
  const publishedLabel = bullionSpot?.publishedDate
    ? [
        bullionSpot.publishedDate,
        bullionSpot.publishedTimeLocal,
        bullionSpot.publishedBsLabel ? `(${bullionSpot.publishedBsLabel})` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  const formatDailyChange = (npr: number | null | undefined, pct: number | null | undefined) => {
    if (npr == null || !Number.isFinite(npr)) return null;
    const sign = npr >= 0 ? "+" : "";
    const pctPart =
      pct != null && Number.isFinite(pct)
        ? ` (${pct >= 0 ? "+" : ""}${pct.toLocaleString("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%)`
        : "";
    return `${sign}${formatMoney(npr, "NPR")}${pctPart}`;
  };
  const goldChange = formatDailyChange(bullionSpot?.goldDailyChangeNpr, bullionSpot?.goldDailyChangePct);
  const silverChange = formatDailyChange(bullionSpot?.silverDailyChangeNpr, bullionSpot?.silverDailyChangePct);

  const scrollToTransactions = () => {
    setTradesOpen(true);
    queueMicrotask(() => {
      txnAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <section className="gs-premium-shell wealth-glass rounded-[1.35rem] p-3 sm:rounded-[1.5rem] sm:p-3.5">
      {/* Nepal Market Price — Hamro Patro */}
      <div className="gs-live-strip mb-3 space-y-2 rounded-xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#062B24]/50 to-[#03100F]/90 px-2.5 py-2.5 sm:px-3">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-[#F8FAFC] sm:gap-3 sm:text-[11px]">
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#CBD5E1]/85">Nepal Market Price</p>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-black uppercase tracking-wider ${
              freshness === "updated_today"
                ? "border-[#4ADE80]/40 bg-[#4ADE80]/15 text-[#4ADE80]"
                : freshness === "stale" || freshness === "unavailable"
                  ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
                  : "border-[#CBD5E1]/25 bg-white/5 text-[#CBD5E1]/85"
            }`}
          >
            {freshness === "updated_today" ? (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ADE80] opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4ADE80]" />
              </span>
            ) : null}
            {statusLabel}
          </span>
          {publishedLabel ? (
            <span className="text-[#CBD5E1]/70">
              Published: <span className="text-[#F8FAFC]">{publishedLabel}</span>
            </span>
          ) : null}
          <span className="text-[#CBD5E1]/70">
            Synced: <span className="text-[#F8FAFC]">{syncLabel}</span>
          </span>
        </div>

        {priceUnavailable ? (
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-[10px] font-bold leading-snug text-amber-100/95 sm:text-[11px]">
            Price Unavailable — Hamro Patro Nepal rates could not be verified
            {bullionError ? ` (${bullionError})` : ""}. Portfolio does not treat Yahoo Finance as the Nepal market
            price.
          </p>
        ) : bullionSpot?.degraded ? (
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-[10px] font-bold leading-snug text-amber-100/95 sm:text-[11px]">
            Stale data — showing the last successfully verified Hamro Patro prices (published{" "}
            {bullionSpot.publishedDate ?? "—"}). A fresh sync will replace these when the source is reachable.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <div
            className={`rounded-lg border px-2 py-2 sm:px-2.5 ${
              bullionPriceLoading && !bullionSpot
                ? "border-[#D4AF37]/15 bg-black/20"
                : "border-[#D4AF37]/35 bg-[rgba(212,175,55,0.08)]"
            }`}
          >
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-[#F4D06F]/90">
              <span aria-hidden className="inline-block h-2 w-2 rounded-sm bg-[#F4D06F]" /> Gold Hallmark
            </p>
            {bullionPriceLoading && !bullionSpot ? (
              <div className="mt-1.5 space-y-1.5">
                <div className="h-4 max-w-[12rem] w-[75%] animate-pulse rounded bg-[#D4AF37]/10" />
                <div className="h-4 max-w-[10rem] w-[60%] animate-pulse rounded bg-[#D4AF37]/10" />
              </div>
            ) : priceUnavailable ? (
              <p className="mt-2 text-sm font-black text-[#CBD5E1]/50">—</p>
            ) : (
              <>
                <p className="mt-1 font-black tabular-nums text-[#F4D06F] sm:text-sm">
                  {formatMoney(gramRates.goldNprPerGram, "NPR")}
                  <span className="text-[10px] font-bold text-[#F4D06F]/70"> / g</span>
                </p>
                <p className="mt-0.5 text-[11px] font-bold tabular-nums text-[#D4AF37]/90">
                  {formatMoney(tolaRates.goldNprPerTola, "NPR")}
                  <span className="text-[10px] font-semibold text-[#D4AF37]/65"> / tola</span>
                </p>
                {goldChange ? (
                  <p
                    className={`mt-1 text-[10px] font-bold tabular-nums ${
                      (bullionSpot?.goldDailyChangeNpr ?? 0) >= 0 ? "text-[#4ADE80]" : "text-rose-300"
                    }`}
                  >
                    Daily: {goldChange}
                  </p>
                ) : null}
                {typeof bullionSpot?.goldNepalPer10GramNPR === "number" && bullionSpot.goldNepalPer10GramNPR > 0 ? (
                  <p className="mt-1 border-t border-[#D4AF37]/15 pt-1 text-[9px] font-bold text-[#CBD5E1]/55">
                    Per 10 g: {formatMoney(bullionSpot.goldNepalPer10GramNPR, "NPR")}
                  </p>
                ) : null}
              </>
            )}
          </div>
          <div
            className={`rounded-lg border px-2 py-2 sm:px-2.5 ${
              bullionPriceLoading && !bullionSpot
                ? "border-[#94A3B8]/15 bg-black/20"
                : "border-[#94A3B8]/35 bg-[rgba(148,163,184,0.08)]"
            }`}
          >
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-[#CBD5E1]/90">
              <span aria-hidden className="inline-block h-2 w-2 rounded-sm bg-[#CBD5E1]" /> Silver
            </p>
            {bullionPriceLoading && !bullionSpot ? (
              <div className="mt-1.5 space-y-1.5">
                <div className="h-4 max-w-[12rem] w-[75%] animate-pulse rounded bg-[#94A3B8]/10" />
                <div className="h-4 max-w-[10rem] w-[60%] animate-pulse rounded bg-[#94A3B8]/10" />
              </div>
            ) : priceUnavailable ? (
              <p className="mt-2 text-sm font-black text-[#CBD5E1]/50">—</p>
            ) : (
              <>
                <p className="mt-1 font-black tabular-nums text-[#E2E8F0] sm:text-sm">
                  {formatMoney(gramRates.silverNprPerGram, "NPR")}
                  <span className="text-[10px] font-bold text-[#CBD5E1]/70"> / g</span>
                </p>
                <p className="mt-0.5 text-[11px] font-bold tabular-nums text-[#CBD5E1]/90">
                  {formatMoney(tolaRates.silverNprPerTola, "NPR")}
                  <span className="text-[10px] font-semibold text-[#CBD5E1]/65"> / tola</span>
                </p>
                {silverChange ? (
                  <p
                    className={`mt-1 text-[10px] font-bold tabular-nums ${
                      (bullionSpot?.silverDailyChangeNpr ?? 0) >= 0 ? "text-[#4ADE80]" : "text-rose-300"
                    }`}
                  >
                    Daily: {silverChange}
                  </p>
                ) : null}
                {typeof bullionSpot?.silverNepalPer10GramNPR === "number" && bullionSpot.silverNepalPer10GramNPR > 0 ? (
                  <p className="mt-1 border-t border-[#94A3B8]/15 pt-1 text-[9px] font-bold text-[#CBD5E1]/55">
                    Per 10 g: {formatMoney(bullionSpot.silverNepalPer10GramNPR, "NPR")}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

        <p className="text-[10px] font-bold leading-snug text-[#CBD5E1]/60 sm:text-[11px]">
          <span className="text-[#CBD5E1]/45">Source:</span>{" "}
          <a
            href={bullionSpot?.sourceUrl ?? HAMRO_PATRO_GOLD_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-black text-[#F4D06F] underline-offset-2 hover:underline"
          >
            Hamro Patro
          </a>
          <span className="mx-1.5 text-[#10B981]/40">·</span>
          UI 1 tola = {NEPAL_UI_GRAMS_PER_TOLA} g
          {bullionSpot?.internationalRefSource ? (
            <>
              <span className="mx-1.5 text-[#10B981]/40">·</span>
              <span className="text-[#CBD5E1]/45">Intl ref:</span> {bullionSpot.internationalRefSource}
            </>
          ) : null}
        </p>
      </div>

      <MetalsPremiumDashboard
        rows={rows}
        gramRates={gramRates}
        ledger={ledger}
        onAddGold={() => {
          scrollToTransactions();
          metalFormRef.current?.openBuyForMetal("gold");
        }}
        onAddSilver={() => {
          scrollToTransactions();
          metalFormRef.current?.openBuyForMetal("silver");
        }}
        onTrades={scrollToTransactions}
        onUploadBills={() => {
          scrollToTransactions();
          queueMicrotask(() => metalFormRef.current?.focusBillsInput());
        }}
        onMutate={onMutate}
      />

      {/* Individual holdings — collapsible, all features preserved */}
      <div ref={holdingsAnchorRef} className="mb-3 mt-1">
        <button
          type="button"
          onClick={() => setHoldingsOpen((o) => !o)}
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-[#10B981]/25 bg-[#062B24]/40 px-3 py-2.5 text-left transition hover:border-[#10B981]/40"
          aria-expanded={holdingsOpen}
        >
          <span className="text-xs font-black uppercase tracking-[0.1em] text-[#F8FAFC]">
            Individual Holdings
            <span className="ml-2 font-bold normal-case tracking-normal text-[#CBD5E1]/55">
              ({rows.length})
            </span>
          </span>
          <ChevronDown
            size={18}
            className={`shrink-0 text-[#CBD5E1]/70 transition ${holdingsOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {holdingsOpen ? (
      <div className="mt-2 space-y-3">
        {editingHoldingId ? (
          (() => {
            const editingRow = rows.find((r) => r.id === editingHoldingId);
            if (!editingRow) return null;
            return (
              <EditMetalHoldingForm
                key={editingRow.id}
                row={editingRow}
                ledger={ledger}
                onMutate={onMutate}
                onCancel={() => setEditingHoldingId(null)}
              />
            );
          })()
        ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.length === 0 ? (
          <p className="col-span-full rounded-xl border border-white/10 bg-black/25 px-3 py-4 text-center text-[12px] font-semibold text-[#CBD5E1]/65">
            No individual holdings yet. Use + Gold or + Silver to add items.
          </p>
        ) : null}
        {rows.map((row) => {
          const g = row.grams ?? 0;
          const uiRates = resolveMetalGramRatesForUi(bullionSpot, usdPerNpr);
          const rate = row.metal === "gold" ? uiRates.goldNprPerGram : uiRates.silverNprPerGram;
          const total = g * rate;
          const basis = row.totalCostBasisNpr;
          const unrealizedNpr = typeof basis === "number" && basis > 0 && g > 0 ? total - basis : null;
          const roi = basis != null && basis > 0 ? roiPct(basis, total) : null;
          const firstBuyIso = metalRowFirstBuyIso(row, ledger);
          const start = parsePurchaseIso(firstBuyIso);
          const daysHeld = start ? calendarDaysInvested(start, new Date()) : null;
          const holdLabel = daysHeld != null ? formatHoldingDurationApprox(daysHeld) : "—";
          const cover = metalItemCoverFromLedger(row.id, ledger);
          const metalLabel = row.metal === "gold" ? "Gold" : "Silver";
          const isEditingThis = editingHoldingId === row.id;
          return (
            <div
              key={row.id}
              className={`wealth-row-card flex gap-2 rounded-xl border p-2.5 sm:p-3 ${
                isEditingThis ? "border-[#D4AF37]/45 bg-[#D4AF37]/08" : "border-emerald-400/10"
              }`}
            >
              {cover ? (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-amber-400/25 bg-black/40 sm:h-[4.5rem] sm:w-[4.5rem]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div
                  className={`grid h-16 w-16 shrink-0 place-items-center rounded-lg border text-[10px] font-black uppercase sm:h-[4.5rem] sm:w-[4.5rem] ${
                    row.metal === "gold"
                      ? "border-amber-400/35 bg-amber-500/15 text-amber-100"
                      : "border-slate-400/35 bg-slate-500/15 text-slate-100"
                  }`}
                >
                  {metalLabel}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-emerald-50 sm:text-sm">{row.name || `${metalLabel} item`}</p>
                <dl className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-bold leading-tight sm:text-[11px]">
                  <div className="text-emerald-200/55">Qty</div>
                  <div className="text-end tabular-nums text-emerald-50">
                    {g > 0 ? (
                      <>
                        {g.toLocaleString(undefined, { maximumFractionDigits: 4 })} g
                        <span className="block text-[9px] font-semibold text-emerald-200/45">
                          ~{gramsToTolaUi(g).toFixed(4)} tola
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div className="text-emerald-200/55">Cost basis</div>
                  <div className="text-end tabular-nums text-emerald-50">
                    {basis != null && basis > 0 ? formatMoney(basis, "NPR") : "—"}
                  </div>
                  <div className="text-emerald-200/55">Value</div>
                  <div className="text-end font-black tabular-nums text-amber-100">
                    {g > 0 ? formatMoney(total, "NPR") : "—"}
                  </div>
                  <div className="text-emerald-200/55">P/L</div>
                  <div className="text-end">
                    {unrealizedNpr != null ? (
                      <span
                        className={`tabular-nums ${unrealizedNpr >= 0 ? "text-lime-300" : "text-rose-300"}`}
                      >
                        {unrealizedNpr >= 0 ? "+" : ""}
                        {formatMoney(unrealizedNpr, "NPR")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div className="text-emerald-200/55">ROI</div>
                  <div className={`text-end tabular-nums ${roi != null && roi >= 0 ? "text-lime-300" : roi != null ? "text-rose-300" : "text-emerald-200/50"}`}>
                    {roi != null ? `${roi >= 0 ? "+" : ""}${roi.toFixed(2)}%` : "—"}
                  </div>
                  <div className="text-emerald-200/55">Held</div>
                  <div className="text-end text-emerald-100/90">{holdLabel}</div>
                </dl>
              </div>
              <div className="flex shrink-0 flex-col gap-1 self-start">
                <button
                  type="button"
                  aria-label={`Edit ${row.name || metalLabel} holding`}
                  title="Edit holding"
                  onClick={() => {
                    setHoldingsOpen(true);
                    setEditingHoldingId(row.id);
                    queueMicrotask(() => {
                      document.getElementById("edit-metal-holding")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    });
                  }}
                  className={`rounded-lg border p-1.5 transition ${
                    isEditingThis
                      ? "border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#F4D06F]"
                      : "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#F4D06F]/90 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/18"
                  }`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${row.name || metalLabel} holding`}
                  title="Delete holding"
                  onClick={() => {
                    const label = (row.name || metalLabel).trim() || "this holding";
                    if (
                      !window.confirm(
                        `Delete ${label}?\n\nThis removes the holding from your portfolio. No sell transaction is recorded.`,
                      )
                    ) {
                      return;
                    }
                    if (editingHoldingId === row.id) setEditingHoldingId(null);
                    onRemove(row.id);
                    toast.success("Holding deleted.");
                  }}
                  className="rounded-lg p-1.5 text-emerald-300/40 transition hover:bg-rose-500/15 hover:text-rose-300"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      </div>
        ) : null}
      </div>

      {/* Transactions + ledger — collapsible, full functionality preserved */}
      <div ref={txnAnchorRef} className="mt-1 space-y-2">
        <button
          type="button"
          onClick={() => setTradesOpen((o) => !o)}
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-[#10B981]/25 bg-[#062B24]/40 px-3 py-2.5 text-left transition hover:border-[#10B981]/40"
          aria-expanded={tradesOpen}
        >
          <span className="text-xs font-black uppercase tracking-[0.1em] text-[#F8FAFC]">
            Trades &amp; Transaction History
          </span>
          <ChevronDown
            size={18}
            className={`shrink-0 text-[#CBD5E1]/70 transition ${tradesOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {/* Keep mounted when collapsed so Quick Action refs stay valid */}
        <div className={`space-y-3 ${tradesOpen ? "" : "hidden"}`} hidden={!tradesOpen}>
          <UniversalMetalTransactionForm ref={metalFormRef} rows={rows} onMutate={onMutate} />
          <ModuleLedgerCard
            bucket="metal"
            ledger={ledger}
            title="Gold & Silver ledger"
            subtitle="Each row keeps its own bills and photos forever. Filter, search, and manage bills from each row."
            ledgerMutate={onMutate}
            onEditMetalEntry={(entry) => {
              setTradesOpen(true);
              queueMicrotask(() => metalFormRef.current?.openEditEntry(entry));
            }}
          />
        </div>
      </div>

      <MetalsDownloadBillsSection ledger={ledger} />
    </section>
  );
}
