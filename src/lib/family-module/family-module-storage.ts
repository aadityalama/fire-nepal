import { initialFamilyModuleState } from "@/lib/family-module/family-default-state";
import type { FamilyModuleState } from "@/lib/family-module/types";

export const FAMILY_HUB_STORAGE_KEY = "fire-nepal-family-hub-v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function sanitizeFamilyModuleState(raw: unknown): FamilyModuleState {
  if (!isRecord(raw)) return initialFamilyModuleState;
  const base = initialFamilyModuleState;
  return {
    ...base,
    ...(raw as Partial<FamilyModuleState>),
    stabilityScore: typeof raw.stabilityScore === "number" ? raw.stabilityScore : base.stabilityScore,
    upcomingBills: Array.isArray(raw.upcomingBills) ? (raw.upcomingBills as FamilyModuleState["upcomingBills"]) : base.upcomingBills,
    familyGoals: Array.isArray(raw.familyGoals) ? (raw.familyGoals as FamilyModuleState["familyGoals"]) : base.familyGoals,
    emergencyContacts: Array.isArray(raw.emergencyContacts)
      ? (raw.emergencyContacts as FamilyModuleState["emergencyContacts"])
      : base.emergencyContacts,
    hubInsights: Array.isArray(raw.hubInsights) ? (raw.hubInsights as FamilyModuleState["hubInsights"]) : base.hubInsights,
    children: Array.isArray(raw.children) ? (raw.children as FamilyModuleState["children"]) : base.children,
    attendanceWeek: Array.isArray(raw.attendanceWeek)
      ? (raw.attendanceWeek as FamilyModuleState["attendanceWeek"])
      : base.attendanceWeek,
    exam: isRecord(raw.exam) ? ({ ...base.exam, ...raw.exam } as FamilyModuleState["exam"]) : base.exam,
    studyStreakDays: typeof raw.studyStreakDays === "number" ? raw.studyStreakDays : base.studyStreakDays,
    activityMinutes: Array.isArray(raw.activityMinutes)
      ? (raw.activityMinutes as FamilyModuleState["activityMinutes"])
      : base.activityMinutes,
    sleepQuality: isRecord(raw.sleepQuality)
      ? ({ ...base.sleepQuality, ...raw.sleepQuality } as FamilyModuleState["sleepQuality"])
      : base.sleepQuality,
    homework: Array.isArray(raw.homework) ? (raw.homework as FamilyModuleState["homework"]) : base.homework,
    tuition: isRecord(raw.tuition) ? ({ ...base.tuition, ...raw.tuition } as FamilyModuleState["tuition"]) : base.tuition,
    gpa: isRecord(raw.gpa) ? ({ ...base.gpa, ...raw.gpa } as FamilyModuleState["gpa"]) : base.gpa,
    subjects: Array.isArray(raw.subjects) ? (raw.subjects as FamilyModuleState["subjects"]) : base.subjects,
    educationFund: isRecord(raw.educationFund)
      ? ({ ...base.educationFund, ...raw.educationFund } as FamilyModuleState["educationFund"])
      : base.educationFund,
    medicineReminders: Array.isArray(raw.medicineReminders)
      ? (raw.medicineReminders as FamilyModuleState["medicineReminders"])
      : base.medicineReminders,
    insurance: Array.isArray(raw.insurance) ? (raw.insurance as FamilyModuleState["insurance"]) : base.insurance,
    vaccinations: Array.isArray(raw.vaccinations) ? (raw.vaccinations as FamilyModuleState["vaccinations"]) : base.vaccinations,
    emergencyMedical: isRecord(raw.emergencyMedical)
      ? ({ ...base.emergencyMedical, ...raw.emergencyMedical } as FamilyModuleState["emergencyMedical"])
      : base.emergencyMedical,
    calendarEvents: Array.isArray(raw.calendarEvents)
      ? (raw.calendarEvents as FamilyModuleState["calendarEvents"])
      : base.calendarEvents,
    parentingNotes: Array.isArray(raw.parentingNotes)
      ? (raw.parentingNotes as FamilyModuleState["parentingNotes"])
      : base.parentingNotes,
    parentingInsights: Array.isArray(raw.parentingInsights)
      ? (raw.parentingInsights as FamilyModuleState["parentingInsights"])
      : base.parentingInsights,
    familyAlerts: Array.isArray(raw.familyAlerts) ? (raw.familyAlerts as FamilyModuleState["familyAlerts"]) : base.familyAlerts,
    behaviorInsights: Array.isArray(raw.behaviorInsights)
      ? (raw.behaviorInsights as FamilyModuleState["behaviorInsights"])
      : base.behaviorInsights,
    smartRecommendations: Array.isArray(raw.smartRecommendations)
      ? (raw.smartRecommendations as FamilyModuleState["smartRecommendations"])
      : base.smartRecommendations,
    feePaymentHistory: Array.isArray(raw.feePaymentHistory)
      ? (raw.feePaymentHistory as FamilyModuleState["feePaymentHistory"])
      : base.feePaymentHistory,
    examResults: Array.isArray(raw.examResults) ? (raw.examResults as FamilyModuleState["examResults"]) : base.examResults,
    gpaHistory: Array.isArray(raw.gpaHistory) ? (raw.gpaHistory as FamilyModuleState["gpaHistory"]) : base.gpaHistory,
    subjectTrendPoints: Array.isArray(raw.subjectTrendPoints)
      ? (raw.subjectTrendPoints as FamilyModuleState["subjectTrendPoints"])
      : base.subjectTrendPoints,
    vaultDocuments: Array.isArray(raw.vaultDocuments)
      ? (raw.vaultDocuments as FamilyModuleState["vaultDocuments"])
      : base.vaultDocuments,
    vaultTimeline: Array.isArray(raw.vaultTimeline) ? (raw.vaultTimeline as FamilyModuleState["vaultTimeline"]) : base.vaultTimeline,
    documentReminders: Array.isArray(raw.documentReminders)
      ? (raw.documentReminders as FamilyModuleState["documentReminders"])
      : base.documentReminders,
    vaultEducationInsights: Array.isArray(raw.vaultEducationInsights)
      ? (raw.vaultEducationInsights as FamilyModuleState["vaultEducationInsights"])
      : base.vaultEducationInsights,
    schedulePeriods: Array.isArray(raw.schedulePeriods)
      ? (raw.schedulePeriods as FamilyModuleState["schedulePeriods"])
      : base.schedulePeriods,
    examSchedule: Array.isArray(raw.examSchedule) ? (raw.examSchedule as FamilyModuleState["examSchedule"]) : base.examSchedule,
    teacherNotes: Array.isArray(raw.teacherNotes) ? (raw.teacherNotes as FamilyModuleState["teacherNotes"]) : base.teacherNotes,
  };
}

export function loadFamilyModuleLocal(): FamilyModuleState {
  if (typeof window === "undefined") return initialFamilyModuleState;
  try {
    const raw = window.localStorage.getItem(FAMILY_HUB_STORAGE_KEY);
    if (!raw) return initialFamilyModuleState;
    return sanitizeFamilyModuleState(JSON.parse(raw) as unknown);
  } catch {
    return initialFamilyModuleState;
  }
}

export function saveFamilyModuleLocal(state: FamilyModuleState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FAMILY_HUB_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function clearFamilyModuleLocalCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(FAMILY_HUB_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
