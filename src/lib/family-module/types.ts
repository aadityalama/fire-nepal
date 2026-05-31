export type FamilyBill = { id: string; label: string; amountNpr: number; dueInDays: number; category: string };

export type ChildSummary = {
  id: string;
  name: string;
  age: number;
  school: string;
  grade: string;
  mood: string;
  avatarHue: string;
};

export type CalendarEventType = "school" | "salary" | "bill" | "birthday" | "visa";

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: CalendarEventType;
};

export type FamilyGoal = { id: string; title: string; pct: number; targetNpr: number; savedNpr: number };

export type EmergencyContact = { id: string; name: string; relation: string; phone: string; note?: string };

export type AiInsight = { id: string; title: string; body: string; tone: "positive" | "watch" | "neutral" };

export type AttendanceDay = { label: string; pct: number };

export type ActivitySlice = { id: string; label: string; value: number; color: string };

export type HomeworkItem = {
  id: string;
  subject: string;
  task: string;
  due: string;
  /** When set, ties homework to a child for schedule & parent views */
  childId?: string | null;
  completed?: boolean;
};

/** Weekly timetable row — `dayOfWeek` 0 = Monday … 6 = Sunday */
export type SchedulePeriod = {
  id: string;
  childId: string;
  dayOfWeek: number;
  periodOrder: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacherName: string;
};

export type ExamScheduleEntry = {
  id: string;
  childId: string;
  title: string;
  subject: string;
  date: string;
  startTime?: string;
  room?: string;
  notes?: string;
};

export type TeacherNote = {
  id: string;
  childId: string;
  subject: string;
  teacherName: string;
  body: string;
  updatedAt: string;
};

export type SubjectRow = { id: string; subject: string; pct: number };

export type MedicineReminder = { id: string; name: string; schedule: string; child: string };

export type InsuranceRow = { id: string; label: string; renews: string; premiumNpr: number };

export type VaccinationRow = { id: string; name: string; child: string; status: string };

export type ParentingNote = { id: string; title: string; body: string };

export type FamilyAlert = { id: string; title: string; detail: string };

export type BehaviorRow = { id: string; child: string; text: string };

export type RecommendationRow = { id: string; text: string };

/** Child Records & Document Vault */
export type VaultDocumentCategory = "certificate" | "report_card" | "fee_receipt" | "id_doc" | "medical" | "other";

export type VaultDocument = {
  id: string;
  title: string;
  category: VaultDocumentCategory;
  childId: string | null;
  fileName: string;
  mimeType: string;
  byteSize: number;
  uploadedAt: string;
  notes?: string;
};

export type SchoolFeePayment = {
  id: string;
  childId: string;
  term: string;
  paidAt: string;
  amountNpr: number;
  method: string;
  reference?: string;
};

export type ExamResult = {
  id: string;
  childId: string;
  title: string;
  date: string;
  scorePct: number | null;
  gradeLabel: string;
  subject: string;
};

export type GpaSnapshot = { id: string; date: string; gpa: number; term: string };

export type SubjectTrendPoint = { id: string; subject: string; date: string; pct: number };

export type VaultTimelineKind = "fee" | "exam" | "document" | "gpa" | "reminder" | "insight";

export type VaultTimelineEntry = {
  id: string;
  kind: VaultTimelineKind;
  title: string;
  detail: string;
  occurredAt: string;
  refId?: string;
};

export type VaultDocumentReminder = {
  id: string;
  title: string;
  dueDate: string;
  childId: string | null;
  note?: string;
};

export type FamilyModuleState = {
  stabilityScore: number;
  upcomingBills: FamilyBill[];
  familyGoals: FamilyGoal[];
  emergencyContacts: EmergencyContact[];
  hubInsights: AiInsight[];
  children: ChildSummary[];
  attendanceWeek: AttendanceDay[];
  exam: { title: string; subject: string; examDate: string };
  studyStreakDays: number;
  activityMinutes: ActivitySlice[];
  sleepQuality: { score: number; deepHours: number; bedTime: string; wakeTime: string; note: string };
  homework: HomeworkItem[];
  tuition: { term: string; paidNpr: number; totalNpr: number; nextInstallment: string };
  gpa: { current: number; target: number; term: string };
  subjects: SubjectRow[];
  educationFund: { monthlySipNpr: number; yearsToUniversity: number; projectedCorpusNpr: number; gapNpr: number };
  medicineReminders: MedicineReminder[];
  insurance: InsuranceRow[];
  vaccinations: VaccinationRow[];
  emergencyMedical: { bloodTypes: string; allergies: string; insurerCard: string };
  calendarEvents: CalendarEvent[];
  parentingNotes: ParentingNote[];
  parentingInsights: AiInsight[];
  familyAlerts: FamilyAlert[];
  behaviorInsights: BehaviorRow[];
  smartRecommendations: RecommendationRow[];
  feePaymentHistory: SchoolFeePayment[];
  examResults: ExamResult[];
  gpaHistory: GpaSnapshot[];
  subjectTrendPoints: SubjectTrendPoint[];
  vaultDocuments: VaultDocument[];
  vaultTimeline: VaultTimelineEntry[];
  documentReminders: VaultDocumentReminder[];
  vaultEducationInsights: AiInsight[];
  /** School Schedule System (Education hub) */
  schedulePeriods: SchedulePeriod[];
  examSchedule: ExamScheduleEntry[];
  teacherNotes: TeacherNote[];
};
