import { addDividendIncomeToCashflowStorage } from "@/components/cashflow/portfolio-dividend-sync";
import { lineToNpr } from "@/components/portfolio/calculations";
import type {
  FifoPositionLot,
  InvestmentRow,
  MetalRow,
  PortfolioLedgerEntry,
  WealthPortfolioStateV2,
} from "@/components/portfolio/types";
import { sanitizeMetalTxBillUrls, sanitizeMetalTxPhotoUrls } from "@/components/portfolio/metal-photo-utils";
import type { PortfolioDisplayCurrency } from "@/lib/portfolio-convert";
import { NEPAL_UI_GRAMS_PER_TOLA } from "@/lib/portfolio/nepal-metal-ui-convert";

function ledgerNewId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type LedgerFx = { krwPerNpr: number; usdPerNpr: number };

export type InvestmentTradePayload = {
  quantity: number;
  unitPrice: number;
  currency: PortfolioDisplayCurrency;
  tradeDate: string;
  fees?: number;
  notes?: string;
  /** Distinguishes IPO, rights, and secondary-market buys in the ledger. */
  ledgerFlow?: "market_buy" | "ipo" | "right_share";
  /** Optional fee split for display; summed `fees` remains the calculation input. */
  brokerage?: number;
  otherCharges?: number;
  /**
   * Marks ledger rows as portfolio tracking only (no live broker order).
   * Kept for future broker/API integration without changing mutation semantics.
   */
  portfolioTrackingOnly?: boolean;
};

export type CashDividendPayload = {
  grossAmount: number;
  currency: PortfolioDisplayCurrency;
  tradeDate: string;
  fees?: number;
  notes?: string;
};

export type BonusSharePayload = {
  bonusQuantity: number;
  tradeDate: string;
  notes?: string;
};

export type MetalSellPayload = {
  grams: number;
  unitPriceNprPerGram: number;
  tradeDate: string;
  feesNpr?: number;
  notes?: string;
  billAttachmentUrls?: string[];
  photoAttachmentUrls?: string[];
};

export type CashflowPayload = {
  amount: number;
  tradeDate: string;
  fees?: number;
  notes?: string;
};

export type MetalBuyPayload = {
  metal: "gold" | "silver";
  /**
   * When set, buy adds to this item row (must exist and match `metal`).
   * When omitted, a new item row is created using `itemName`.
   */
  existingRowId?: string | null;
  /** Required for new items; trimmed to name the created row. */
  itemName: string;
  grams: number;
  tradeDate: string;
  /** NPR per gram or per UI tola (11.66 g), per `buyPriceUnit`. */
  buyPriceNpr: number;
  buyPriceUnit: "gram" | "tola";
  feesNpr?: number;
  notes?: string;
  billAttachmentUrls?: string[];
  photoAttachmentUrls?: string[];
};

function isoOk(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function cloneLots(row: InvestmentRow): FifoPositionLot[] {
  if (row.fifoLots && row.fifoLots.length > 0) {
    return row.fifoLots.map((l) => ({ ...l }));
  }
  const q = row.quantity ?? 0;
  const p = row.buyPrice ?? 0;
  if (q <= 0 || p <= 0) return [];
  return [
    {
      id: ledgerNewId(),
      quantity: q,
      unitCost: p,
      currency: row.currency,
      openedAt: row.purchaseDate ?? new Date().toISOString().slice(0, 10),
    },
  ];
}

function sortLotsFifo(lots: FifoPositionLot[]): FifoPositionLot[] {
  return [...lots].sort((a, b) => a.openedAt.localeCompare(b.openedAt));
}

function weightedUnitCost(lots: FifoPositionLot[]): number | undefined {
  const tq = lots.reduce((a, l) => a + l.quantity, 0);
  if (tq <= 0) return undefined;
  return lots.reduce((a, l) => a + l.quantity * l.unitCost, 0) / tq;
}

const MAX_LEDGER = 2500;

function appendEntry(state: WealthPortfolioStateV2, entry: PortfolioLedgerEntry): WealthPortfolioStateV2 {
  const next = [...state.ledger, entry];
  return { ...state, ledger: next.length > MAX_LEDGER ? next.slice(-MAX_LEDGER) : next };
}

/**
 * Preview FIFO sell P/L without mutating portfolio state.
 * Returns null when quantity exceeds available holdings or inputs are invalid.
 */
export function estimateInvestmentSellRealized(
  row: InvestmentRow,
  input: Pick<InvestmentTradePayload, "quantity" | "unitPrice" | "currency" | "fees">,
  fx: LedgerFx,
): { availableQty: number; costNpr: number; proceedsNpr: number; feesNpr: number; realizedGainNpr: number } | null {
  if (input.quantity <= 0 || !Number.isFinite(input.quantity)) return null;
  if (input.unitPrice < 0 || !Number.isFinite(input.unitPrice)) return null;

  const lots = cloneLots(row);
  const availableQty = lots.reduce((a, l) => a + l.quantity, 0);
  if (input.quantity > availableQty + 1e-9) {
    return { availableQty, costNpr: 0, proceedsNpr: 0, feesNpr: 0, realizedGainNpr: 0 };
  }

  let remaining = input.quantity;
  let costNpr = 0;
  for (const lot of sortLotsFifo(lots)) {
    if (remaining <= 0) break;
    const take = Math.min(lot.quantity, remaining);
    const unitCostNpr = lineToNpr(lot.unitCost, lot.currency, fx.krwPerNpr, fx.usdPerNpr);
    costNpr += take * unitCostNpr;
    remaining -= take;
  }

  const proceedsNpr = lineToNpr(input.quantity * input.unitPrice, input.currency, fx.krwPerNpr, fx.usdPerNpr);
  const feesNpr = lineToNpr(input.fees ?? 0, input.currency, fx.krwPerNpr, fx.usdPerNpr);
  return {
    availableQty,
    costNpr,
    proceedsNpr,
    feesNpr,
    realizedGainNpr: proceedsNpr - costNpr - feesNpr,
  };
}

/** FIFO sell against `fifoLots` (or legacy qty/buyPrice → single lot). */
export function recordInvestmentSell(
  state: WealthPortfolioStateV2,
  rowId: string,
  input: InvestmentTradePayload,
  fx: LedgerFx,
): WealthPortfolioStateV2 | null {
  if (!isoOk(input.tradeDate)) return null;
  if (input.quantity <= 0 || !Number.isFinite(input.quantity)) return null;
  if (input.unitPrice < 0 || !Number.isFinite(input.unitPrice)) return null;

  const idx = state.investments.findIndex((r) => r.id === rowId);
  if (idx < 0) return null;
  const row = state.investments[idx];
  const lots = cloneLots(row);
  const totalAvail = lots.reduce((a, l) => a + l.quantity, 0);
  if (input.quantity > totalAvail + 1e-9) return null;

  let remaining = input.quantity;
  let costNpr = 0;
  const fifoSlices: { lotId: string; quantity: number; unitCostNpr: number }[] = [];
  const afterLots: FifoPositionLot[] = [];

  for (const lot of sortLotsFifo(lots)) {
    if (remaining <= 0) {
      afterLots.push(lot);
      continue;
    }
    const take = Math.min(lot.quantity, remaining);
    const unitCostNpr = lineToNpr(lot.unitCost, lot.currency, fx.krwPerNpr, fx.usdPerNpr);
    costNpr += take * unitCostNpr;
    fifoSlices.push({ lotId: lot.id, quantity: take, unitCostNpr });
    remaining -= take;
    const left = lot.quantity - take;
    if (left > 1e-12) afterLots.push({ ...lot, quantity: left });
  }

  const proceedsNpr = lineToNpr(input.quantity * input.unitPrice, input.currency, fx.krwPerNpr, fx.usdPerNpr);
  const feesNpr = lineToNpr(input.fees ?? 0, input.currency, fx.krwPerNpr, fx.usdPerNpr);
  const realizedGainNpr = proceedsNpr - costNpr - feesNpr;

  const newQty = afterLots.reduce((a, l) => a + l.quantity, 0);
  const newBuy = newQty > 0 ? weightedUnitCost(afterLots) : undefined;

  const entry: PortfolioLedgerEntry = {
    id: ledgerNewId(),
    txType: "sell",
    bucket: "investment",
    rowId,
    assetLabel: row.name || row.kind,
    ledgerAction: "Sell",
    investmentKind: row.kind,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    currency: input.currency,
    tradeDate: input.tradeDate,
    fees: input.fees,
    notes: input.notes?.trim() || undefined,
    realizedGainNpr,
    meta: {
      fifoVersion: 1,
      fifoMethod: "FIFO",
      fifoLotSlices: fifoSlices,
      proceedsNpr,
      costNpr,
      feesNpr,
      ...(input.brokerage != null ? { brokerage: input.brokerage } : {}),
      ...(input.otherCharges != null ? { otherCharges: input.otherCharges } : {}),
      ...(input.portfolioTrackingOnly ? { portfolioTrackingOnly: true } : {}),
    },
  };

  const updatedRow: InvestmentRow = {
    ...row,
    fifoLots: newQty > 0 ? afterLots : undefined,
    quantity: newQty,
    buyPrice: newBuy,
  };

  const investments = [...state.investments];
  investments[idx] = updatedRow;
  return appendEntry({ ...state, investments }, entry);
}

function dividendNetNprFromGrossLocal(
  grossAmount: number,
  currency: PortfolioDisplayCurrency,
  fees: number | undefined,
  fx: LedgerFx,
): number {
  const grossNpr = lineToNpr(grossAmount, currency, fx.krwPerNpr, fx.usdPerNpr);
  const feesNpr = lineToNpr(fees ?? 0, currency, fx.krwPerNpr, fx.usdPerNpr);
  return Math.max(0, grossNpr - feesNpr);
}

/** Add units (FIFO buy / top-up). AVCO across existing lots + new purchase. */
export function recordInvestmentBuy(
  state: WealthPortfolioStateV2,
  rowId: string,
  input: InvestmentTradePayload,
  _fx: LedgerFx,
): WealthPortfolioStateV2 | null {
  void _fx;
  if (!isoOk(input.tradeDate)) return null;
  if (input.quantity <= 0 || !Number.isFinite(input.quantity)) return null;
  if (input.unitPrice < 0 || !Number.isFinite(input.unitPrice)) return null;

  const idx = state.investments.findIndex((r) => r.id === rowId);
  if (idx < 0) return null;
  const row = state.investments[idx];

  const newLot: FifoPositionLot = {
    id: ledgerNewId(),
    quantity: input.quantity,
    unitCost: input.unitPrice,
    currency: input.currency,
    openedAt: input.tradeDate,
    fees: input.fees,
  };

  const lots = cloneLots(row);
  lots.push(newLot);
  const newQty = lots.reduce((a, l) => a + l.quantity, 0);
  const newBuy = weightedUnitCost(lots);

  const flow = input.ledgerFlow ?? "market_buy";
  const isRight = flow === "right_share";
  const entry: PortfolioLedgerEntry = {
    id: ledgerNewId(),
    txType: isRight ? "right_share" : "buy",
    bucket: "investment",
    rowId,
    assetLabel: row.name || row.kind,
    ledgerAction: flow === "ipo" ? "IPO" : isRight ? "Right share" : "Buy",
    investmentKind: row.kind,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    currency: input.currency,
    tradeDate: input.tradeDate,
    fees: input.fees,
    notes: input.notes?.trim() || undefined,
    realizedGainNpr: null,
    meta: {
      fifoVersion: 1,
      fifoMethod: "FIFO",
      ledgerFlow: flow,
      ...(input.brokerage != null ? { brokerage: input.brokerage } : {}),
      ...(input.otherCharges != null ? { otherCharges: input.otherCharges } : {}),
      ...(input.portfolioTrackingOnly ? { portfolioTrackingOnly: true } : {}),
    },
  };

  const updatedRow: InvestmentRow = {
    ...row,
    fifoLots: lots,
    quantity: newQty,
    buyPrice: newBuy,
  };

  const investments = [...state.investments];
  investments[idx] = updatedRow;
  return appendEntry({ ...state, investments }, entry);
}

/** Rights issue: same FIFO merge as a buy; ledger marks `right_share`. */
export function recordInvestmentRightShare(
  state: WealthPortfolioStateV2,
  rowId: string,
  input: InvestmentTradePayload,
  fx: LedgerFx,
): WealthPortfolioStateV2 | null {
  return recordInvestmentBuy(state, rowId, { ...input, ledgerFlow: "right_share" }, fx);
}

/** Bonus shares: increases quantity at zero incremental cash; lowers average cost per share. */
export function recordInvestmentBonusShare(
  state: WealthPortfolioStateV2,
  rowId: string,
  input: BonusSharePayload,
): WealthPortfolioStateV2 | null {
  if (!isoOk(input.tradeDate)) return null;
  if (input.bonusQuantity <= 0 || !Number.isFinite(input.bonusQuantity)) return null;

  const idx = state.investments.findIndex((r) => r.id === rowId);
  if (idx < 0) return null;
  const row = state.investments[idx];

  const newLot: FifoPositionLot = {
    id: ledgerNewId(),
    quantity: input.bonusQuantity,
    unitCost: 0,
    currency: row.currency,
    openedAt: input.tradeDate,
  };

  const lots = cloneLots(row);
  lots.push(newLot);
  const newQty = lots.reduce((a, l) => a + l.quantity, 0);
  const newBuy = weightedUnitCost(lots);

  const entry: PortfolioLedgerEntry = {
    id: ledgerNewId(),
    txType: "bonus_share",
    bucket: "investment",
    rowId,
    assetLabel: row.name || row.kind,
    ledgerAction: "Bonus share",
    investmentKind: row.kind,
    quantity: input.bonusQuantity,
    unitPrice: 0,
    currency: row.currency,
    tradeDate: input.tradeDate,
    notes: input.notes?.trim() || undefined,
    realizedGainNpr: undefined,
    meta: { fifoVersion: 1, fifoMethod: "FIFO", ledgerFlow: "bonus_share" },
  };

  const updatedRow: InvestmentRow = {
    ...row,
    fifoLots: lots,
    quantity: newQty,
    buyPrice: newBuy,
  };

  const investments = [...state.investments];
  investments[idx] = updatedRow;
  return appendEntry({ ...state, investments }, entry);
}

/** Cash dividend: ledger entry only; bumps Cashflow dividend income (NPR net). */
export function recordInvestmentCashDividend(
  state: WealthPortfolioStateV2,
  rowId: string,
  input: CashDividendPayload,
  fx: LedgerFx,
  cashflowUserId?: string | null,
): WealthPortfolioStateV2 | null {
  if (!isoOk(input.tradeDate)) return null;
  if (input.grossAmount <= 0 || !Number.isFinite(input.grossAmount)) return null;

  const idx = state.investments.findIndex((r) => r.id === rowId);
  if (idx < 0) return null;
  const row = state.investments[idx];

  const netNpr = dividendNetNprFromGrossLocal(input.grossAmount, input.currency, input.fees, fx);

  const entry: PortfolioLedgerEntry = {
    id: ledgerNewId(),
    txType: "cash_dividend",
    bucket: "investment",
    rowId,
    assetLabel: row.name || row.kind,
    ledgerAction: "Cash dividend",
    investmentKind: row.kind,
    quantity: input.grossAmount,
    unitPrice: 1,
    currency: input.currency,
    tradeDate: input.tradeDate,
    fees: input.fees,
    notes: input.notes?.trim() || undefined,
    realizedGainNpr: undefined,
    meta: {
      dividendGrossInCcy: input.grossAmount,
      dividendNetNpr: netNpr,
    },
  };

  addDividendIncomeToCashflowStorage(netNpr, cashflowUserId);
  return appendEntry(state, entry);
}

function syncMetalLegacyBuyPriceFields(row: MetalRow): MetalRow {
  const g = row.grams ?? 0;
  const b = row.totalCostBasisNpr;
  if (g > 1e-9 && typeof b === "number" && b > 0) {
    return {
      ...row,
      metalBuyPriceAmount: Math.round((b / g) * 1e6) / 1e6,
      metalBuyPriceUnit: "gram",
    };
  }
  return { ...row, metalBuyPriceAmount: undefined, metalBuyPriceUnit: undefined };
}

function minPurchaseIso(a: string | undefined, b: string): string | undefined {
  if (!isoOk(b)) return a;
  if (!a || !isoOk(a)) return b;
  return a <= b ? a : b;
}

export function recordMetalSell(
  state: WealthPortfolioStateV2,
  rowId: string,
  input: MetalSellPayload,
): WealthPortfolioStateV2 | null {
  if (!isoOk(input.tradeDate)) return null;
  if (input.grams <= 0 || !Number.isFinite(input.grams)) return null;
  if (input.unitPriceNprPerGram < 0 || !Number.isFinite(input.unitPriceNprPerGram)) return null;

  const idx = state.metals.findIndex((r) => r.id === rowId);
  if (idx < 0) return null;
  const row = state.metals[idx];
  const g0 = row.grams ?? 0;
  if (input.grams > g0 + 1e-9) return null;

  const proceedsNpr = input.grams * input.unitPriceNprPerGram;
  const feesNpr = input.feesNpr ?? 0;
  let costNpr = 0;
  let realizedGainNpr: number | null = null;
  const basis = row.totalCostBasisNpr;
  if (basis != null && basis > 0 && g0 > 0) {
    costNpr = (input.grams / g0) * basis;
    realizedGainNpr = proceedsNpr - costNpr - feesNpr;
  }

  const newGrams = Math.max(0, g0 - input.grams);
  let newBasis = row.totalCostBasisNpr;
  if (newBasis != null && newBasis > 0 && g0 > 0) {
    newBasis = Math.max(0, newBasis - costNpr);
    if (newGrams < 1e-9) newBasis = undefined;
  }

  const billUrls = sanitizeMetalTxBillUrls(input.billAttachmentUrls ?? []);
  const photoUrls = sanitizeMetalTxPhotoUrls(input.photoAttachmentUrls ?? []);
  const metaSell: Record<string, unknown> = { fifoVersion: 1, proceedsNpr, costNpr, feesNpr, unit: "grams" };
  if (billUrls.length) metaSell.metalTxBillUrls = billUrls;
  if (photoUrls.length) metaSell.metalTxPhotoUrls = photoUrls;

  const entry: PortfolioLedgerEntry = {
    id: ledgerNewId(),
    txType: "sell",
    bucket: "metal",
    rowId,
    assetLabel: (row.name ?? "").trim() || (row.metal === "gold" ? "Gold" : "Silver"),
    ledgerAction: "Sell",
    metal: row.metal,
    quantity: input.grams,
    unitPrice: input.unitPriceNprPerGram,
    currency: "NPR",
    tradeDate: input.tradeDate,
    fees: input.feesNpr,
    notes: input.notes?.trim() || undefined,
    realizedGainNpr,
    meta: metaSell,
  };

  const updatedRow: MetalRow = syncMetalLegacyBuyPriceFields({
    ...row,
    grams: newGrams > 0 ? newGrams : 0,
    totalCostBasisNpr: newBasis,
  });

  const metals = [...state.metals];
  metals[idx] = updatedRow;
  return appendEntry({ ...state, metals }, entry);
}

export type MetalTxnUpdatePayload = {
  tradeDate: string;
  grams: number;
  /** Buy: NPR per gram or per UI tola (11.66 g), per `buyPriceUnit`. */
  buyPriceNpr?: number;
  buyPriceUnit?: "gram" | "tola";
  /** Sell: NPR per gram. */
  unitPriceNprPerGram?: number;
  feesNpr?: number;
  notes?: string;
  billAttachmentUrls?: string[];
  photoAttachmentUrls?: string[];
};

/**
 * Update an existing metal ledger entry in place (same `id`).
 * Rebuilds the linked MetalRow and re-validates the buy/sell sequence for that row
 * so holdings cannot go negative. Does not create a duplicate transaction.
 */
export function updateMetalTxn(
  state: WealthPortfolioStateV2,
  entryId: string,
  patch: MetalTxnUpdatePayload,
): WealthPortfolioStateV2 | null {
  if (!isoOk(patch.tradeDate)) return null;
  if (patch.grams <= 0 || !Number.isFinite(patch.grams)) return null;
  const feesNpr = patch.feesNpr ?? 0;
  if (!Number.isFinite(feesNpr) || feesNpr < 0) return null;

  const entryIdx = state.ledger.findIndex((e) => e.id === entryId && e.bucket === "metal");
  if (entryIdx < 0) return null;
  const original = state.ledger[entryIdx]!;
  if (original.txType !== "buy" && original.txType !== "sell") return null;

  const rowIdx = state.metals.findIndex((r) => r.id === original.rowId);
  if (rowIdx < 0) return null;
  const row = state.metals[rowIdx]!;

  let unitPriceNprPerGram: number;
  let buyPriceUnit: "gram" | "tola" | undefined;
  let metalBuyPriceNpr: number | undefined;

  if (original.txType === "buy") {
    if (patch.buyPriceNpr == null || !Number.isFinite(patch.buyPriceNpr) || patch.buyPriceNpr <= 0) return null;
    buyPriceUnit = patch.buyPriceUnit === "tola" ? "tola" : "gram";
    metalBuyPriceNpr = patch.buyPriceNpr;
    unitPriceNprPerGram =
      buyPriceUnit === "tola" ? patch.buyPriceNpr / NEPAL_UI_GRAMS_PER_TOLA : patch.buyPriceNpr;
    if (!Number.isFinite(unitPriceNprPerGram) || unitPriceNprPerGram < 0) return null;
  } else {
    if (
      patch.unitPriceNprPerGram == null ||
      !Number.isFinite(patch.unitPriceNprPerGram) ||
      patch.unitPriceNprPerGram < 0
    ) {
      return null;
    }
    unitPriceNprPerGram = patch.unitPriceNprPerGram;
  }

  const billUrls = sanitizeMetalTxBillUrls(patch.billAttachmentUrls ?? []);
  const photoUrls = sanitizeMetalTxPhotoUrls(patch.photoAttachmentUrls ?? []);
  const prevMeta =
    original.meta && typeof original.meta === "object" ? { ...(original.meta as Record<string, unknown>) } : {};

  const nextMeta: Record<string, unknown> = {
    ...prevMeta,
    fifoVersion: 1,
    unit: "grams",
  };
  if (original.txType === "buy") {
    nextMeta.buyPriceUnit = buyPriceUnit;
    nextMeta.metalBuyPriceNpr = metalBuyPriceNpr;
    nextMeta.metalTxItemName = original.assetLabel;
    // basisNprAdded refreshed by replay
  }
  if (billUrls.length) nextMeta.metalTxBillUrls = billUrls;
  else delete nextMeta.metalTxBillUrls;
  if (photoUrls.length) nextMeta.metalTxPhotoUrls = photoUrls;
  else delete nextMeta.metalTxPhotoUrls;

  const updatedEntry: PortfolioLedgerEntry = {
    ...original,
    quantity: patch.grams,
    unitPrice: unitPriceNprPerGram,
    tradeDate: patch.tradeDate,
    fees: patch.feesNpr,
    notes: patch.notes?.trim() || undefined,
    meta: nextMeta,
  };

  const ledgerWithEdit = [...state.ledger];
  ledgerWithEdit[entryIdx] = updatedEntry;

  const rebuilt = rebuildMetalRowFromLedger(row, ledgerWithEdit);
  if (!rebuilt) return null;

  const metals = [...state.metals];
  metals[rowIdx] = rebuilt.row;
  return { ...state, metals, ledger: rebuilt.ledger };
}

export type MetalHoldingUpdatePayload = {
  name: string;
  tradeDate: string;
  /** Desired net held grams after edit (what Individual Holdings shows). */
  grams: number;
  buyPriceNpr: number;
  buyPriceUnit: "gram" | "tola";
  feesNpr?: number;
  notes?: string;
};

/**
 * Edit an existing Individual Holding (`MetalRow`) by id — no duplicate rows.
 * When a single anchor buy exists, updates that ledger entry in place and rebuilds
 * qty/basis (accounting for later sells). Orphan rows (no ledger) update MetalRow only.
 * Multi-buy holdings: name + notes/date on earliest buy only; economic qty/price edits rejected.
 */
export function updateMetalHolding(
  state: WealthPortfolioStateV2,
  rowId: string,
  patch: MetalHoldingUpdatePayload,
): WealthPortfolioStateV2 | null {
  const name = patch.name.replace(/\s+/g, " ").trim().slice(0, 120);
  if (!name) return null;
  if (!isoOk(patch.tradeDate)) return null;
  if (patch.grams < 0 || !Number.isFinite(patch.grams)) return null;
  if (patch.buyPriceNpr <= 0 || !Number.isFinite(patch.buyPriceNpr)) return null;
  const feesNpr = patch.feesNpr ?? 0;
  if (!Number.isFinite(feesNpr) || feesNpr < 0) return null;

  const rowIdx = state.metals.findIndex((r) => r.id === rowId);
  if (rowIdx < 0) return null;
  const row = state.metals[rowIdx]!;

  const buyPriceUnit = patch.buyPriceUnit === "tola" ? "tola" : "gram";
  const nprPerGram =
    buyPriceUnit === "tola" ? patch.buyPriceNpr / NEPAL_UI_GRAMS_PER_TOLA : patch.buyPriceNpr;
  if (!Number.isFinite(nprPerGram) || nprPerGram < 0) return null;

  const linked = state.ledger
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.bucket === "metal" && e.rowId === rowId && (e.txType === "buy" || e.txType === "sell"));
  const buys = linked.filter(({ e }) => e.txType === "buy");
  const sells = linked.filter(({ e }) => e.txType === "sell");

  // Orphan holding (no ledger trades) — update MetalRow in place only.
  if (linked.length === 0) {
    if (patch.grams <= 0) return null;
    const basis = patch.grams * nprPerGram + feesNpr;
    const metals = [...state.metals];
    metals[rowIdx] = syncMetalLegacyBuyPriceFields({
      ...row,
      name,
      grams: patch.grams,
      boughtDate: patch.tradeDate,
      totalCostBasisNpr: basis > 0 ? Math.round(basis * 100) / 100 : undefined,
    });
    return { ...state, metals };
  }

  if (buys.length === 0) return null; // sells without buys — refuse

  const buysSorted = [...buys].sort((a, b) => {
    if (a.e.tradeDate !== b.e.tradeDate) return a.e.tradeDate.localeCompare(b.e.tradeDate);
    return a.i - b.i;
  });
  const anchor = buysSorted[0]!;
  const soldGrams = sells.reduce((a, { e }) => a + (e.quantity || 0), 0);

  // Multi-buy: only rename (+ cascade labels); economic edits must go through transaction Edit.
  if (buys.length > 1) {
    const economicChange = Math.abs((row.grams ?? 0) - patch.grams) > 1e-6;
    if (economicChange) return null;

    const ledgerNext = [...state.ledger];
    for (const { e, i } of linked) {
      const meta: Record<string, unknown> =
        e.meta && typeof e.meta === "object" ? { ...(e.meta as Record<string, unknown>) } : { fifoVersion: 1 };
      meta.metalTxItemName = name;
      ledgerNext[i] = {
        ...e,
        assetLabel: name,
        meta,
        ...(e.id === anchor.e.id
          ? {
              tradeDate: patch.tradeDate,
              notes: patch.notes?.trim() || undefined,
            }
          : {}),
      };
    }
    const rebuilt = rebuildMetalRowFromLedger({ ...row, name }, ledgerNext);
    if (!rebuilt) return null;
    const metals = [...state.metals];
    metals[rowIdx] = rebuilt.row;
    return { ...state, metals, ledger: rebuilt.ledger };
  }

  // Single buy: buy quantity must cover sold grams + desired net held grams.
  const buyGrams = patch.grams + soldGrams;
  if (buyGrams <= 1e-9) return null;

  const entryIdx = anchor.i;
  const original = anchor.e;
  const prevMeta =
    original.meta && typeof original.meta === "object" ? { ...(original.meta as Record<string, unknown>) } : {};
  const nextMeta: Record<string, unknown> = {
    ...prevMeta,
    fifoVersion: 1,
    unit: "grams",
    buyPriceUnit,
    metalBuyPriceNpr: patch.buyPriceNpr,
    metalTxItemName: name,
  };

  const ledgerNext = [...state.ledger];
  ledgerNext[entryIdx] = {
    ...original,
    assetLabel: name,
    quantity: buyGrams,
    unitPrice: nprPerGram,
    tradeDate: patch.tradeDate,
    fees: patch.feesNpr,
    notes: patch.notes?.trim() || undefined,
    meta: nextMeta,
  };
  // Cascade name onto sell rows for the same holding.
  for (const { e, i } of sells) {
    const meta = e.meta && typeof e.meta === "object" ? { ...(e.meta as Record<string, unknown>) } : {};
    meta.metalTxItemName = name;
    ledgerNext[i] = { ...e, assetLabel: name, meta };
  }

  const rebuilt = rebuildMetalRowFromLedger({ ...row, name }, ledgerNext);
  if (!rebuilt) return null;
  // Net grams after rebuild must match desired (within float tolerance).
  if (Math.abs((rebuilt.row.grams ?? 0) - patch.grams) > 1e-4) return null;

  const metals = [...state.metals];
  metals[rowIdx] = rebuilt.row;
  return { ...state, metals, ledger: rebuilt.ledger };
}

/**
 * Replay metal buy/sell entries for one holding row (chronological).
 * Returns null if any sell would exceed available grams (invalid sequence).
 */
function rebuildMetalRowFromLedger(
  row: MetalRow,
  ledger: PortfolioLedgerEntry[],
): { row: MetalRow; ledger: PortfolioLedgerEntry[] } | null {
  const rowEntries = ledger
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.bucket === "metal" && e.rowId === row.id && (e.txType === "buy" || e.txType === "sell"))
    .sort((a, b) => {
      if (a.e.tradeDate !== b.e.tradeDate) return a.e.tradeDate.localeCompare(b.e.tradeDate);
      return a.i - b.i;
    });

  let grams = 0;
  let basis = 0;
  let boughtDate: string | undefined;
  const ledgerNext = [...ledger];

  for (const { e, i } of rowEntries) {
    const fees = e.fees ?? 0;
    if (e.txType === "buy") {
      if (e.quantity <= 0 || !Number.isFinite(e.quantity) || e.unitPrice < 0 || !Number.isFinite(e.unitPrice)) {
        return null;
      }
      const addBasis = e.quantity * e.unitPrice + fees;
      grams += e.quantity;
      basis += addBasis;
      boughtDate = minPurchaseIso(boughtDate, e.tradeDate);
      const meta: Record<string, unknown> =
        e.meta && typeof e.meta === "object" ? { ...(e.meta as Record<string, unknown>) } : { fifoVersion: 1 };
      meta.basisNprAdded = addBasis;
      meta.unit = "grams";
      ledgerNext[i] = { ...e, realizedGainNpr: null, meta };
    } else {
      if (e.quantity <= 0 || !Number.isFinite(e.quantity) || e.unitPrice < 0 || !Number.isFinite(e.unitPrice)) {
        return null;
      }
      if (e.quantity > grams + 1e-9) return null;
      const proceedsNpr = e.quantity * e.unitPrice;
      let costNpr = 0;
      let realizedGainNpr: number | null = null;
      if (basis > 0 && grams > 0) {
        costNpr = (e.quantity / grams) * basis;
        realizedGainNpr = proceedsNpr - costNpr - fees;
      }
      grams = Math.max(0, grams - e.quantity);
      basis = Math.max(0, basis - costNpr);
      if (grams < 1e-9) {
        grams = 0;
        basis = 0;
      }
      const meta: Record<string, unknown> =
        e.meta && typeof e.meta === "object" ? { ...(e.meta as Record<string, unknown>) } : { fifoVersion: 1 };
      meta.proceedsNpr = proceedsNpr;
      meta.costNpr = costNpr;
      meta.feesNpr = fees;
      meta.unit = "grams";
      ledgerNext[i] = { ...e, realizedGainNpr, meta };
    }
  }

  const updatedRow = syncMetalLegacyBuyPriceFields({
    ...row,
    grams: grams > 0 ? grams : 0,
    totalCostBasisNpr: basis > 0 ? Math.round(basis * 100) / 100 : undefined,
    boughtDate,
  });
  return { row: updatedRow, ledger: ledgerNext };
}

export function recordMetalBuy(state: WealthPortfolioStateV2, input: MetalBuyPayload): WealthPortfolioStateV2 | null {
  if (!isoOk(input.tradeDate)) return null;
  if (input.grams <= 0 || !Number.isFinite(input.grams)) return null;
  if (input.buyPriceNpr <= 0 || !Number.isFinite(input.buyPriceNpr)) return null;

  let nextState = state;
  let idx: number;

  const wantExisting = typeof input.existingRowId === "string" && input.existingRowId.trim().length > 0;
  if (wantExisting) {
    const rid = input.existingRowId!.trim();
    idx = nextState.metals.findIndex((r) => r.id === rid);
    if (idx < 0) return null;
    if (nextState.metals[idx]!.metal !== input.metal) return null;
  } else {
    const name = input.itemName.replace(/\s+/g, " ").trim().slice(0, 120);
    if (!name) return null;
    const newId = ledgerNewId();
    const newRow: MetalRow = { id: newId, metal: input.metal, name, grams: 0 };
    nextState = { ...state, metals: [...state.metals, newRow] };
    idx = nextState.metals.findIndex((r) => r.id === newId);
  }

  const row = nextState.metals[idx]!;
  const g0 = row.grams ?? 0;
  const newGrams = g0 + input.grams;
  const nprPerGram =
    input.buyPriceUnit === "tola" ? input.buyPriceNpr / NEPAL_UI_GRAMS_PER_TOLA : input.buyPriceNpr;
  if (!Number.isFinite(nprPerGram) || nprPerGram < 0) return null;
  const feesNpr = input.feesNpr ?? 0;
  const addBasis = input.grams * nprPerGram + feesNpr;
  const newBasisRaw = (row.totalCostBasisNpr ?? 0) + addBasis;
  const newBasis = newBasisRaw > 0 ? Math.round(newBasisRaw * 100) / 100 : undefined;

  const assetLabel = (row.name ?? "").trim() || (row.metal === "gold" ? "Gold" : "Silver");
  const billUrls = sanitizeMetalTxBillUrls(input.billAttachmentUrls ?? []);
  const photoUrls = sanitizeMetalTxPhotoUrls(input.photoAttachmentUrls ?? []);

  const meta: Record<string, unknown> = {
    fifoVersion: 1,
    basisNprAdded: addBasis,
    unit: "grams",
    buyPriceUnit: input.buyPriceUnit,
    metalBuyPriceNpr: input.buyPriceNpr,
    metalTxItemName: assetLabel,
  };
  if (billUrls.length) meta.metalTxBillUrls = billUrls;
  if (photoUrls.length) meta.metalTxPhotoUrls = photoUrls;

  const entry: PortfolioLedgerEntry = {
    id: ledgerNewId(),
    txType: "buy",
    bucket: "metal",
    rowId: row.id,
    assetLabel,
    ledgerAction: "Buy",
    metal: row.metal,
    quantity: input.grams,
    unitPrice: nprPerGram,
    currency: "NPR",
    tradeDate: input.tradeDate,
    fees: input.feesNpr,
    notes: input.notes?.trim() || undefined,
    realizedGainNpr: null,
    meta,
  };

  const updatedRow: MetalRow = syncMetalLegacyBuyPriceFields({
    ...row,
    grams: newGrams,
    totalCostBasisNpr: newBasis,
    boughtDate: minPurchaseIso(row.boughtDate, input.tradeDate),
  });

  const metals = [...nextState.metals];
  metals[idx] = updatedRow;
  return appendEntry({ ...nextState, metals }, entry);
}

export function recordLiquidCashAdd(
  state: WealthPortfolioStateV2,
  rowId: string,
  input: CashflowPayload,
  fx: LedgerFx,
): WealthPortfolioStateV2 | null {
  if (!isoOk(input.tradeDate)) return null;
  if (input.amount <= 0 || !Number.isFinite(input.amount)) return null;

  const idx = state.liquidCash.findIndex((r) => r.id === rowId);
  if (idx < 0) return null;
  const row = state.liquidCash[idx];
  const cur = row.amount ?? 0;
  const next = cur + input.amount;
  const feesNpr = lineToNpr(input.fees ?? 0, row.currency, fx.krwPerNpr, fx.usdPerNpr);

  const entry: PortfolioLedgerEntry = {
    id: ledgerNewId(),
    txType: "buy",
    bucket: "liquid_cash",
    rowId,
    assetLabel: row.name || "Cash",
    ledgerAction: "Add cash",
    quantity: input.amount,
    unitPrice: 1,
    currency: row.currency,
    tradeDate: input.tradeDate,
    fees: input.fees,
    notes: input.notes?.trim() || undefined,
    meta: { feesNpr },
  };

  const liquidCash = [...state.liquidCash];
  liquidCash[idx] = { ...row, amount: next };
  return appendEntry({ ...state, liquidCash }, entry);
}

export function recordLiquidCashWithdraw(
  state: WealthPortfolioStateV2,
  rowId: string,
  input: CashflowPayload,
  fx: LedgerFx,
): WealthPortfolioStateV2 | null {
  if (!isoOk(input.tradeDate)) return null;
  if (input.amount <= 0 || !Number.isFinite(input.amount)) return null;

  const idx = state.liquidCash.findIndex((r) => r.id === rowId);
  if (idx < 0) return null;
  const row = state.liquidCash[idx];
  const cur = row.amount ?? 0;
  if (input.amount > cur + 1e-9) return null;
  const next = Math.max(0, cur - input.amount);
  const feesNpr = lineToNpr(input.fees ?? 0, row.currency, fx.krwPerNpr, fx.usdPerNpr);

  const entry: PortfolioLedgerEntry = {
    id: ledgerNewId(),
    txType: "sell",
    bucket: "liquid_cash",
    rowId,
    assetLabel: row.name || "Cash",
    ledgerAction: "Withdraw",
    quantity: input.amount,
    unitPrice: 1,
    currency: row.currency,
    tradeDate: input.tradeDate,
    fees: input.fees,
    notes: input.notes?.trim() || undefined,
    realizedGainNpr: null,
    meta: { feesNpr },
  };

  const liquidCash = [...state.liquidCash];
  liquidCash[idx] = { ...row, amount: next };
  return appendEntry({ ...state, liquidCash }, entry);
}

export function recordRealEstateBuyProperty(
  state: WealthPortfolioStateV2,
  rowId: string,
  input: CashflowPayload,
): WealthPortfolioStateV2 | null {
  if (!isoOk(input.tradeDate)) return null;
  if (input.amount <= 0 || !Number.isFinite(input.amount)) return null;

  const idx = state.realEstate.findIndex((r) => r.id === rowId);
  if (idx < 0) return null;
  const row = state.realEstate[idx];
  const add = input.amount;
  const newPv = (row.purchaseValue ?? 0) + add;
  const newEv = (row.estimatedValue ?? 0) + add;

  const entry: PortfolioLedgerEntry = {
    id: ledgerNewId(),
    txType: "buy",
    bucket: "real_estate",
    rowId,
    assetLabel: [row.name, row.location?.trim()].filter(Boolean).join(" · ") || row.propertyType,
    ledgerAction: "Buy property",
    quantity: add,
    unitPrice: 1,
    currency: row.currency,
    tradeDate: input.tradeDate,
    fees: input.fees,
    notes: input.notes?.trim() || undefined,
    meta: { propertyType: row.propertyType },
  };

  const realEstate = [...state.realEstate];
  realEstate[idx] = { ...row, purchaseValue: newPv, estimatedValue: newEv };
  return appendEntry({ ...state, realEstate }, entry);
}

export function recordRealEstateSellProperty(
  state: WealthPortfolioStateV2,
  rowId: string,
  input: CashflowPayload,
): WealthPortfolioStateV2 | null {
  if (!isoOk(input.tradeDate)) return null;
  if (input.amount <= 0 || !Number.isFinite(input.amount)) return null;

  const idx = state.realEstate.findIndex((r) => r.id === rowId);
  if (idx < 0) return null;
  const row = state.realEstate[idx];
  const sub = input.amount;
  const curP = row.purchaseValue ?? 0;
  const curE = row.estimatedValue ?? 0;
  if (sub > Math.max(curP, curE) + 1e-6) return null;
  const newPv = Math.max(0, curP - sub);
  const newEv = Math.max(0, curE - sub);

  const entry: PortfolioLedgerEntry = {
    id: ledgerNewId(),
    txType: "sell",
    bucket: "real_estate",
    rowId,
    assetLabel: [row.name, row.location?.trim()].filter(Boolean).join(" · ") || row.propertyType,
    ledgerAction: "Sell property",
    quantity: sub,
    unitPrice: 1,
    currency: row.currency,
    tradeDate: input.tradeDate,
    fees: input.fees,
    notes: input.notes?.trim() || undefined,
    realizedGainNpr: null,
    meta: { propertyType: row.propertyType },
  };

  const realEstate = [...state.realEstate];
  realEstate[idx] = { ...row, purchaseValue: newPv, estimatedValue: newEv };
  return appendEntry({ ...state, realEstate }, entry);
}

export function recordVehicleBuy(
  state: WealthPortfolioStateV2,
  rowId: string,
  input: CashflowPayload,
): WealthPortfolioStateV2 | null {
  if (!isoOk(input.tradeDate)) return null;
  if (input.amount <= 0 || !Number.isFinite(input.amount)) return null;

  const idx = state.vehicles.findIndex((r) => r.id === rowId);
  if (idx < 0) return null;
  const row = state.vehicles[idx];
  const next = (row.resaleEstimate ?? 0) + input.amount;

  const entry: PortfolioLedgerEntry = {
    id: ledgerNewId(),
    txType: "buy",
    bucket: "vehicle",
    rowId,
    assetLabel: row.name || row.vehicleType,
    ledgerAction: "Buy",
    quantity: input.amount,
    unitPrice: 1,
    currency: row.currency,
    tradeDate: input.tradeDate,
    fees: input.fees,
    notes: input.notes?.trim() || undefined,
    meta: { vehicleType: row.vehicleType },
  };

  const vehicles = [...state.vehicles];
  vehicles[idx] = { ...row, resaleEstimate: next };
  return appendEntry({ ...state, vehicles }, entry);
}

export function recordVehicleSell(
  state: WealthPortfolioStateV2,
  rowId: string,
  input: CashflowPayload,
): WealthPortfolioStateV2 | null {
  if (!isoOk(input.tradeDate)) return null;
  if (input.amount <= 0 || !Number.isFinite(input.amount)) return null;

  const idx = state.vehicles.findIndex((r) => r.id === rowId);
  if (idx < 0) return null;
  const row = state.vehicles[idx];
  const cur = row.resaleEstimate ?? 0;
  if (input.amount > cur + 1e-9) return null;
  const next = Math.max(0, cur - input.amount);

  const entry: PortfolioLedgerEntry = {
    id: ledgerNewId(),
    txType: "sell",
    bucket: "vehicle",
    rowId,
    assetLabel: row.name || row.vehicleType,
    ledgerAction: "Sell",
    quantity: input.amount,
    unitPrice: 1,
    currency: row.currency,
    tradeDate: input.tradeDate,
    fees: input.fees,
    notes: input.notes?.trim() || undefined,
    realizedGainNpr: null,
    meta: { vehicleType: row.vehicleType },
  };

  const vehicles = [...state.vehicles];
  vehicles[idx] = { ...row, resaleEstimate: next };
  return appendEntry({ ...state, vehicles }, entry);
}

export function recordLiabilityAddLoan(
  state: WealthPortfolioStateV2,
  rowId: string,
  input: CashflowPayload,
): WealthPortfolioStateV2 | null {
  if (!isoOk(input.tradeDate)) return null;
  if (input.amount <= 0 || !Number.isFinite(input.amount)) return null;

  const idx = state.liabilities.findIndex((r) => r.id === rowId);
  if (idx < 0) return null;
  const row = state.liabilities[idx];
  const next = (row.amount ?? 0) + input.amount;

  const entry: PortfolioLedgerEntry = {
    id: ledgerNewId(),
    txType: "buy",
    bucket: "liability",
    rowId,
    assetLabel: row.name || row.liabilityType,
    ledgerAction: "Add loan",
    quantity: input.amount,
    unitPrice: 1,
    currency: row.currency,
    tradeDate: input.tradeDate,
    fees: input.fees,
    notes: input.notes?.trim() || undefined,
    meta: { liabilityType: row.liabilityType },
  };

  const liabilities = [...state.liabilities];
  liabilities[idx] = { ...row, amount: next };
  return appendEntry({ ...state, liabilities }, entry);
}

export function recordLiabilityPayLoan(
  state: WealthPortfolioStateV2,
  rowId: string,
  input: CashflowPayload,
): WealthPortfolioStateV2 | null {
  if (!isoOk(input.tradeDate)) return null;
  if (input.amount <= 0 || !Number.isFinite(input.amount)) return null;

  const idx = state.liabilities.findIndex((r) => r.id === rowId);
  if (idx < 0) return null;
  const row = state.liabilities[idx];
  const cur = row.amount ?? 0;
  if (input.amount > cur + 1e-9) return null;
  const next = Math.max(0, cur - input.amount);

  const entry: PortfolioLedgerEntry = {
    id: ledgerNewId(),
    txType: "sell",
    bucket: "liability",
    rowId,
    assetLabel: row.name || row.liabilityType,
    ledgerAction: "Pay loan",
    quantity: input.amount,
    unitPrice: 1,
    currency: row.currency,
    tradeDate: input.tradeDate,
    fees: input.fees,
    notes: input.notes?.trim() || undefined,
    realizedGainNpr: null,
    meta: { liabilityType: row.liabilityType },
  };

  const liabilities = [...state.liabilities];
  liabilities[idx] = { ...row, amount: next };
  return appendEntry({ ...state, liabilities }, entry);
}

export function ledgerRealizedTotalNpr(ledger: readonly PortfolioLedgerEntry[]): number {
  return ledger.reduce((a, e) => {
    if (e.txType !== "sell") return a;
    const r = e.realizedGainNpr;
    return a + (typeof r === "number" && Number.isFinite(r) ? r : 0);
  }, 0);
}
