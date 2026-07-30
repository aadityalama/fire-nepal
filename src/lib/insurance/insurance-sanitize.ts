/** Shared request sanitizer for insurance create/update routes. */

import {
  INSURANCE_DOCUMENT_KINDS,
  INSURANCE_TYPES,
  type InsuranceDocument,
  type InsuranceDocumentKind,
  type InsurancePaymentFrequency,
  type InsurancePolicyFormInput,
  type InsuranceType,
} from "@/lib/insurance/insurance-types";
import { syncLegacyDocumentFields } from "@/lib/insurance/insurance-normalize";

const FREQUENCIES: InsurancePaymentFrequency[] = ["monthly", "quarterly", "half_yearly", "yearly", "one_time"];

function createDocumentId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sanitizeDocuments(raw: unknown): InsuranceDocument[] {
  if (!Array.isArray(raw)) return [];
  const docs: InsuranceDocument[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const dataUrl = typeof row.dataUrl === "string" ? row.dataUrl : "";
    const fileName = typeof row.fileName === "string" ? row.fileName : "";
    if (!dataUrl || !fileName) continue;
    const kind =
      typeof row.kind === "string" && INSURANCE_DOCUMENT_KINDS.includes(row.kind as InsuranceDocumentKind)
        ? (row.kind as InsuranceDocumentKind)
        : "other";
    docs.push({
      id: typeof row.id === "string" && row.id ? row.id : createDocumentId(),
      kind,
      fileName,
      dataUrl,
      uploadedAt: typeof row.uploadedAt === "string" ? row.uploadedAt : new Date().toISOString(),
    });
  }
  return docs;
}

export function sanitizeInsurancePolicyInput(raw: unknown): InsurancePolicyFormInput | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const type =
    typeof source.type === "string" && INSURANCE_TYPES.includes(source.type as InsuranceType)
      ? (source.type as InsuranceType)
      : null;
  const coverageAmountNpr =
    typeof source.coverageAmountNpr === "number" ? source.coverageAmountNpr : Number(source.coverageAmountNpr);
  const premiumNpr = typeof source.premiumNpr === "number" ? source.premiumNpr : Number(source.premiumNpr);
  const paymentFrequency =
    typeof source.paymentFrequency === "string" &&
    FREQUENCIES.includes(source.paymentFrequency as InsurancePaymentFrequency)
      ? (source.paymentFrequency as InsurancePaymentFrequency)
      : null;
  const provider = typeof source.provider === "string" ? source.provider.trim() : "";
  const policyTermYearsRaw =
    typeof source.policyTermYears === "number" ? source.policyTermYears : Number(source.policyTermYears);

  if (!type || !paymentFrequency || !provider || !Number.isFinite(coverageAmountNpr) || coverageAmountNpr < 0) {
    return null;
  }

  const familyMembersCovered = Array.isArray(source.familyMembersCovered)
    ? source.familyMembersCovered.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const docs = syncLegacyDocumentFields({
    documents: sanitizeDocuments(source.documents),
    documentDataUrl: typeof source.documentDataUrl === "string" ? source.documentDataUrl : null,
    documentFileName: typeof source.documentFileName === "string" ? source.documentFileName : null,
  });

  return {
    type,
    provider,
    coverageAmountNpr: Math.round(coverageAmountNpr),
    premiumNpr: Number.isFinite(premiumNpr) ? Math.max(0, Math.round(premiumNpr)) : 0,
    paymentFrequency,
    startDate: typeof source.startDate === "string" ? source.startDate : "",
    expiryDate: typeof source.expiryDate === "string" ? source.expiryDate : "",
    policyTermYears: Number.isFinite(policyTermYearsRaw) ? Math.max(0, Math.round(policyTermYearsRaw)) : 0,
    nominee: typeof source.nominee === "string" ? source.nominee : "",
    familyMembersCovered,
    notes: typeof source.notes === "string" ? source.notes : "",
    agentName: typeof source.agentName === "string" ? source.agentName : "",
    agentPhone: typeof source.agentPhone === "string" ? source.agentPhone : "",
    branch: typeof source.branch === "string" ? source.branch : "",
    policyNumber: typeof source.policyNumber === "string" ? source.policyNumber : "",
    proposalNumber: typeof source.proposalNumber === "string" ? source.proposalNumber : "",
    pan: typeof source.pan === "string" ? source.pan : "",
    medicalNotes: typeof source.medicalNotes === "string" ? source.medicalNotes : "",
    ...docs,
  };
}
