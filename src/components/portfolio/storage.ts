import type {
  FifoPositionLot,
  FixedDepositRow,
  GlobalRetirementAssetRow,
  InvestmentKind,
  InvestmentRow,
  LiabilityKind,
  LiabilityRow,
  MetalRow,
  NetWorthHistoryPoint,
  PortfolioLedgerEntry,
  RealEstateKind,
  RealEstateRow,
  RetirementAccountKind,
  SimpleMoneyLine,
  VehicleKind,
  VehicleRow,
  WealthPortfolioStateV2,
} from "@/components/portfolio/types";

export const STORAGE_KEY_V2 = "fire-nepal-portfolio-v2";
const STORAGE_KEY_V1 = "fire-nepal-portfolio-v1";

export function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptySimpleLine(): SimpleMoneyLine {
  return { id: newId(), name: "", amount: undefined, currency: "NPR", openedDate: undefined, accountNumber: undefined };
}

export function emptyFixedDeposit(): FixedDepositRow {
  return {
    id: newId(),
    bankName: "",
    accountNumber: "",
    principal: undefined,
    interestRatePct: undefined,
    maturityDate: undefined,
    openedDate: undefined,
    compounding: "quarterly",
    currency: "NPR",
  };
}

export function emptyInvestment(kind: InvestmentKind = "nepse"): InvestmentRow {
  return { id: newId(), kind, name: "", quantity: undefined, buyPrice: undefined, currency: "NPR" };
}

export function emptyMetal(metal: "gold" | "silver"): MetalRow {
  return { id: newId(), metal, grams: undefined };
}

export function emptyRealEstate(propertyType: RealEstateKind = "apartment"): RealEstateRow {
  return {
    id: newId(),
    propertyType,
    name: "",
    purchaseValue: undefined,
    estimatedValue: undefined,
    currency: "NPR",
  };
}

export function emptyVehicle(vehicleType: VehicleKind = "car"): VehicleRow {
  return { id: newId(), vehicleType, name: "", resaleEstimate: undefined, currency: "NPR" };
}

export function emptyLiability(liabilityType: LiabilityKind = "loan"): LiabilityRow {
  return { id: newId(), liabilityType, name: "", amount: undefined, currency: "NPR" };
}

export function emptyGlobalRetirementAsset(kind: RetirementAccountKind = "ssf"): GlobalRetirementAssetRow {
  return {
    id: newId(),
    kind,
    accountName: "",
    country: "",
    currentBalance: undefined,
    currency: "NPR",
    monthlyContribution: undefined,
    employerContribution: undefined,
    expectedRetirementAge: 60,
    currentAge: undefined,
    ssfMemberId: undefined,
    npsNumber: undefined,
    accountStartDate: undefined,
    contributionStartYear: undefined,
  };
}

export function defaultWealthState(): WealthPortfolioStateV2 {
  return {
    version: 2,
    liquidCash: [emptySimpleLine()],
    fixedDeposits: [emptyFixedDeposit()],
    investments: [emptyInvestment("nepse")],
    metals: [emptyMetal("gold"), emptyMetal("silver")],
    realEstate: [emptyRealEstate("apartment")],
    vehicles: [emptyVehicle("car")],
    liabilities: [emptyLiability("loan")],
    globalRetirementAssets: [emptyGlobalRetirementAsset("ssf")],
    netWorthHistory: [],
    ledger: [],
  };
}

type LegacyV1Line = {
  id: string;
  name: string;
  amount: number | undefined;
  currency: "NPR" | "KRW" | "USD";
};

type LegacyV1 = Partial<Record<string, LegacyV1Line[]>>;

function migrateV1ToV2(raw: string): WealthPortfolioStateV2 | null {
  try {
    const v1 = JSON.parse(raw) as LegacyV1;
    const base = defaultWealthState();
    if (Array.isArray(v1.liquidCash) && v1.liquidCash.length) {
      base.liquidCash = v1.liquidCash.map((r) => ({
        id: typeof r.id === "string" ? r.id : newId(),
        name: typeof r.name === "string" ? r.name : "",
        amount: typeof r.amount === "number" ? r.amount : undefined,
        currency: r.currency ?? "NPR",
      }));
    }
    const abroad = v1.assetsAbroad;
    const nepal = v1.nepalAssets;
    const legacyInv = v1.investments;
    const merged: SimpleMoneyLine[] = [...base.liquidCash];
    const pushLegacy = (arr: LegacyV1Line[] | undefined, prefix: string) => {
      if (!Array.isArray(arr)) return;
      for (const r of arr) {
        if ((r.amount ?? 0) <= 0 && !r.name) continue;
        merged.push({
          id: typeof r.id === "string" ? r.id : newId(),
          name: r.name ? `${prefix}: ${r.name}` : prefix,
          amount: r.amount,
          currency: r.currency ?? "NPR",
        });
      }
    };
    pushLegacy(abroad, "Abroad");
    pushLegacy(nepal, "Nepal");
    if (merged.length) base.liquidCash = merged.slice(0, 40);

    if (Array.isArray(legacyInv) && legacyInv.length) {
      base.investments = [
        ...legacyInv.map((r) => ({
          id: typeof r.id === "string" ? r.id : newId(),
          kind: "sip" as InvestmentKind,
          name: r.name || "Imported",
          quantity: 1,
          buyPrice: r.amount,
          currency: r.currency ?? "NPR",
        })),
        emptyInvestment("us_stock"),
      ];
    }

    const liab = v1.liabilities;
    if (Array.isArray(liab) && liab.length) {
      base.liabilities = liab.map((r) => ({
        id: typeof r.id === "string" ? r.id : newId(),
        liabilityType: "loan" as LiabilityKind,
        name: r.name || "Imported liability",
        amount: r.amount,
        currency: r.currency ?? "NPR",
      }));
    }
    return base;
  } catch {
    return null;
  }
}

export function loadWealthPortfolioState(): WealthPortfolioStateV2 {
  if (typeof window === "undefined") return defaultWealthState();
  try {
    const v2 = window.localStorage.getItem(STORAGE_KEY_V2);
    if (v2) {
      const parsed = JSON.parse(v2) as Partial<WealthPortfolioStateV2>;
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.investments)) {
        return normalizeV2(parsed);
      }
    }
    const v1 = window.localStorage.getItem(STORAGE_KEY_V1);
    if (v1) {
      const migrated = migrateV1ToV2(v1);
      if (migrated) {
        window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch {
    /* fallthrough */
  }
  return defaultWealthState();
}

function sanitizeIsoDate(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const [y, m, d] = raw.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return undefined;
  return raw;
}

const MAX_LEDGER = 2500;

function sanitizeFifoLots(raw: unknown): FifoPositionLot[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: FifoPositionLot[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const qty = typeof o.quantity === "number" ? o.quantity : NaN;
    const uc = typeof o.unitCost === "number" ? o.unitCost : NaN;
    if (!(qty > 0) || !(uc >= 0) || !Number.isFinite(qty) || !Number.isFinite(uc)) continue;
    const cur = o.currency === "NPR" || o.currency === "KRW" || o.currency === "USD" ? o.currency : "NPR";
    const openedAt = typeof o.openedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.openedAt) ? o.openedAt : "1970-01-01";
    out.push({
      id: typeof o.id === "string" && o.id ? o.id : newId(),
      quantity: qty,
      unitCost: uc,
      currency: cur,
      openedAt,
      fees: typeof o.fees === "number" && o.fees >= 0 ? o.fees : undefined,
    });
  }
  return out.length ? out : undefined;
}

function sanitizeLedgerEntry(x: unknown): PortfolioLedgerEntry | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id ? o.id : newId();
  const rawTx = o.txType;
  const txType =
    rawTx === "buy" ||
    rawTx === "sell" ||
    rawTx === "cash_dividend" ||
    rawTx === "bonus_share" ||
    rawTx === "right_share"
      ? rawTx
      : null;
  const bucket =
    o.bucket === "investment" ||
    o.bucket === "metal" ||
    o.bucket === "liquid_cash" ||
    o.bucket === "real_estate" ||
    o.bucket === "vehicle" ||
    o.bucket === "liability" ||
    o.bucket === "retirement"
      ? o.bucket
      : null;
  const rowId = typeof o.rowId === "string" ? o.rowId : "";
  const assetLabel = typeof o.assetLabel === "string" ? o.assetLabel : "";
  const quantity = typeof o.quantity === "number" && Number.isFinite(o.quantity) && o.quantity > 0 ? o.quantity : NaN;
  const unitPrice = typeof o.unitPrice === "number" && Number.isFinite(o.unitPrice) ? o.unitPrice : NaN;
  const cur = o.currency === "NPR" || o.currency === "KRW" || o.currency === "USD" ? o.currency : "NPR";
  const tradeDate = typeof o.tradeDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.tradeDate) ? o.tradeDate : "";
  if (!txType || !bucket || !rowId || !assetLabel || !Number.isFinite(quantity) || !Number.isFinite(unitPrice) || !tradeDate)
    return null;

  if (txType === "cash_dividend" && unitPrice !== 1) return null;
  if (txType !== "cash_dividend" && txType !== "bonus_share" && unitPrice < 0) return null;
  if (txType === "bonus_share" && unitPrice < 0) return null;
  const rg = o.realizedGainNpr;
  const realizedGainNpr =
    rg === null || rg === undefined
      ? txType === "sell"
        ? null
        : undefined
      : typeof rg === "number" && Number.isFinite(rg)
        ? rg
        : null;
  const ledgerAction =
    typeof o.ledgerAction === "string" && o.ledgerAction.trim() ? o.ledgerAction.trim().slice(0, 96) : undefined;

  return {
    id,
    txType,
    bucket,
    rowId,
    assetLabel,
    ledgerAction,
    investmentKind:
      o.investmentKind === "nepse" ||
      o.investmentKind === "us_stock" ||
      o.investmentKind === "etf" ||
      o.investmentKind === "sip" ||
      o.investmentKind === "closed_end_mf" ||
      o.investmentKind === "crypto"
        ? o.investmentKind
        : undefined,
    metal: o.metal === "gold" || o.metal === "silver" ? o.metal : undefined,
    quantity,
    unitPrice,
    currency: cur,
    tradeDate,
    fees: typeof o.fees === "number" && o.fees >= 0 ? o.fees : undefined,
    notes: typeof o.notes === "string" ? o.notes : undefined,
    realizedGainNpr: txType === "sell" ? (realizedGainNpr ?? null) : undefined,
    meta: o.meta && typeof o.meta === "object" ? (o.meta as Record<string, unknown>) : undefined,
  };
}

function sanitizeLedger(raw: unknown): PortfolioLedgerEntry[] {
  if (!Array.isArray(raw)) return [];
  const out = raw.map(sanitizeLedgerEntry).filter((e): e is PortfolioLedgerEntry => e != null);
  return out.length > MAX_LEDGER ? out.slice(-MAX_LEDGER) : out;
}

function sanitizeRetirementKind(raw: unknown): RetirementAccountKind {
  const k = raw as string;
  if (
    k === "ssf" ||
    k === "cit" ||
    k === "epf" ||
    k === "pension_savings" ||
    k === "employer_retirement" ||
    k === "retirement_sip" ||
    k === "global_retirement_account" ||
    k === "kr_nps" ||
    k === "kr_severance" ||
    k === "kr_dc_irp"
  )
    return k;
  return "ssf";
}

function sanitizeContributionStartYear(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  const y = Math.round(raw);
  if (y < 1970 || y > 2100) return undefined;
  return y;
}

function sanitizeIdField(raw: unknown, maxLen: number): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim().slice(0, maxLen);
  return t.length ? t : undefined;
}

function sanitizeGlobalRetirementRow(r: unknown): GlobalRetirementAssetRow {
  const o = (r && typeof r === "object" ? r : {}) as Partial<GlobalRetirementAssetRow>;
  const cur = o.currency === "NPR" || o.currency === "KRW" || o.currency === "USD" ? o.currency : "NPR";
  const clampAge = (n: unknown, fallback: number) => {
    if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
    return Math.min(100, Math.max(18, Math.round(n)));
  };
  return {
    id: typeof o.id === "string" && o.id ? o.id : newId(),
    kind: sanitizeRetirementKind(o.kind),
    accountName: typeof o.accountName === "string" ? o.accountName : "",
    country: typeof o.country === "string" ? o.country : "",
    currentBalance: typeof o.currentBalance === "number" && Number.isFinite(o.currentBalance) ? o.currentBalance : undefined,
    currency: cur,
    monthlyContribution:
      typeof o.monthlyContribution === "number" && Number.isFinite(o.monthlyContribution)
        ? o.monthlyContribution
        : undefined,
    employerContribution:
      typeof o.employerContribution === "number" && Number.isFinite(o.employerContribution)
        ? o.employerContribution
        : undefined,
    expectedRetirementAge: clampAge(o.expectedRetirementAge, 60),
    currentAge: typeof o.currentAge === "number" && Number.isFinite(o.currentAge) ? clampAge(o.currentAge, 35) : undefined,
    ssfMemberId: sanitizeIdField(o.ssfMemberId, 64),
    npsNumber: sanitizeIdField(o.npsNumber, 64),
    accountStartDate: sanitizeIsoDate(o.accountStartDate),
    contributionStartYear: sanitizeContributionStartYear(o.contributionStartYear),
  };
}

function sanitizeFdCompounding(raw: unknown): FixedDepositRow["compounding"] {
  if (raw === "simple" || raw === "monthly" || raw === "quarterly" || raw === "annual") return raw;
  return "quarterly";
}

function sanitizeFixedDepositRow(r: unknown): FixedDepositRow {
  const o = (r && typeof r === "object" ? r : {}) as Partial<FixedDepositRow>;
  const cur = o.currency === "NPR" || o.currency === "KRW" || o.currency === "USD" ? o.currency : "NPR";
  const principal =
    typeof o.principal === "number" && Number.isFinite(o.principal) && o.principal >= 0 ? o.principal : undefined;
  const interestRatePct =
    typeof o.interestRatePct === "number" && Number.isFinite(o.interestRatePct) && o.interestRatePct >= 0
      ? o.interestRatePct
      : undefined;
  return {
    id: typeof o.id === "string" && o.id ? o.id : newId(),
    bankName: typeof o.bankName === "string" ? o.bankName : "",
    accountNumber: sanitizeIdField(o.accountNumber, 48) ?? "",
    principal,
    interestRatePct,
    maturityDate: sanitizeIsoDate(o.maturityDate),
    openedDate: sanitizeIsoDate(o.openedDate),
    compounding: sanitizeFdCompounding(o.compounding),
    currency: cur,
  };
}

/** Coerce partial JSON (e.g. from Supabase) into a valid v2 portfolio document. */
export function coerceWealthPortfolioState(parsed: Partial<WealthPortfolioStateV2> | null | undefined): WealthPortfolioStateV2 {
  if (!parsed || typeof parsed !== "object") return defaultWealthState();
  return normalizeV2(parsed);
}

function normalizeV2(parsed: Partial<WealthPortfolioStateV2>): WealthPortfolioStateV2 {
  const d = defaultWealthState();
  const investmentsRaw = Array.isArray(parsed.investments) && parsed.investments.length ? parsed.investments : d.investments;
  const investments = investmentsRaw.map((r) => ({
    ...r,
    purchaseDate: sanitizeIsoDate((r as InvestmentRow).purchaseDate),
    fifoLots: sanitizeFifoLots((r as InvestmentRow).fifoLots),
  }));
  const liquidRaw = Array.isArray(parsed.liquidCash) && parsed.liquidCash.length ? parsed.liquidCash : d.liquidCash;
  const liquidCash = liquidRaw.map((r) => {
    const row = r as SimpleMoneyLine;
    return {
      ...row,
      openedDate: sanitizeIsoDate(row.openedDate),
      accountNumber: sanitizeIdField(row.accountNumber, 48),
    };
  });
  const metalsRaw = Array.isArray(parsed.metals) && parsed.metals.length ? parsed.metals : d.metals;
  const metals = metalsRaw.map((r) => {
    const m = r as MetalRow;
    const basis = m.totalCostBasisNpr;
    const totalCostBasisNpr =
      typeof basis === "number" && Number.isFinite(basis) && basis > 0 ? basis : undefined;
    return {
      ...r,
      boughtDate: sanitizeIsoDate(m.boughtDate),
      totalCostBasisNpr,
    };
  });
  const reRaw = Array.isArray(parsed.realEstate) && parsed.realEstate.length ? parsed.realEstate : d.realEstate;
  const realEstate = reRaw.map((r) => {
    const row = r as RealEstateRow;
    const est = row.annualAppreciationEstimatePct;
    const annualAppreciationEstimatePct =
      typeof est === "number" && Number.isFinite(est) && est >= 0 && est <= 80 ? est : undefined;
    return {
      ...row,
      acquiredDate: sanitizeIsoDate(row.acquiredDate),
      annualAppreciationEstimatePct,
    };
  });
  const vehRaw = Array.isArray(parsed.vehicles) && parsed.vehicles.length ? parsed.vehicles : d.vehicles;
  const vehicles = vehRaw.map((r) => ({
    ...r,
    purchaseDate: sanitizeIsoDate((r as VehicleRow).purchaseDate),
  }));
  const liabRaw = Array.isArray(parsed.liabilities) && parsed.liabilities.length ? parsed.liabilities : d.liabilities;
  const liabilities = liabRaw.map((r) => ({
    ...r,
    loanStartDate: sanitizeIsoDate((r as LiabilityRow).loanStartDate),
  }));
  const grRaw =
    Array.isArray(parsed.globalRetirementAssets) && parsed.globalRetirementAssets.length
      ? parsed.globalRetirementAssets
      : d.globalRetirementAssets;
  const globalRetirementAssets = grRaw.map(sanitizeGlobalRetirementRow);
  const fdRaw =
    Array.isArray(parsed.fixedDeposits) && parsed.fixedDeposits.length ? parsed.fixedDeposits : d.fixedDeposits;
  const fixedDeposits = fdRaw.map(sanitizeFixedDepositRow).slice(0, 40);
  return {
    version: 2,
    liquidCash,
    fixedDeposits,
    investments,
    metals,
    realEstate,
    vehicles,
    liabilities,
    globalRetirementAssets,
    netWorthHistory: Array.isArray(parsed.netWorthHistory) ? parsed.netWorthHistory : [],
    ledger: sanitizeLedger(parsed.ledger),
  };
}

export function appendNetWorthHistory(
  prev: NetWorthHistoryPoint[],
  netWorthNpr: number,
  maxPoints = 24,
): NetWorthHistoryPoint[] {
  const month = new Date().toISOString().slice(0, 7);
  const last = prev[prev.length - 1];
  if (last && last.month === month) {
    return [...prev.slice(0, -1), { month, netWorthNpr }];
  }
  return [...prev, { month, netWorthNpr }].slice(-maxPoints);
}
