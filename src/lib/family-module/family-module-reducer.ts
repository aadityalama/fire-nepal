import type {
  ActivitySlice,
  AiInsight,
  BehaviorRow,
  CalendarEvent,
  ChildSummary,
  EmergencyContact,
  ExamResult,
  FamilyAlert,
  FamilyBill,
  FamilyGoal,
  FamilyModuleState,
  GpaSnapshot,
  HomeworkItem,
  ExamScheduleEntry,
  InsuranceRow,
  SchedulePeriod,
  TeacherNote,
  MedicineReminder,
  ParentingNote,
  RecommendationRow,
  SchoolFeePayment,
  SubjectRow,
  SubjectTrendPoint,
  VaccinationRow,
  VaultDocument,
  VaultDocumentReminder,
  VaultTimelineEntry,
} from "@/lib/family-module/types";
import { newFamilyId } from "@/lib/family-module/id";
import { initialFamilyModuleState } from "@/lib/family-module/family-default-state";

export type FamilyModuleAction =
  | { type: "ADD_CHILD"; child: Omit<ChildSummary, "id" | "avatarHue"> & { avatarHue?: string } }
  | { type: "UPDATE_CHILD"; id: string; patch: Partial<ChildSummary> }
  | { type: "DELETE_CHILD"; id: string }
  | { type: "SET_ATTENDANCE"; index: number; pct: number }
  | { type: "SET_EXAM"; patch: Partial<FamilyModuleState["exam"]> }
  | { type: "SET_STUDY_STREAK"; days: number }
  | { type: "UPDATE_ACTIVITY"; id: string; patch: Partial<ActivitySlice> }
  | { type: "ADD_ACTIVITY"; slice: Omit<ActivitySlice, "id"> & { id?: string } }
  | { type: "DELETE_ACTIVITY"; id: string }
  | { type: "SET_SLEEP"; patch: Partial<FamilyModuleState["sleepQuality"]> }
  | { type: "ADD_HOMEWORK"; item: Omit<HomeworkItem, "id"> & { id?: string } }
  | { type: "UPDATE_HOMEWORK"; id: string; patch: Partial<HomeworkItem> }
  | { type: "DELETE_HOMEWORK"; id: string }
  | { type: "ADD_SCHEDULE_PERIOD"; row: Omit<SchedulePeriod, "id"> & { id?: string } }
  | { type: "UPDATE_SCHEDULE_PERIOD"; id: string; patch: Partial<SchedulePeriod> }
  | { type: "DELETE_SCHEDULE_PERIOD"; id: string }
  | { type: "ADD_EXAM_SCHEDULE"; row: Omit<ExamScheduleEntry, "id"> & { id?: string } }
  | { type: "UPDATE_EXAM_SCHEDULE"; id: string; patch: Partial<ExamScheduleEntry> }
  | { type: "DELETE_EXAM_SCHEDULE"; id: string }
  | { type: "ADD_TEACHER_NOTE"; row: Omit<TeacherNote, "id"> & { id?: string } }
  | { type: "UPDATE_TEACHER_NOTE"; id: string; patch: Partial<TeacherNote> }
  | { type: "DELETE_TEACHER_NOTE"; id: string }
  | { type: "SET_TUITION"; patch: Partial<FamilyModuleState["tuition"]> }
  | { type: "SET_GPA"; patch: Partial<FamilyModuleState["gpa"]> }
  | { type: "ADD_SUBJECT"; row: Omit<SubjectRow, "id"> & { id?: string } }
  | { type: "UPDATE_SUBJECT"; id: string; patch: Partial<SubjectRow> }
  | { type: "DELETE_SUBJECT"; id: string }
  | { type: "SET_EDUCATION_FUND"; patch: Partial<FamilyModuleState["educationFund"]> }
  | { type: "ADD_MEDICINE"; row: Omit<MedicineReminder, "id"> & { id?: string } }
  | { type: "UPDATE_MEDICINE"; id: string; patch: Partial<MedicineReminder> }
  | { type: "DELETE_MEDICINE"; id: string }
  | { type: "ADD_INSURANCE"; row: Omit<InsuranceRow, "id"> & { id?: string } }
  | { type: "UPDATE_INSURANCE"; id: string; patch: Partial<InsuranceRow> }
  | { type: "DELETE_INSURANCE"; id: string }
  | { type: "ADD_VACCINATION"; row: Omit<VaccinationRow, "id"> & { id?: string } }
  | { type: "UPDATE_VACCINATION"; id: string; patch: Partial<VaccinationRow> }
  | { type: "DELETE_VACCINATION"; id: string }
  | { type: "SET_EMERGENCY_MEDICAL"; patch: Partial<FamilyModuleState["emergencyMedical"]> }
  | { type: "ADD_CALENDAR_EVENT"; event: Omit<CalendarEvent, "id"> & { id?: string } }
  | { type: "UPDATE_CALENDAR_EVENT"; id: string; patch: Partial<CalendarEvent> }
  | { type: "DELETE_CALENDAR_EVENT"; id: string }
  | { type: "ADD_PARENTING_NOTE"; note: Omit<ParentingNote, "id"> & { id?: string } }
  | { type: "UPDATE_PARENTING_NOTE"; id: string; patch: Partial<ParentingNote> }
  | { type: "DELETE_PARENTING_NOTE"; id: string }
  | { type: "ADD_PARENTING_INSIGHT"; insight: Omit<AiInsight, "id"> & { id?: string } }
  | { type: "UPDATE_PARENTING_INSIGHT"; id: string; patch: Partial<AiInsight> }
  | { type: "DELETE_PARENTING_INSIGHT"; id: string }
  | { type: "ADD_FAMILY_ALERT"; alert: Omit<FamilyAlert, "id"> & { id?: string } }
  | { type: "UPDATE_FAMILY_ALERT"; id: string; patch: Partial<FamilyAlert> }
  | { type: "DELETE_FAMILY_ALERT"; id: string }
  | { type: "ADD_BEHAVIOR"; row: Omit<BehaviorRow, "id"> & { id?: string } }
  | { type: "UPDATE_BEHAVIOR"; id: string; patch: Partial<BehaviorRow> }
  | { type: "DELETE_BEHAVIOR"; id: string }
  | { type: "ADD_RECOMMENDATION"; row: Omit<RecommendationRow, "id"> & { id?: string } }
  | { type: "UPDATE_RECOMMENDATION"; id: string; patch: Partial<RecommendationRow> }
  | { type: "DELETE_RECOMMENDATION"; id: string }
  | { type: "SET_STABILITY_SCORE"; score: number }
  | { type: "UPDATE_BILL"; id: string; patch: Partial<FamilyBill> }
  | { type: "UPDATE_GOAL"; id: string; patch: Partial<FamilyGoal> }
  | { type: "UPDATE_HUB_INSIGHT"; id: string; patch: Partial<AiInsight> }
  | { type: "ADD_HUB_INSIGHT"; insight: Omit<AiInsight, "id"> & { id?: string } }
  | { type: "DELETE_HUB_INSIGHT"; id: string }
  | { type: "UPDATE_CONTACT"; id: string; patch: Partial<EmergencyContact> }
  | { type: "ADD_CONTACT"; contact: Omit<EmergencyContact, "id"> & { id?: string } }
  | { type: "DELETE_CONTACT"; id: string }
  | { type: "ADD_FEE_PAYMENT"; row: Omit<SchoolFeePayment, "id"> & { id?: string } }
  | { type: "UPDATE_FEE_PAYMENT"; id: string; patch: Partial<SchoolFeePayment> }
  | { type: "DELETE_FEE_PAYMENT"; id: string }
  | { type: "ADD_EXAM_RESULT"; row: Omit<ExamResult, "id"> & { id?: string } }
  | { type: "UPDATE_EXAM_RESULT"; id: string; patch: Partial<ExamResult> }
  | { type: "DELETE_EXAM_RESULT"; id: string }
  | { type: "ADD_GPA_SNAPSHOT"; row: Omit<GpaSnapshot, "id"> & { id?: string } }
  | { type: "ADD_SUBJECT_TREND_POINT"; row: Omit<SubjectTrendPoint, "id"> & { id?: string } }
  | { type: "ADD_VAULT_DOCUMENT"; doc: Omit<VaultDocument, "id"> & { id?: string } }
  | { type: "UPDATE_VAULT_DOCUMENT"; id: string; patch: Partial<VaultDocument> }
  | { type: "DELETE_VAULT_DOCUMENT"; id: string }
  | { type: "ADD_DOCUMENT_REMINDER"; row: Omit<VaultDocumentReminder, "id"> & { id?: string } }
  | { type: "UPDATE_DOCUMENT_REMINDER"; id: string; patch: Partial<VaultDocumentReminder> }
  | { type: "DELETE_DOCUMENT_REMINDER"; id: string }
  | { type: "ADD_VAULT_EDUCATION_INSIGHT"; insight: Omit<AiInsight, "id"> & { id?: string } }
  | { type: "UPDATE_VAULT_EDUCATION_INSIGHT"; id: string; patch: Partial<AiInsight> }
  | { type: "DELETE_VAULT_EDUCATION_INSIGHT"; id: string }
  | { type: "RESET_FAMILY_STATE" };

const AVATAR_ROTATION: ChildSummary["avatarHue"][] = [
  "from-emerald-400/90 to-teal-500/80",
  "from-lime-400/90 to-emerald-500/80",
  "from-teal-400/90 to-cyan-500/80",
  "from-emerald-500/90 to-lime-400/80",
];

function prependTimeline(state: FamilyModuleState, entry: Omit<VaultTimelineEntry, "id"> & { id?: string }): VaultTimelineEntry[] {
  const id = entry.id ?? newFamilyId("vtl");
  return [{ ...entry, id }, ...state.vaultTimeline].slice(0, 250);
}

function stripTimelineByRef(state: FamilyModuleState, refId: string): VaultTimelineEntry[] {
  return state.vaultTimeline.filter((t) => t.refId !== refId);
}

export function familyModuleReducer(state: FamilyModuleState, action: FamilyModuleAction): FamilyModuleState {
  switch (action.type) {
    case "RESET_FAMILY_STATE":
      return { ...initialFamilyModuleState };
    case "ADD_CHILD": {
      const id = newFamilyId("child");
      const { avatarHue: incomingHue, ...rest } = action.child;
      const hue = incomingHue ?? AVATAR_ROTATION[state.children.length % AVATAR_ROTATION.length];
      const child: ChildSummary = { ...rest, id, avatarHue: hue };
      return { ...state, children: [...state.children, child] };
    }
    case "UPDATE_CHILD":
      return {
        ...state,
        children: state.children.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)),
      };
    case "DELETE_CHILD":
      return {
        ...state,
        children: state.children.filter((c) => c.id !== action.id),
        schedulePeriods: state.schedulePeriods.filter((p) => p.childId !== action.id),
        examSchedule: state.examSchedule.filter((e) => e.childId !== action.id),
        teacherNotes: state.teacherNotes.filter((n) => n.childId !== action.id),
        homework: state.homework.filter((h) => !h.childId || h.childId !== action.id),
      };
    case "SET_ATTENDANCE": {
      const next = [...state.attendanceWeek];
      if (next[action.index]) next[action.index] = { ...next[action.index], pct: action.pct };
      return { ...state, attendanceWeek: next };
    }
    case "SET_EXAM":
      return { ...state, exam: { ...state.exam, ...action.patch } };
    case "SET_STUDY_STREAK":
      return { ...state, studyStreakDays: Math.max(0, Math.floor(action.days)) };
    case "UPDATE_ACTIVITY":
      return {
        ...state,
        activityMinutes: state.activityMinutes.map((a) => (a.id === action.id ? { ...a, ...action.patch } : a)),
      };
    case "ADD_ACTIVITY": {
      const id = action.slice.id ?? newFamilyId("act");
      const row: ActivitySlice = { ...action.slice, id };
      return { ...state, activityMinutes: [...state.activityMinutes, row] };
    }
    case "DELETE_ACTIVITY":
      return { ...state, activityMinutes: state.activityMinutes.filter((a) => a.id !== action.id) };
    case "SET_SLEEP":
      return { ...state, sleepQuality: { ...state.sleepQuality, ...action.patch } };
    case "ADD_HOMEWORK": {
      const id = action.item.id ?? newFamilyId("hw");
      return { ...state, homework: [...state.homework, { ...action.item, id }] };
    }
    case "UPDATE_HOMEWORK":
      return {
        ...state,
        homework: state.homework.map((h) => (h.id === action.id ? { ...h, ...action.patch } : h)),
      };
    case "DELETE_HOMEWORK":
      return { ...state, homework: state.homework.filter((h) => h.id !== action.id) };
    case "ADD_SCHEDULE_PERIOD": {
      const id = action.row.id ?? newFamilyId("sch");
      const row: SchedulePeriod = { ...action.row, id };
      return { ...state, schedulePeriods: [...state.schedulePeriods, row] };
    }
    case "UPDATE_SCHEDULE_PERIOD":
      return {
        ...state,
        schedulePeriods: state.schedulePeriods.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)),
      };
    case "DELETE_SCHEDULE_PERIOD":
      return { ...state, schedulePeriods: state.schedulePeriods.filter((p) => p.id !== action.id) };
    case "ADD_EXAM_SCHEDULE": {
      const id = action.row.id ?? newFamilyId("exs");
      const row: ExamScheduleEntry = { ...action.row, id };
      return { ...state, examSchedule: [...state.examSchedule, row] };
    }
    case "UPDATE_EXAM_SCHEDULE":
      return {
        ...state,
        examSchedule: state.examSchedule.map((e) => (e.id === action.id ? { ...e, ...action.patch } : e)),
      };
    case "DELETE_EXAM_SCHEDULE":
      return { ...state, examSchedule: state.examSchedule.filter((e) => e.id !== action.id) };
    case "ADD_TEACHER_NOTE": {
      const id = action.row.id ?? newFamilyId("tn");
      const row: TeacherNote = { ...action.row, id };
      return { ...state, teacherNotes: [...state.teacherNotes, row] };
    }
    case "UPDATE_TEACHER_NOTE":
      return {
        ...state,
        teacherNotes: state.teacherNotes.map((n) => (n.id === action.id ? { ...n, ...action.patch } : n)),
      };
    case "DELETE_TEACHER_NOTE":
      return { ...state, teacherNotes: state.teacherNotes.filter((n) => n.id !== action.id) };
    case "SET_TUITION":
      return { ...state, tuition: { ...state.tuition, ...action.patch } };
    case "SET_GPA":
      return { ...state, gpa: { ...state.gpa, ...action.patch } };
    case "ADD_SUBJECT": {
      const id = action.row.id ?? newFamilyId("sub");
      return { ...state, subjects: [...state.subjects, { ...action.row, id }] };
    }
    case "UPDATE_SUBJECT":
      return {
        ...state,
        subjects: state.subjects.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)),
      };
    case "DELETE_SUBJECT":
      return { ...state, subjects: state.subjects.filter((s) => s.id !== action.id) };
    case "SET_EDUCATION_FUND":
      return { ...state, educationFund: { ...state.educationFund, ...action.patch } };
    case "ADD_MEDICINE": {
      const id = action.row.id ?? newFamilyId("med");
      return { ...state, medicineReminders: [...state.medicineReminders, { ...action.row, id }] };
    }
    case "UPDATE_MEDICINE":
      return {
        ...state,
        medicineReminders: state.medicineReminders.map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)),
      };
    case "DELETE_MEDICINE":
      return { ...state, medicineReminders: state.medicineReminders.filter((m) => m.id !== action.id) };
    case "ADD_INSURANCE": {
      const id = action.row.id ?? newFamilyId("ins");
      return { ...state, insurance: [...state.insurance, { ...action.row, id }] };
    }
    case "UPDATE_INSURANCE":
      return {
        ...state,
        insurance: state.insurance.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)),
      };
    case "DELETE_INSURANCE":
      return { ...state, insurance: state.insurance.filter((i) => i.id !== action.id) };
    case "ADD_VACCINATION": {
      const id = action.row.id ?? newFamilyId("vac");
      return { ...state, vaccinations: [...state.vaccinations, { ...action.row, id }] };
    }
    case "UPDATE_VACCINATION":
      return {
        ...state,
        vaccinations: state.vaccinations.map((v) => (v.id === action.id ? { ...v, ...action.patch } : v)),
      };
    case "DELETE_VACCINATION":
      return { ...state, vaccinations: state.vaccinations.filter((v) => v.id !== action.id) };
    case "SET_EMERGENCY_MEDICAL":
      return { ...state, emergencyMedical: { ...state.emergencyMedical, ...action.patch } };
    case "ADD_CALENDAR_EVENT": {
      const id = action.event.id ?? newFamilyId("cal");
      return { ...state, calendarEvents: [...state.calendarEvents, { ...action.event, id }] };
    }
    case "UPDATE_CALENDAR_EVENT":
      return {
        ...state,
        calendarEvents: state.calendarEvents.map((e) => (e.id === action.id ? { ...e, ...action.patch } : e)),
      };
    case "DELETE_CALENDAR_EVENT":
      return { ...state, calendarEvents: state.calendarEvents.filter((e) => e.id !== action.id) };
    case "ADD_PARENTING_NOTE": {
      const id = action.note.id ?? newFamilyId("note");
      return { ...state, parentingNotes: [...state.parentingNotes, { ...action.note, id }] };
    }
    case "UPDATE_PARENTING_NOTE":
      return {
        ...state,
        parentingNotes: state.parentingNotes.map((n) => (n.id === action.id ? { ...n, ...action.patch } : n)),
      };
    case "DELETE_PARENTING_NOTE":
      return { ...state, parentingNotes: state.parentingNotes.filter((n) => n.id !== action.id) };
    case "ADD_PARENTING_INSIGHT": {
      const id = action.insight.id ?? newFamilyId("pai");
      return { ...state, parentingInsights: [...state.parentingInsights, { ...action.insight, id }] };
    }
    case "UPDATE_PARENTING_INSIGHT":
      return {
        ...state,
        parentingInsights: state.parentingInsights.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)),
      };
    case "DELETE_PARENTING_INSIGHT":
      return { ...state, parentingInsights: state.parentingInsights.filter((i) => i.id !== action.id) };
    case "ADD_FAMILY_ALERT": {
      const id = action.alert.id ?? newFamilyId("fa");
      return { ...state, familyAlerts: [...state.familyAlerts, { ...action.alert, id }] };
    }
    case "UPDATE_FAMILY_ALERT":
      return {
        ...state,
        familyAlerts: state.familyAlerts.map((a) => (a.id === action.id ? { ...a, ...action.patch } : a)),
      };
    case "DELETE_FAMILY_ALERT":
      return { ...state, familyAlerts: state.familyAlerts.filter((a) => a.id !== action.id) };
    case "ADD_BEHAVIOR": {
      const id = action.row.id ?? newFamilyId("bh");
      return { ...state, behaviorInsights: [...state.behaviorInsights, { ...action.row, id }] };
    }
    case "UPDATE_BEHAVIOR":
      return {
        ...state,
        behaviorInsights: state.behaviorInsights.map((b) => (b.id === action.id ? { ...b, ...action.patch } : b)),
      };
    case "DELETE_BEHAVIOR":
      return { ...state, behaviorInsights: state.behaviorInsights.filter((b) => b.id !== action.id) };
    case "ADD_RECOMMENDATION": {
      const id = action.row.id ?? newFamilyId("rec");
      return { ...state, smartRecommendations: [...state.smartRecommendations, { ...action.row, id }] };
    }
    case "UPDATE_RECOMMENDATION":
      return {
        ...state,
        smartRecommendations: state.smartRecommendations.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)),
      };
    case "DELETE_RECOMMENDATION":
      return { ...state, smartRecommendations: state.smartRecommendations.filter((r) => r.id !== action.id) };
    case "SET_STABILITY_SCORE":
      return { ...state, stabilityScore: Math.min(100, Math.max(0, action.score)) };
    case "UPDATE_BILL":
      return {
        ...state,
        upcomingBills: state.upcomingBills.map((b) => (b.id === action.id ? { ...b, ...action.patch } : b)),
      };
    case "UPDATE_GOAL":
      return {
        ...state,
        familyGoals: state.familyGoals.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)),
      };
    case "UPDATE_HUB_INSIGHT":
      return {
        ...state,
        hubInsights: state.hubInsights.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)),
      };
    case "ADD_HUB_INSIGHT": {
      const id = action.insight.id ?? newFamilyId("hub");
      return { ...state, hubInsights: [...state.hubInsights, { ...action.insight, id }] };
    }
    case "DELETE_HUB_INSIGHT":
      return { ...state, hubInsights: state.hubInsights.filter((i) => i.id !== action.id) };
    case "UPDATE_CONTACT":
      return {
        ...state,
        emergencyContacts: state.emergencyContacts.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)),
      };
    case "ADD_CONTACT": {
      const id = action.contact.id ?? newFamilyId("em");
      return { ...state, emergencyContacts: [...state.emergencyContacts, { ...action.contact, id }] };
    }
    case "DELETE_CONTACT":
      return { ...state, emergencyContacts: state.emergencyContacts.filter((c) => c.id !== action.id) };
    case "ADD_FEE_PAYMENT": {
      const id = action.row.id ?? newFamilyId("fee");
      const row: SchoolFeePayment = { ...action.row, id };
      const tl = prependTimeline(state, {
        kind: "fee",
        title: `School fee · ${row.term}`,
        detail: `NPR ${row.amountNpr.toLocaleString("en-NP")} · ${row.method}`,
        occurredAt: `${row.paidAt}T12:00:00.000Z`,
        refId: id,
      });
      return { ...state, feePaymentHistory: [...state.feePaymentHistory, row], vaultTimeline: tl };
    }
    case "UPDATE_FEE_PAYMENT":
      return {
        ...state,
        feePaymentHistory: state.feePaymentHistory.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)),
      };
    case "DELETE_FEE_PAYMENT":
      return {
        ...state,
        feePaymentHistory: state.feePaymentHistory.filter((r) => r.id !== action.id),
        vaultTimeline: stripTimelineByRef(state, action.id),
      };
    case "ADD_EXAM_RESULT": {
      const id = action.row.id ?? newFamilyId("exam");
      const row: ExamResult = { ...action.row, id };
      const score = row.scorePct != null ? `${row.scorePct}%` : row.gradeLabel;
      const tl = prependTimeline(state, {
        kind: "exam",
        title: row.title,
        detail: `${row.subject} · ${score}`,
        occurredAt: `${row.date}T09:00:00.000Z`,
        refId: id,
      });
      return { ...state, examResults: [...state.examResults, row], vaultTimeline: tl };
    }
    case "UPDATE_EXAM_RESULT":
      return {
        ...state,
        examResults: state.examResults.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)),
      };
    case "DELETE_EXAM_RESULT":
      return {
        ...state,
        examResults: state.examResults.filter((r) => r.id !== action.id),
        vaultTimeline: stripTimelineByRef(state, action.id),
      };
    case "ADD_GPA_SNAPSHOT": {
      const id = action.row.id ?? newFamilyId("gpa");
      const row: GpaSnapshot = { ...action.row, id };
      const tl = prependTimeline(state, {
        kind: "gpa",
        title: `GPA · ${row.term}`,
        detail: row.gpa.toFixed(2),
        occurredAt: `${row.date}T12:00:00.000Z`,
        refId: id,
      });
      return { ...state, gpaHistory: [...state.gpaHistory, row], vaultTimeline: tl };
    }
    case "ADD_SUBJECT_TREND_POINT": {
      const id = action.row.id ?? newFamilyId("tr");
      const row: SubjectTrendPoint = { ...action.row, id };
      const tl = prependTimeline(state, {
        kind: "insight",
        title: `Subject trend · ${row.subject}`,
        detail: `${row.pct}% on ${row.date}`,
        occurredAt: `${row.date}T15:00:00.000Z`,
        refId: id,
      });
      return { ...state, subjectTrendPoints: [...state.subjectTrendPoints, row], vaultTimeline: tl };
    }
    case "ADD_VAULT_DOCUMENT": {
      const id = action.doc.id ?? newFamilyId("doc");
      const doc: VaultDocument = { ...action.doc, id };
      const tl = prependTimeline(state, {
        kind: "document",
        title: `Vault · ${doc.title}`,
        detail: `${doc.category} · ${doc.fileName}`,
        occurredAt: doc.uploadedAt,
        refId: id,
      });
      return { ...state, vaultDocuments: [...state.vaultDocuments, doc], vaultTimeline: tl };
    }
    case "UPDATE_VAULT_DOCUMENT":
      return {
        ...state,
        vaultDocuments: state.vaultDocuments.map((d) => (d.id === action.id ? { ...d, ...action.patch } : d)),
      };
    case "DELETE_VAULT_DOCUMENT":
      return {
        ...state,
        vaultDocuments: state.vaultDocuments.filter((d) => d.id !== action.id),
        vaultTimeline: stripTimelineByRef(state, action.id),
      };
    case "ADD_DOCUMENT_REMINDER": {
      const id = action.row.id ?? newFamilyId("drem");
      const row: VaultDocumentReminder = { ...action.row, id };
      const tl = prependTimeline(state, {
        kind: "reminder",
        title: `Reminder · ${row.title}`,
        detail: `Due ${row.dueDate}`,
        occurredAt: new Date().toISOString(),
        refId: id,
      });
      return { ...state, documentReminders: [...state.documentReminders, row], vaultTimeline: tl };
    }
    case "UPDATE_DOCUMENT_REMINDER":
      return {
        ...state,
        documentReminders: state.documentReminders.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)),
      };
    case "DELETE_DOCUMENT_REMINDER":
      return {
        ...state,
        documentReminders: state.documentReminders.filter((r) => r.id !== action.id),
        vaultTimeline: stripTimelineByRef(state, action.id),
      };
    case "ADD_VAULT_EDUCATION_INSIGHT": {
      const id = action.insight.id ?? newFamilyId("vei");
      return { ...state, vaultEducationInsights: [...state.vaultEducationInsights, { ...action.insight, id }] };
    }
    case "UPDATE_VAULT_EDUCATION_INSIGHT":
      return {
        ...state,
        vaultEducationInsights: state.vaultEducationInsights.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)),
      };
    case "DELETE_VAULT_EDUCATION_INSIGHT":
      return { ...state, vaultEducationInsights: state.vaultEducationInsights.filter((i) => i.id !== action.id) };
    default:
      return state;
  }
}

export { initialFamilyModuleState };
