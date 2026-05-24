import type { PensionLocale } from "@/lib/pension-types";
import type { SalarySlipRecord } from "@/lib/pension-types";
import {
  averageGrossFromSlips,
  estimateSeveranceBallpark,
  monthsBetweenUtc,
  totalNationalPensionFromSlip,
} from "@/lib/pension-severance-math";
import { pensionT } from "@/lib/pension-i18n";

export function buildPensionAiInsights(
  locale: PensionLocale,
  slips: SalarySlipRecord[],
  joinDateIso: string,
): string[] {
  const t = (key: string, vars?: Record<string, string | number>) => pensionT(locale, key, vars);
  const sorted = [...slips].sort((a, b) => a.periodYm.localeCompare(b.periodYm));
  if (sorted.length === 0) {
    return [t("aiUploadFirst")];
  }

  const lines: string[] = [];
  const latest = sorted[sorted.length - 1]!;
  const prev = sorted.length > 1 ? sorted[sorted.length - 2]! : null;

  const npLatest = totalNationalPensionFromSlip(latest.fields);
  if (npLatest.total > 0) {
    lines.push(t("aiCompanyContributionOk"));
  }

  if (prev) {
    const npPrev = totalNationalPensionFromSlip(prev.fields);
    if (npLatest.total > npPrev.total) {
      lines.push(t("aiPensionUp"));
    } else if (npLatest.total < npPrev.total && npPrev.total > 0) {
      lines.push(t("aiPensionDown"));
    }
  }

  const avg = averageGrossFromSlips(sorted, 3);
  const tenureNow = monthsBetweenUtc(joinDateIso, `${latest.periodYm}-15`);
  const sevNow = estimateSeveranceBallpark(avg, tenureNow);
  if (sevNow > 0) {
    lines.push(t("aiSeveranceToday", { amount: sevNow.toLocaleString() }));
  }

  const sev2 = estimateSeveranceBallpark(avg, tenureNow + 24);
  lines.push(t("aiSeveranceTwoYears", { amount: sev2.toLocaleString() }));

  return lines.slice(0, 6);
}