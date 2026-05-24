import type { PensionSlipFields } from "@/lib/pension-types";

const TRACKED_KEYS: (keyof PensionSlipFields)[] = [
  "grossSalary",
  "baseSalary",
  "overtime",
  "bonus",
  "nationalPensionEmployee",
  "nationalPensionEmployer",
  "healthInsurance",
  "longTermCareInsurance",
  "employmentInsurance",
  "incomeTax",
  "localIncomeTax",
  "severanceReserve",
];

/** Normalize OCR to a single line (keyword / amount search across full text). */
function normalizeText(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function linesFromOcr(raw: string): string[] {
  return raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
}

/** Pull plausible won amounts from a line (commas or 4+ digit runs). */
export function extractNumbersFromLine(line: string): number[] {
  const nums: number[] = [];
  const re = /\d{1,3}(?:,\d{3})+|\b\d{4,9}\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const n = Number(m[0].replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 100 && n < 900_000_000) nums.push(Math.round(n));
  }
  return nums;
}

/** First integer amount after keyword (Korean payslips: keyword then spaces/colon then digits). */
function amountAfterKeyword(text: string, keyword: string): number | undefined {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}[\\s:：,.\\-]*([\\d]{1,3}(?:,[\\d]{3})*(?:\\.[\\d]+)?)`, "i");
  const m = text.match(re);
  if (!m?.[1]) return undefined;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
}

/** Try multiple keyword variants (first hit wins). */
function firstAmount(text: string, keywords: string[]): number | undefined {
  for (const k of keywords) {
    const v = amountAfterKeyword(text, k);
    if (v !== undefined) return v;
  }
  return undefined;
}

function enrichFromLines(lines: string[], fields: PensionSlipFields): PensionSlipFields {
  const out: PensionSlipFields = { ...fields };

  const lineMatchesKeyword = (line: string, keys: string[]) => keys.some((k) => line.includes(k));

  const fill = (
    key: keyof PensionSlipFields,
    keys: string[],
    pick: "firstAfterKeyword" | "maxOnLine" | "minOnLine",
  ) => {
    if (out[key] !== undefined) return;
    for (const line of lines) {
      if (!lineMatchesKeyword(line, keys)) continue;
      const nums = extractNumbersFromLine(line);
      if (!nums.length) continue;
      if (pick === "maxOnLine") {
        out[key] = Math.max(...nums);
        return;
      }
      if (pick === "minOnLine") {
        out[key] = Math.min(...nums);
        return;
      }
      let best: number | undefined;
      for (const kw of keys) {
        const i = line.indexOf(kw);
        if (i < 0) continue;
        const tail = line.slice(i + kw.length);
        const m = tail.match(/[\s:：,.\\-]*([\d]{1,3}(?:,\d{3})+|\d{4,9})/);
        if (m?.[1]) {
          const n = Number(m[1].replace(/,/g, ""));
          if (Number.isFinite(n) && n >= 100) {
            best = Math.round(n);
            break;
          }
        }
      }
      if (best !== undefined) {
        out[key] = best;
        return;
      }
      out[key] = nums[0];
      return;
    }
  };

  fill("grossSalary", ["총지급액", "지급총액", "급여총액", "총급여", "총 급여", "급여 합계", "지급액계", "실지급액전", "지급합계"], "maxOnLine");
  fill("baseSalary", ["기본급", "기본 급여", "통상임금", "기본급여"], "firstAfterKeyword");
  fill("overtime", ["연장수당", "연장근로", "연장근로수당", "근로시간외", "야간수당", "휴일수당", "초과근로", "OT", "시간외"], "firstAfterKeyword");
  fill("bonus", ["상여금", "성과급", "인센티브", "상여", "경영성과"], "firstAfterKeyword");

  fill("nationalPensionEmployee", ["국민연금", "국민 연금", "국민연금보험료", "연금보험"], "firstAfterKeyword");
  fill("nationalPensionEmployer", ["사업주연금", "사업자연금", "국민연금사업자", "사업주 부담", "사업주부담"], "firstAfterKeyword");
  fill("healthInsurance", ["건강보험", "건강 보험", "건강보험료", "의료보험"], "firstAfterKeyword");
  fill("employmentInsurance", ["고용보험", "고용 보험", "고용보험료"], "firstAfterKeyword");
  fill("incomeTax", ["소득세", "근로소득세", "갑근세"], "firstAfterKeyword");
  fill("localIncomeTax", ["지방소득세", "주민세", "지방세", "지방소득"], "firstAfterKeyword");
  fill("severanceReserve", ["퇴직적립", "퇴직금적립", "퇴직연금", "DC적립", "퇴직금", "퇴직급여", "퇴직충당"], "firstAfterKeyword");

  return out;
}

export type SlipParseStats = {
  filledCount: number;
  totalKeys: number;
  /** 0–1 rough fill ratio for UI. */
  fillRatio: number;
};

/**
 * Heuristic extraction from Korean payslip OCR text.
 * Uses flattened text plus line-aware fallbacks when OCR is noisy or partially broken.
 */
export function parsePensionSlipFromOcrText(raw: string): PensionSlipFields {
  const lines = linesFromOcr(raw);
  const text = normalizeText(raw);

  const gross =
    firstAmount(text, [
      "총지급액",
      "지급총액",
      "급여총액",
      "총 급여",
      "총급여",
      "급여 합계",
      "지급액계",
      "지급합계",
    ]) ?? firstAmount(text, ["Gross", "Total pay"]);

  const base = firstAmount(text, ["기본급", "기본 급여", "통상임금", "기본급여"]);
  const overtime = firstAmount(text, [
    "연장수당",
    "연장근로",
    "연장근로수당",
    "근로시간외",
    "근로시간외수당",
    "야간수당",
    "휴일수당",
    "초과근로",
    "시간외수당",
  ]);
  const bonus = firstAmount(text, ["상여금", "성과급", "인센티브", "상여", "Bonus"]);

  const npEmp = firstAmount(text, ["국민연금", "국민 연금", "국민연금보험료", "연금보험"]);
  const npBiz = firstAmount(text, ["국민연금사업자", "사업자연금", "사업주연금", "사업주 부담"]);

  const health = firstAmount(text, ["건강보험", "건강 보험", "건강보험료"]);
  const empIns = firstAmount(text, ["고용보험", "고용 보험", "고용보험료"]);
  const incomeTax = firstAmount(text, ["소득세", "근로소득세", "갑근세"]);
  const localTax = firstAmount(text, ["지방소득세", "주민세", "지방세", "지방소득"]);

  const severanceReserve = firstAmount(text, [
    "퇴직적립",
    "퇴직금적립",
    "퇴직연금",
    "DC적립",
    "퇴직금",
    "퇴직급여",
    "퇴직충당",
  ]);

  const fields: PensionSlipFields = {
    grossSalary: gross,
    baseSalary: base,
    overtime,
    bonus,
    nationalPensionEmployee: npEmp,
    nationalPensionEmployer: npBiz,
    healthInsurance: health,
    employmentInsurance: empIns,
    incomeTax,
    localIncomeTax: localTax,
    severanceReserve,
  };

  return enrichFromLines(lines, fields);
}

export function slipParseStats(fields: PensionSlipFields): SlipParseStats {
  const filledCount = TRACKED_KEYS.filter((k) => fields[k] !== undefined).length;
  const totalKeys = TRACKED_KEYS.length;
  return {
    filledCount,
    totalKeys,
    fillRatio: filledCount / totalKeys,
  };
}

export function parsePensionSlipWithStats(raw: string): { fields: PensionSlipFields; stats: SlipParseStats } {
  const fields = parsePensionSlipFromOcrText(raw);
  return { fields, stats: slipParseStats(fields) };
}
