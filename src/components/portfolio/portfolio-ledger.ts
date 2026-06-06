import { addDividendIncomeToCashflowStorage } from "@/components/cashflow/portfolio-dividend-sync";
import { lineToNpr } from "@/components/portfolio/calculations";
import type {
  FifoPositionLot,
  InvestmentRow,
  MetalRow,
  PortfolioLedgerEntry,
  WealthPortfolioStateV2,
} from "@/components/portfolio/types";
import { METAL_PHOTO_MAX_COUNT } from "@/components/portfolio/metal-photo-utils";
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
};

export type CashflowPayload = {
  amount: number;
  tradeDate: string;
  fees?: number;
  notes?: string;
};

export type MetalBuyPayload = {
  grams: number;
  tradeDate: string;
  /** NPR per gram or per UI tola (11.66 g), per `buyPriceUnit`. */
  buyPriceNpr: number;
  buyPriceUnit: "gram" | "tola";
  feesNpr?: number;
  notes?: string;
  /** Optional new photos (data URLs) merged into the holding gallery (capped server-side in UI). */
  photoUrlsToAppend?: string[];
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
    meta: { fifoVersion: 1, fifoMethod: "FIFO", ledgerFlow: flow },
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

  addDividendIncomeToCashflowStorage(netNpr);
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

  const entry: PortfolioLedgerEntry = {
    id: ledgerNewId(),
    txType: "sell",
    bucket: "metal",
    rowId,
    assetLabel: row.metal === "gold" ? "Gold" : "Silver",
    ledgerAction: "Sell",
    metal: row.metal,
    quantity: input.grams,
    unitPrice: input.unitPriceNprPerGram,
    currency: "NPR",
    tradeDate: input.tradeDate,
    fees: input.feesNpr,
    notes: input.notes?.trim() || undefined,
    realizedGainNpr,
    meta: { fifoVersion: 1, proceedsNpr, costNpr, feesNpr, unit: "grams" },
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

export function recordMetalBuy(
  state: WealthPortfolioStateV2,
  rowId: string,
  input: MetalBuyPayload,
): WealthPortfolioStateV2 | null {
  if (!isoOk(input.tradeDate)) return null;
  if (input.grams <= 0 || !Number.isFinite(input.grams)) return null;
  if (input.buyPriceNpr <= 0 || !Number.isFinite(input.buyPriceNpr)) return null;

  const idx = state.metals.findIndex((r) => r.id === rowId);
  if (idx < 0) return null;
  const row = state.metals[idx];
  const g0 = row.grams ?? 0;
  const newGrams = g0 + input.grams;
  const nprPerGram =
    input.buyPriceUnit === "tola" ? input.buyPriceNpr / NEPAL_UI_GRAMS_PER_TOLA : input.buyPriceNpr;
  if (!Number.isFinite(nprPerGram) || nprPerGram < 0) return null;
  const feesNpr = input.feesNpr ?? 0;
  const addBasis = input.grams * nprPerGram + feesNpr;
  const newBasisRaw = (row.totalCostBasisNpr ?? 0) + addBasis;
  const newBasis = newBasisRaw > 0 ? Math.round(newBasisRaw * 100) / 100 : undefined;

  const entry: PortfolioLedgerEntry = {
    id: ledgerNewId(),
    txType: "buy",
    bucket: "metal",
    rowId,
    assetLabel: row.metal === "gold" ? "Gold" : "Silver",
    ledgerAction: "Buy",
    metal: row.metal,
    quantity: input.grams,
    unitPrice: nprPerGram,
    currency: "NPR",
    tradeDate: input.tradeDate,
    fees: input.feesNpr,
    notes: input.notes?.trim() || undefined,
    realizedGainNpr: null,
    meta: {
      fifoVersion: 1,
      basisNprAdded: addBasis,
      unit: "grams",
      buyPriceUnit: input.buyPriceUnit,
      metalBuyPriceNpr: input.buyPriceNpr,
    },
  };

  let photoUrls = row.photoUrls;
  let coverPhotoIndex = row.coverPhotoIndex;
  const append = input.photoUrlsToAppend?.filter(Boolean) ?? [];
  if (append.length > 0) {
    const base = photoUrls ?? [];
    const room = Math.max(0, METAL_PHOTO_MAX_COUNT - base.length);
    const slice = append.slice(0, room);
    const merged = [...base, ...slice];
    photoUrls = merged.length > 0 ? merged : undefined;
    coverPhotoIndex = photoUrls && photoUrls.length > 0 ? Math.min(row.coverPhotoIndex ?? 0, photoUrls.length - 1) : undefined;
  }

  const updatedRow: MetalRow = syncMetalLegacyBuyPriceFields({
    ...row,
    grams: newGrams,
    totalCostBasisNpr: newBasis,
    boughtDate: minPurchaseIso(row.boughtDate, input.tradeDate),
    photoUrls,
    coverPhotoIndex,
  });

  const metals = [...state.metals];
  metals[idx] = updatedRow;
  return appendEntry({ ...state, metals }, entry);
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
