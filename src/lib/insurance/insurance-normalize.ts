import type {
  InsuranceDocument,
  InsuranceDocumentKind,
  InsurancePaymentFrequency,
  InsurancePolicy,
  InsurancePolicyFormInput,
} from "@/lib/insurance/insurance-types";
import { INSURANCE_DOCUMENT_KINDS } from "@/lib/insurance/insurance-types";

function createDocumentId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function asDocumentKind(value: unknown): InsuranceDocumentKind {
  return INSURANCE_DOCUMENT_KINDS.includes(value as InsuranceDocumentKind)
    ? (value as InsuranceDocumentKind)
    : "other";
}

function parseDocuments(value: unknown): InsuranceDocument[] {
  if (!Array.isArray(value)) return [];
  const docs: InsuranceDocument[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const dataUrl = typeof row.dataUrl === "string" ? row.dataUrl : typeof row.data_url === "string" ? row.data_url : "";
    const fileName =
      typeof row.fileName === "string"
        ? row.fileName
        : typeof row.file_name === "string"
          ? row.file_name
          : "";
    if (!dataUrl || !fileName) continue;
    docs.push({
      id: typeof row.id === "string" && row.id ? row.id : createDocumentId(),
      kind: asDocumentKind(row.kind),
      fileName,
      dataUrl,
      uploadedAt:
        typeof row.uploadedAt === "string"
          ? row.uploadedAt
          : typeof row.uploaded_at === "string"
            ? row.uploaded_at
            : new Date().toISOString(),
    });
  }
  return docs;
}

/** Keep legacy single-doc fields and documents[] in sync so older clients still work. */
export function syncLegacyDocumentFields(input: {
  documents: InsuranceDocument[];
  documentDataUrl?: string | null;
  documentFileName?: string | null;
}): Pick<InsurancePolicy, "documents" | "documentDataUrl" | "documentFileName"> {
  let documents = [...input.documents];
  const legacyUrl = input.documentDataUrl ?? null;
  const legacyName = input.documentFileName ?? null;

  if (documents.length === 0 && legacyUrl && legacyName) {
    documents = [
      {
        id: createDocumentId(),
        kind: "policy_pdf",
        fileName: legacyName,
        dataUrl: legacyUrl,
        uploadedAt: new Date().toISOString(),
      },
    ];
  }

  const primary =
    documents.find((doc) => doc.kind === "policy_pdf") ?? documents[0] ?? null;

  return {
    documents,
    documentDataUrl: primary?.dataUrl ?? legacyUrl,
    documentFileName: primary?.fileName ?? legacyName,
  };
}

export function emptyPolicyMetaFields() {
  return {
    policyTermYears: 0,
    agentName: "",
    agentPhone: "",
    branch: "",
    policyNumber: "",
    proposalNumber: "",
    pan: "",
    medicalNotes: "",
    documents: [] as InsuranceDocument[],
  };
}

/** Normalize any policy-shaped object (localStorage / API / partial) into a full InsurancePolicy shape. */
export function normalizeInsurancePolicyFields<T extends Record<string, unknown>>(
  raw: T,
): Omit<
  InsurancePolicy,
  "id" | "type" | "provider" | "coverageAmountNpr" | "premiumNpr" | "paymentFrequency" | "status" | "sortOrder" | "createdAt" | "updatedAt"
> & {
  startDate: string;
  expiryDate: string;
  nominee: string;
  familyMembersCovered: string[];
  notes: string;
} {
  const docsSynced = syncLegacyDocumentFields({
    documents: parseDocuments(raw.documents),
    documentDataUrl: typeof raw.documentDataUrl === "string" ? raw.documentDataUrl : null,
    documentFileName: typeof raw.documentFileName === "string" ? raw.documentFileName : null,
  });

  const policyTermYearsRaw =
    typeof raw.policyTermYears === "number"
      ? raw.policyTermYears
      : Number(raw.policyTermYears);

  return {
    startDate: typeof raw.startDate === "string" ? raw.startDate : "",
    expiryDate: typeof raw.expiryDate === "string" ? raw.expiryDate : "",
    policyTermYears: Number.isFinite(policyTermYearsRaw) ? Math.max(0, Math.round(policyTermYearsRaw)) : 0,
    nominee: typeof raw.nominee === "string" ? raw.nominee : "",
    familyMembersCovered: Array.isArray(raw.familyMembersCovered)
      ? raw.familyMembersCovered.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
    notes: typeof raw.notes === "string" ? raw.notes : "",
    agentName: typeof raw.agentName === "string" ? raw.agentName : "",
    agentPhone: typeof raw.agentPhone === "string" ? raw.agentPhone : "",
    branch: typeof raw.branch === "string" ? raw.branch : "",
    policyNumber: typeof raw.policyNumber === "string" ? raw.policyNumber : "",
    proposalNumber: typeof raw.proposalNumber === "string" ? raw.proposalNumber : "",
    pan: typeof raw.pan === "string" ? raw.pan : "",
    medicalNotes: typeof raw.medicalNotes === "string" ? raw.medicalNotes : "",
    ...docsSynced,
  };
}

export function normalizeInsurancePolicy(policy: InsurancePolicy): InsurancePolicy {
  const meta = normalizeInsurancePolicyFields(policy as unknown as Record<string, unknown>);
  return {
    ...policy,
    ...meta,
  };
}

export function buildFormDocumentsPayload(
  documents: InsuranceDocument[],
  documentDataUrl: string | null,
  documentFileName: string | null,
): Pick<InsurancePolicyFormInput, "documents" | "documentDataUrl" | "documentFileName"> {
  return syncLegacyDocumentFields({ documents, documentDataUrl, documentFileName });
}

export function createInsuranceDocument(
  kind: InsuranceDocumentKind,
  fileName: string,
  dataUrl: string,
): InsuranceDocument {
  return {
    id: createDocumentId(),
    kind,
    fileName,
    dataUrl,
    uploadedAt: new Date().toISOString(),
  };
}

export function addYearsToIsoDate(isoDate: string, years: number): string {
  if (!isoDate || !Number.isFinite(years) || years <= 0) return isoDate;
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  const day = date.getDate();
  date.setDate(1);
  date.setFullYear(date.getFullYear() + years);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, daysInMonth));
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** When term years is set, keep expiry aligned with start + term. */
export function resolveExpiryFromTerm(startDate: string, policyTermYears: number, fallbackExpiry: string): string {
  if (startDate && policyTermYears > 0) {
    return addYearsToIsoDate(startDate, policyTermYears);
  }
  return fallbackExpiry;
}

export function derivePolicyTermYears(startDate: string, expiryDate: string, explicit?: number): number {
  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0) {
    return Math.round(explicit);
  }
  if (!startDate || !expiryDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${expiryDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
  const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(1, Math.round(years));
}

export function installmentsPerYear(frequency: InsurancePaymentFrequency): number | null {
  switch (frequency) {
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "half_yearly":
      return 2;
    case "yearly":
      return 1;
    case "one_time":
      return null;
    default:
      return null;
  }
}
