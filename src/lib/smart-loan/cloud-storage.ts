export const SMART_LOAN_STORAGE_KEY = "fire-nepal-smart-loan-v1";

const LEGACY_PROFILES_KEY = "smartLoan.profiles";
const LEGACY_DOCUMENTS_KEY = "smartLoan.documents";
const LEGACY_LENT_KEY = "lentMoney";
const LEGACY_BORROWED_KEY = "borrowedMoney";
const LEGACY_INTEREST_KEY = "interestIncome";

export type SmartLoanCloudDocument = {
  profiles: unknown[];
  documents: unknown[];
  lentMoney: number;
  borrowedMoney: number;
  interestIncome: number;
};

export function defaultSmartLoanCloudDocument(): SmartLoanCloudDocument {
  return {
    profiles: [],
    documents: [],
    lentMoney: 0,
    borrowedMoney: 0,
    interestIncome: 0,
  };
}

function finiteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function sanitizeSmartLoanCloudDocument(raw: unknown): SmartLoanCloudDocument {
  if (!raw || typeof raw !== "object") return defaultSmartLoanCloudDocument();
  const o = raw as Partial<SmartLoanCloudDocument>;
  return {
    profiles: Array.isArray(o.profiles) ? o.profiles : [],
    documents: Array.isArray(o.documents) ? o.documents : [],
    lentMoney: finiteNumber(o.lentMoney, 0),
    borrowedMoney: finiteNumber(o.borrowedMoney, 0),
    interestIncome: finiteNumber(o.interestIncome, 0),
  };
}

function readLegacyGuestDocument(): SmartLoanCloudDocument | null {
  if (typeof window === "undefined") return null;
  try {
    const unified = window.localStorage.getItem(SMART_LOAN_STORAGE_KEY);
    if (unified) return sanitizeSmartLoanCloudDocument(JSON.parse(unified) as unknown);

    const profilesRaw = window.localStorage.getItem(LEGACY_PROFILES_KEY);
    const documentsRaw = window.localStorage.getItem(LEGACY_DOCUMENTS_KEY);
    if (!profilesRaw && !documentsRaw) return null;

    return sanitizeSmartLoanCloudDocument({
      profiles: profilesRaw ? (JSON.parse(profilesRaw) as unknown[]) : [],
      documents: documentsRaw ? (JSON.parse(documentsRaw) as unknown[]) : [],
      lentMoney: finiteNumber(window.localStorage.getItem(LEGACY_LENT_KEY), 0),
      borrowedMoney: finiteNumber(window.localStorage.getItem(LEGACY_BORROWED_KEY), 0),
      interestIncome: finiteNumber(window.localStorage.getItem(LEGACY_INTEREST_KEY), 0),
    });
  } catch {
    return null;
  }
}

export function loadGuestSmartLoanDocument(): SmartLoanCloudDocument {
  return readLegacyGuestDocument() ?? defaultSmartLoanCloudDocument();
}

export function saveGuestSmartLoanDocument(doc: SmartLoanCloudDocument): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SMART_LOAN_STORAGE_KEY, JSON.stringify(doc));
  } catch {
    /* quota */
  }
}

export function clearSmartLoanLocalCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SMART_LOAN_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_PROFILES_KEY);
    window.localStorage.removeItem(LEGACY_DOCUMENTS_KEY);
    window.localStorage.removeItem(LEGACY_LENT_KEY);
    window.localStorage.removeItem(LEGACY_BORROWED_KEY);
    window.localStorage.removeItem(LEGACY_INTEREST_KEY);
  } catch {
    /* ignore */
  }
}
