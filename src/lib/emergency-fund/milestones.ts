/**
 * Emergency Fund safety milestone timeline (independent of selected target).
 */

export type SafetyMilestoneId = 1 | 3 | 6 | 9 | 12;

export type SafetyMilestone = {
  months: SafetyMilestoneId;
  labelEn: string;
  labelNe: string;
  labelKo: string;
  requiredReserveNpr: number;
  progressPct: number;
  remainingNpr: number;
  achieved: boolean;
};

export const SAFETY_MILESTONE_MONTHS: SafetyMilestoneId[] = [1, 3, 6, 9, 12];

const LABELS: Record<
  SafetyMilestoneId,
  { en: string; ne: string; ko: string }
> = {
  1: { en: "Initial Protection", ne: "प्रारम्भिक सुरक्षा", ko: "초기 보호" },
  3: { en: "Basic Protection", ne: "आधारभूत सुरक्षा", ko: "기본 보호" },
  6: { en: "Strong Protection", ne: "बलियो सुरक्षा", ko: "강한 보호" },
  9: { en: "Advanced Protection", ne: "उन्नत सुरक्षा", ko: "고급 보호" },
  12: { en: "Extended Protection", ne: "विस्तृत सुरक्षा", ko: "확장 보호" },
};

export function buildSafetyMilestones(
  essentialMonthlyNpr: number | null,
  currentReserveNpr: number,
): SafetyMilestone[] {
  if (essentialMonthlyNpr == null || !(essentialMonthlyNpr > 0)) return [];
  const reserve = Math.max(0, currentReserveNpr);
  return SAFETY_MILESTONE_MONTHS.map((months) => {
    const required = Math.round(essentialMonthlyNpr * months);
    const remaining = Math.max(0, required - reserve);
    const progressPct =
      required > 0 ? Math.min(100, Math.round((reserve / required) * 10000) / 100) : 100;
    return {
      months,
      labelEn: LABELS[months].en,
      labelNe: LABELS[months].ne,
      labelKo: LABELS[months].ko,
      requiredReserveNpr: required,
      progressPct,
      remainingNpr: remaining,
      achieved: reserve >= required,
    };
  });
}
