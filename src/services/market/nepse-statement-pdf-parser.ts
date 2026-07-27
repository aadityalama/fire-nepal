/**
 * Strict line-item extractor for official NEPSE financial-statement PDFs.
 * Only matches known published labels; never estimates or invents values.
 */

export type StatementNumericField =
  | "revenueNpr"
  | "operatingRevenueNpr"
  | "otherIncomeNpr"
  | "grossProfitNpr"
  | "operatingProfitNpr"
  | "ebitdaNpr"
  | "ebitNpr"
  | "netProfitNpr"
  | "eps"
  | "dilutedEps"
  | "totalAssetsNpr"
  | "currentAssetsNpr"
  | "nonCurrentAssetsNpr"
  | "cashNpr"
  | "investmentsNpr"
  | "inventoriesNpr"
  | "receivablesNpr"
  | "totalEquityNpr"
  | "shareCapitalNpr"
  | "reservesNpr"
  | "retainedEarningsNpr"
  | "totalLiabilitiesNpr"
  | "currentLiabilitiesNpr"
  | "nonCurrentLiabilitiesNpr"
  | "borrowingsNpr"
  | "operatingCashFlowNpr"
  | "investingCashFlowNpr"
  | "financingCashFlowNpr"
  | "freeCashFlowNpr"
  | "netCashMovementNpr";

type LabelRule = {
  field: StatementNumericField;
  /** Lowercase normalized needle; longer/more-specific rules should be listed first. */
  labels: string[];
};

/** Order matters: more specific labels first so they win over shorter cousins. */
const LABEL_RULES: LabelRule[] = [
  { field: "dilutedEps", labels: ["diluted earnings per share", "diluted eps"] },
  { field: "eps", labels: ["basic earnings per share", "earnings per share", "basic eps"] },
  { field: "freeCashFlowNpr", labels: ["free cash flow"] },
  {
    field: "netCashMovementNpr",
    labels: [
      "net increase/(decrease) in cash",
      "net increase (decrease) in cash",
      "net increase/decrease in cash",
      "net decrease in cash",
      "net increase in cash",
      "net cash movement",
      "net change in cash",
    ],
  },
  {
    field: "operatingCashFlowNpr",
    labels: [
      "net cash from operating activities",
      "net cash generated from operating activities",
      "net cash flows from operating activities",
      "cash flows from operating activities",
      "cash from operating activities",
      "net cash from operations",
    ],
  },
  {
    field: "investingCashFlowNpr",
    labels: [
      "net cash from investing activities",
      "net cash used in investing activities",
      "net cash flows from investing activities",
      "cash flows from investing activities",
      "cash from investing activities",
    ],
  },
  {
    field: "financingCashFlowNpr",
    labels: [
      "net cash from financing activities",
      "net cash used in financing activities",
      "net cash flows from financing activities",
      "cash flows from financing activities",
      "cash from financing activities",
    ],
  },
  { field: "nonCurrentAssetsNpr", labels: ["total non-current assets", "total non current assets"] },
  { field: "currentAssetsNpr", labels: ["total current assets"] },
  { field: "totalAssetsNpr", labels: ["total assets"] },
  {
    field: "nonCurrentLiabilitiesNpr",
    labels: ["total non-current liabilities", "total non current liabilities"],
  },
  { field: "currentLiabilitiesNpr", labels: ["total current liabilities"] },
  { field: "totalLiabilitiesNpr", labels: ["total liabilities"] },
  {
    field: "totalEquityNpr",
    labels: ["total equity attributable to equity holders", "total equity", "total shareholders equity"],
  },
  { field: "shareCapitalNpr", labels: ["equity share capital", "paid up share capital", "share capital"] },
  { field: "retainedEarningsNpr", labels: ["retained earnings", "retained earning"] },
  { field: "reservesNpr", labels: ["reserves and surplus", "other reserves", "reserves"] },
  {
    field: "cashNpr",
    labels: ["cash and cash equivalents", "cash & cash equivalents", "cash and cash equivalent"],
  },
  {
    field: "investmentsNpr",
    labels: ["investment securities", "investments in securities", "investment in associates", "investments"],
  },
  { field: "inventoriesNpr", labels: ["inventories", "inventory"] },
  {
    field: "receivablesNpr",
    labels: ["trade and other receivables", "trade receivables", "receivables"],
  },
  {
    field: "borrowingsNpr",
    labels: [
      "non-current borrowings",
      "non current borrowings",
      "current borrowings",
      "long term loans",
      "borrowings",
      "borrowing",
    ],
  },
  { field: "grossProfitNpr", labels: ["gross profit"] },
  { field: "ebitdaNpr", labels: ["ebitda"] },
  { field: "ebitNpr", labels: ["ebit", "profit before interest and tax"] },
  {
    field: "operatingProfitNpr",
    labels: ["profit/(loss) from operation", "profit from operation", "operating profit", "net operating income"],
  },
  {
    field: "operatingRevenueNpr",
    labels: ["total operating income", "net interest income", "operating revenue"],
  },
  {
    field: "otherIncomeNpr",
    labels: ["other operating income", "other income", "non operating income"],
  },
  {
    field: "revenueNpr",
    labels: [
      "revenue from sale of electricity",
      "revenue from contracts with customers",
      "revenue from operations",
      "interest income",
      "net revenue",
      "total revenue",
    ],
  },
  {
    field: "netProfitNpr",
    labels: [
      "profit/(loss) for the period",
      "profit (loss) for the period",
      "profit/loss for the period",
      "profit for the period",
      "profit for the year",
      "net profit/(loss)",
      "net profit (loss)",
      "net profit",
    ],
  },
];

function normalizeLine(raw: string): string {
  return raw
    .replace(/\u0000/g, " ")
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(raw: string): string {
  return normalizeLine(raw)
    .toLowerCase()
    .replace(/[^a-z0-9%./()\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse NPR amounts; supports parentheses negatives and trailing decimals. */
export function parseAmountToken(token: string): number | null {
  const cleaned = token.replace(/,/g, "").replace(/\s+/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned === "—" || cleaned === "–") return null;
  const paren = cleaned.match(/^\((.+)\)$/);
  const body = paren ? paren[1] : cleaned;
  if (!/^-?\d+(\.\d+)?%?$/.test(body)) return null;
  if (body.endsWith("%")) return null;
  const value = Number(body);
  if (!Number.isFinite(value)) return null;
  return paren ? -Math.abs(value) : value;
}

function extractAmounts(segment: string): number[] {
  const matches = segment.match(/\(?-?[\d,]+(?:\.\d+)?\)?%?/g) ?? [];
  const values: number[] = [];
  for (const token of matches) {
    const amount = parseAmountToken(token);
    if (amount != null) values.push(amount);
  }
  return values;
}

function findLabelMatches(normalizedLine: string): { field: StatementNumericField; index: number; length: number; label: string }[] {
  const hits: { field: StatementNumericField; index: number; length: number; label: string }[] = [];
  for (const rule of LABEL_RULES) {
    for (const label of rule.labels) {
      let from = 0;
      while (from < normalizedLine.length) {
        const index = normalizedLine.indexOf(label, from);
        if (index < 0) break;
        // Avoid matching inside a longer word-ish token without boundaries.
        const before = index === 0 ? " " : normalizedLine[index - 1];
        const after = index + label.length >= normalizedLine.length ? " " : normalizedLine[index + label.length];
        const boundaryOk = /[\s:(]/.test(before) || index === 0;
        const afterOk = /[\s:(.\-]/.test(after) || index + label.length === normalizedLine.length;
        if (boundaryOk && afterOk) {
          hits.push({ field: rule.field, index, length: label.length, label });
          break;
        }
        from = index + label.length;
      }
    }
  }
  hits.sort((a, b) => a.index - b.index || b.length - a.length);
  // Keep first hit per field on a line; prefer earliest occurrence.
  const seen = new Set<StatementNumericField>();
  const unique: typeof hits = [];
  for (const hit of hits) {
    if (seen.has(hit.field)) continue;
    // Skip overlapping later labels that start inside an earlier match.
    if (unique.some((prior) => hit.index < prior.index + prior.length && hit.index >= prior.index)) continue;
    seen.add(hit.field);
    unique.push(hit);
  }
  return unique.sort((a, b) => a.index - b.index);
}

/**
 * Map a label match on the comma-stripped normalized line back onto the original
 * display line, then read amounts from the original so thousands separators survive.
 */
function amountsAfterLabel(originalLine: string, label: string, nextLabel: string | null): number[] {
  const lower = originalLine.toLowerCase();
  const labelIndex = lower.indexOf(label);
  if (labelIndex < 0) return extractAmounts(originalLine);
  const from = labelIndex + label.length;
  let to = originalLine.length;
  if (nextLabel) {
    const nextIndex = lower.indexOf(nextLabel, from);
    if (nextIndex >= 0) to = nextIndex;
  }
  return extractAmounts(originalLine.slice(from, to));
}

export type ParsedStatementExtraction = {
  fields: Partial<Record<StatementNumericField, number>>;
  matchedLabels: Partial<Record<StatementNumericField, string>>;
  textChars: number;
  lineCount: number;
};

/**
 * Extract statement fields from pdftotext/unpdf plain text of an official filing.
 * Uses the first numeric value after each matched label (current-period column).
 */
export function extractStatementFieldsFromText(text: string): ParsedStatementExtraction {
  const fields: Partial<Record<StatementNumericField, number>> = {};
  const matchedLabels: Partial<Record<StatementNumericField, string>> = {};
  const lines = text.split(/\r?\n/).map(normalizeLine).filter(Boolean);

  for (const line of lines) {
    // Keep commas in a parallel key used only for label discovery.
    const normalized = normalizeKey(line.replace(/,/g, ""));
    if (!normalized) continue;
    const matches = findLabelMatches(` ${normalized} `);
    if (!matches.length) continue;

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      if (fields[match.field] != null) continue;
      const nextLabel = i + 1 < matches.length ? matches[i + 1].label : null;
      const amounts = amountsAfterLabel(line, match.label, nextLabel);
      if (!amounts.length) continue;
      // Prefer a material NPR figure when the first token is a tiny ratio/index artifact.
      const value =
        amounts.find((amount) => Math.abs(amount) >= 1000) ??
        amounts.find((amount) => Math.abs(amount) >= 1) ??
        amounts[0];
      fields[match.field] = value;
      matchedLabels[match.field] = match.label;
    }
  }

  return {
    fields,
    matchedLabels,
    textChars: text.length,
    lineCount: lines.length,
  };
}

/** Heuristic: enough alphabetic content to attempt label extraction. */
export function isExtractableStatementText(text: string): boolean {
  if (!text || text.trim().length < 200) return false;
  const letters = (text.match(/[A-Za-z]/g) ?? []).length;
  return letters >= 80;
}
