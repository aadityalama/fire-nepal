import type { ExamScheduleEntry, FamilyModuleState, SchedulePeriod, TeacherNote } from "@/lib/family-module/types";

function defaultSchedulePeriods(): SchedulePeriod[] {
  const childId = "c1";
  const blocks = [
    { periodOrder: 1, startTime: "08:20", endTime: "08:35", subject: "Homeroom", teacherName: "Ms. Park" },
    { periodOrder: 2, startTime: "08:40", endTime: "09:30", subject: "Mathematics", teacherName: "Mr. Choi" },
    { periodOrder: 3, startTime: "09:35", endTime: "10:25", subject: "English", teacherName: "Ms. Rao" },
    { periodOrder: 4, startTime: "10:45", endTime: "11:35", subject: "Science", teacherName: "Dr. Han" },
    { periodOrder: 5, startTime: "11:40", endTime: "12:30", subject: "Korean", teacherName: "Ms. Lee" },
    { periodOrder: 6, startTime: "13:20", endTime: "14:10", subject: "PE / Arts", teacherName: "Coach Kim" },
  ];
  const out: SchedulePeriod[] = [];
  let n = 0;
  for (const dayOfWeek of [0, 1, 2, 3, 4]) {
    for (const b of blocks) {
      n += 1;
      out.push({
        id: `sp${n}`,
        childId,
        dayOfWeek,
        ...b,
      });
    }
  }
  out.push(
    { id: "spkg1", childId: "c2", dayOfWeek: 0, periodOrder: 1, startTime: "09:00", endTime: "10:00", subject: "Circle time", teacherName: "Ms. Gurung" },
    { id: "spkg2", childId: "c2", dayOfWeek: 0, periodOrder: 2, startTime: "10:15", endTime: "11:00", subject: "Literacy play", teacherName: "Ms. Gurung" },
    { id: "spkg3", childId: "c2", dayOfWeek: 2, periodOrder: 1, startTime: "09:00", endTime: "10:30", subject: "Outdoor motor", teacherName: "Mr. Lee" },
  );
  return out;
}

function defaultExamSchedule(): ExamScheduleEntry[] {
  return [
    {
      id: "es1",
      childId: "c1",
      title: "Korean listening · Term 2",
      subject: "Korean",
      date: "2026-06-10",
      startTime: "09:00",
      room: "Hall B",
      notes: "Bring ID card",
    },
    {
      id: "es2",
      childId: "c1",
      title: "Mathematics checkpoint",
      subject: "Mathematics",
      date: "2026-06-18",
      startTime: "10:30",
      room: "Room 204",
    },
    {
      id: "es3",
      childId: "c2",
      title: "Prep showcase",
      subject: "Mixed",
      date: "2026-06-22",
      startTime: "11:00",
      room: "KG Atrium",
    },
  ];
}

function defaultTeacherNotes(): TeacherNote[] {
  return [
    {
      id: "tn1",
      childId: "c1",
      subject: "Mathematics",
      teacherName: "Mr. Choi",
      body: "Strong abstract reasoning — encourage competition-style timed drills twice weekly.",
      updatedAt: "2026-05-18T08:00:00.000Z",
    },
    {
      id: "tn2",
      childId: "c1",
      subject: "Korean",
      teacherName: "Ms. Lee",
      body: "Listening ahead of speaking; recommend 10 min daily audio with transcript shadowing.",
      updatedAt: "2026-05-12T11:30:00.000Z",
    },
  ];
}

/** Deep initial snapshot — local-first until API wiring. */
export const initialFamilyModuleState: FamilyModuleState = {
  stabilityScore: 86,
  upcomingBills: [
    { id: "b1", label: "Apartment + utilities", amountNpr: 42000, dueInDays: 2, category: "Housing" },
    { id: "b2", label: "International school term 2", amountNpr: 185000, dueInDays: 9, category: "Education" },
    { id: "b3", label: "Family health premium", amountNpr: 28000, dueInDays: 14, category: "Health" },
  ],
  familyGoals: [
    { id: "g1", title: "Education corpus (2032)", pct: 58, targetNpr: 8_500_000, savedNpr: 4_930_000 },
    { id: "g2", title: "Nepal return buffer", pct: 41, targetNpr: 5_000_000, savedNpr: 2_050_000 },
    { id: "g3", title: "Family emergency fund", pct: 72, targetNpr: 1_200_000, savedNpr: 864_000 },
  ],
  emergencyContacts: [
    { id: "x1", name: "Dr. Min‑Jae Park", relation: "Family physician", phone: "+82‑2‑555‑0142", note: "Sinchon clinic · evenings OK" },
    { id: "x2", name: "Bimal Thapa", relation: "Uncle · Kathmandu", phone: "+977‑98XXXXXXXX" },
    { id: "x3", name: "Building security", relation: "24/7 desk", phone: "+82‑10‑XXXX‑XXXX" },
  ],
  hubInsights: [
    {
      id: "i1",
      title: "Cashflow cushion looks healthy",
      body: "Next 30 days show three predictable outflows. Your NPR buffer can absorb two simultaneous hits without touching the education SIP.",
      tone: "positive",
    },
    {
      id: "i2",
      title: "School fee spike in 9 days",
      body: "Term 2 invoice is ~12% higher YoY. Consider moving KRW sweep two days earlier to avoid weekend FX spread.",
      tone: "watch",
    },
  ],
  children: [
    { id: "c1", name: "Arya", age: 9, school: "Seoul Global School", grade: "G4", mood: "Curious", avatarHue: "from-emerald-400/90 to-teal-500/80" },
    { id: "c2", name: "Rohan", age: 6, school: "Little Himalaya KG", grade: "Prep", mood: "Playful", avatarHue: "from-lime-400/90 to-emerald-500/80" },
  ],
  attendanceWeek: [
    { label: "Mon", pct: 100 },
    { label: "Tue", pct: 100 },
    { label: "Wed", pct: 92 },
    { label: "Thu", pct: 100 },
    { label: "Fri", pct: 88 },
  ],
  exam: { title: "Mid‑year assessments", subject: "Core + Korean language", examDate: "2026-06-15" },
  studyStreakDays: 14,
  activityMinutes: [
    { id: "a1", label: "Outdoor", value: 45, color: "bg-emerald-400/80" },
    { id: "a2", label: "Reading", value: 25, color: "bg-teal-400/80" },
    { id: "a3", label: "Music", value: 20, color: "bg-lime-400/70" },
    { id: "a4", label: "Screens", value: 40, color: "bg-white/15" },
  ],
  sleepQuality: { score: 82, deepHours: 2.1, bedTime: "21:40", wakeTime: "06:55", note: "Stable for 6 nights" },
  homework: [
    {
      id: "h1",
      subject: "Math",
      task: "Fractions worksheet · p. 44–46",
      due: "Tomorrow",
      childId: "c1",
      completed: false,
    },
    {
      id: "h2",
      subject: "Korean",
      task: "Hangul diary (8 sentences)",
      due: "Thu",
      childId: "c1",
      completed: true,
    },
    {
      id: "h3",
      subject: "Science",
      task: "Volcano model materials list",
      due: "Mon",
      childId: "c1",
      completed: false,
    },
  ],
  tuition: { term: "Term 2 · 2026", paidNpr: 185000, totalNpr: 370000, nextInstallment: "2026-07-01" },
  gpa: { current: 3.72, target: 3.85, term: "Spring" },
  subjects: [
    { id: "s1", subject: "Mathematics", pct: 91 },
    { id: "s2", subject: "English", pct: 88 },
    { id: "s3", subject: "Science", pct: 84 },
    { id: "s4", subject: "Korean", pct: 79 },
  ],
  educationFund: { monthlySipNpr: 45000, yearsToUniversity: 9, projectedCorpusNpr: 6_200_000, gapNpr: 1_100_000 },
  medicineReminders: [
    { id: "m1", name: "Vitamin D drops", schedule: "Morning · with breakfast", child: "Rohan" },
    { id: "m2", name: "Antihistamine (seasonal)", schedule: "Evening if AQI > 80", child: "Arya" },
  ],
  insurance: [
    { id: "in1", label: "Family health (international)", renews: "2026-09-12", premiumNpr: 336000 },
    { id: "in2", label: "Travel · APAC", renews: "2026-12-01", premiumNpr: 42000 },
  ],
  vaccinations: [
    { id: "v1", name: "Influenza (2026)", child: "Both", status: "Scheduled · Jun 08" },
    { id: "v2", name: "MMR booster", child: "Rohan", status: "Complete" },
  ],
  emergencyMedical: {
    bloodTypes: "Parents O+ · Children A+",
    allergies: "Rohan · mild shellfish · EpiPen in kitchen pouch",
    insurerCard: "Policy #FN‑88421 · Assistance +82‑1588‑0000",
  },
  calendarEvents: [
    { id: "e1", title: "Science fair setup", date: "2026-05-28", type: "school" },
    { id: "e2", title: "Salary credit (KRW→NPR sweep)", date: "2026-05-29", type: "salary" },
    { id: "e3", title: "Internet + mobile bundle", date: "2026-05-30", type: "bill" },
    { id: "e4", title: "Grandma’s birthday dinner", date: "2026-06-02", type: "birthday" },
    { id: "e5", title: "F‑4 visa renewal window opens", date: "2026-06-10", type: "visa" },
    { id: "e6", title: "Parent‑teacher conference", date: "2026-06-04", type: "school" },
    { id: "e7", title: "Rent + parking", date: "2026-06-01", type: "bill" },
    { id: "e8", title: "Dad’s salary day", date: "2026-06-29", type: "salary" },
  ],
  parentingNotes: [{ id: "n1", title: "Weekend rhythm", body: "Keep Saturday morning unscheduled for deep play." }],
  parentingInsights: [
    {
      id: "p1",
      title: "Screen time drift on Wednesdays",
      body: "After Korean tutoring, evening screen minutes rise ~22%. A 15‑minute outdoor buffer cuts the spike in 4/5 trial weeks.",
      tone: "watch",
    },
    {
      id: "p2",
      title: "Education spend forecast",
      body: "At current FX and fee growth, term 3 may land ~₩210k higher in NPR terms. Locking a forward NPR top‑up this month reduces variance.",
      tone: "neutral",
    },
    {
      id: "p3",
      title: "Positive reinforcement streak",
      body: "Arya’s self‑logged study streak is 14 days — longest this semester. Consider a low‑cost experience reward vs. toys (higher long‑term motivation).",
      tone: "positive",
    },
  ],
  familyAlerts: [
    { id: "fa1", title: "KRW→NPR rate moved +0.8% this week", detail: "Good window for the school fee transfer." },
    { id: "fa2", title: "Discretionary dining up 11% MoM", detail: "Still within family budget envelope." },
  ],
  behaviorInsights: [
    { id: "bi1", child: "Arya", text: "Morning focus peaks 07:10–08:30 — shift hardest subject there." },
    { id: "bi2", child: "Rohan", text: "Tantrum frequency down 35% since consistent bedtime (last 14d)." },
  ],
  smartRecommendations: [
    { id: "r1", text: "Batch visa documents on Jun 02 (lighter school week)." },
    { id: "r2", text: "Schedule dentist after salary day to align cashflow." },
    { id: "r3", text: "Add grandparents as read‑only calendar viewers for school events." },
  ],
  feePaymentHistory: [
    {
      id: "fp1",
      childId: "c1",
      term: "Term 1 · 2025",
      paidAt: "2025-03-02",
      amountNpr: 165_000,
      method: "Wire",
      reference: "REF-9921",
    },
    {
      id: "fp2",
      childId: "c1",
      term: "Term 2 · 2026",
      paidAt: "2026-05-10",
      amountNpr: 185_000,
      method: "KRW sweep",
      reference: "REF-11402",
    },
    { id: "fp3", childId: "c2", term: "KG Spring · 2026", paidAt: "2026-04-18", amountNpr: 72_000, method: "Card" },
  ],
  examResults: [
    {
      id: "er1",
      childId: "c1",
      title: "Mid-year mathematics",
      date: "2026-01-15",
      scorePct: 92,
      gradeLabel: "A",
      subject: "Mathematics",
    },
    {
      id: "er2",
      childId: "c1",
      title: "Korean language checkpoint",
      date: "2026-03-22",
      scorePct: 86,
      gradeLabel: "B+",
      subject: "Korean",
    },
    {
      id: "er3",
      childId: "c2",
      title: "Prep literacy",
      date: "2026-04-05",
      scorePct: null,
      gradeLabel: "Pass",
      subject: "English",
    },
  ],
  gpaHistory: [
    { id: "gh1", date: "2025-09-01", gpa: 3.55, term: "Fall 2025" },
    { id: "gh2", date: "2026-01-20", gpa: 3.68, term: "Winter 2026" },
    { id: "gh3", date: "2026-05-01", gpa: 3.72, term: "Spring 2026" },
  ],
  subjectTrendPoints: [
    { id: "st1", subject: "Mathematics", date: "2025-11-01", pct: 86 },
    { id: "st2", subject: "Mathematics", date: "2026-02-01", pct: 89 },
    { id: "st3", subject: "Mathematics", date: "2026-05-15", pct: 91 },
    { id: "st4", subject: "Korean", date: "2025-11-01", pct: 74 },
    { id: "st5", subject: "Korean", date: "2026-05-15", pct: 79 },
    { id: "st6", subject: "Science", date: "2026-05-15", pct: 84 },
  ],
  vaultDocuments: [],
  vaultTimeline: [
    {
      id: "tl1",
      kind: "fee",
      title: "Term 2 fee posted",
      detail: "Arya · NPR 185,000",
      occurredAt: "2026-05-10T10:00:00.000Z",
      refId: "fp2",
    },
    {
      id: "tl2",
      kind: "exam",
      title: "Korean checkpoint graded",
      detail: "86% · B+",
      occurredAt: "2026-03-22T08:00:00.000Z",
      refId: "er2",
    },
    {
      id: "tl3",
      kind: "gpa",
      title: "GPA snapshot",
      detail: "Spring 2026 · 3.72",
      occurredAt: "2026-05-01T12:00:00.000Z",
      refId: "gh3",
    },
  ],
  documentReminders: [
    {
      id: "dr1",
      title: "Upload spring vaccination PDF",
      dueDate: "2026-06-05",
      childId: "c2",
      note: "Clinic portal export",
    },
    {
      id: "dr2",
      title: "Renew student ID scan",
      dueDate: "2026-06-20",
      childId: "c1",
    },
  ],
  vaultEducationInsights: [
    {
      id: "ve1",
      title: "Mathematics velocity",
      body: "Mathematics trend +5 pts over six months — maintain 3× weekly practice blocks.",
      tone: "positive",
    },
    {
      id: "ve2",
      title: "Korean gap vs target GPA",
      body: "Korean subject trails GPA goal by widest margin — consider short daily drills (10 min) before dinner.",
      tone: "watch",
    },
  ],
  schedulePeriods: defaultSchedulePeriods(),
  examSchedule: defaultExamSchedule(),
  teacherNotes: defaultTeacherNotes(),
};
