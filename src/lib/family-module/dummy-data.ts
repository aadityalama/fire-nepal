/** Demo payloads for the Family Module — replace with API / store later. */

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
export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: "school" | "salary" | "bill" | "birthday" | "visa";
};
export type FamilyGoal = { id: string; title: string; pct: number; targetNpr: number; savedNpr: number };
export type EmergencyContact = { id: string; name: string; relation: string; phone: string; note?: string };
export type AiInsight = { id: string; title: string; body: string; tone: "positive" | "watch" | "neutral" };

export const FAMILY_STABILITY_SCORE = 86;

export const UPCOMING_BILLS: FamilyBill[] = [
  { id: "b1", label: "Apartment + utilities", amountNpr: 42000, dueInDays: 2, category: "Housing" },
  { id: "b2", label: "International school term 2", amountNpr: 185000, dueInDays: 9, category: "Education" },
  { id: "b3", label: "Family health premium", amountNpr: 28000, dueInDays: 14, category: "Health" },
];

export const CHILDREN: ChildSummary[] = [
  { id: "c1", name: "Arya", age: 9, school: "Seoul Global School", grade: "G4", mood: "Curious", avatarHue: "from-emerald-400/90 to-teal-500/80" },
  { id: "c2", name: "Rohan", age: 6, school: "Little Himalaya KG", grade: "Prep", mood: "Playful", avatarHue: "from-lime-400/90 to-emerald-500/80" },
];

export const FAMILY_CALENDAR_PREVIEW: CalendarEvent[] = [
  { id: "e1", title: "Science fair setup", date: "2026-05-28", type: "school" },
  { id: "e2", title: "Salary credit (KRW→NPR sweep)", date: "2026-05-29", type: "salary" },
  { id: "e3", title: "Internet + mobile bundle", date: "2026-05-30", type: "bill" },
  { id: "e4", title: "Grandma’s birthday dinner", date: "2026-06-02", type: "birthday" },
  { id: "e5", title: "F‑4 visa renewal window opens", date: "2026-06-10", type: "visa" },
];

export const FAMILY_GOALS: FamilyGoal[] = [
  { id: "g1", title: "Education corpus (2032)", pct: 58, targetNpr: 8_500_000, savedNpr: 4_930_000 },
  { id: "g2", title: "Nepal return buffer", pct: 41, targetNpr: 5_000_000, savedNpr: 2_050_000 },
  { id: "g3", title: "Family emergency fund", pct: 72, targetNpr: 1_200_000, savedNpr: 864_000 },
];

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { id: "x1", name: "Dr. Min‑Jae Park", relation: "Family physician", phone: "+82‑2‑555‑0142", note: "Sinchon clinic · evenings OK" },
  { id: "x2", name: "Bimal Thapa", relation: "Uncle · Kathmandu", phone: "+977‑98XXXXXXXX" },
  { id: "x3", name: "Building security", relation: "24/7 desk", phone: "+82‑10‑XXXX‑XXXX" },
];

export const HUB_AI_INSIGHTS: AiInsight[] = [
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
];

export const ATTENDANCE_WEEKS = [
  { label: "Mon", pct: 100 },
  { label: "Tue", pct: 100 },
  { label: "Wed", pct: 92 },
  { label: "Thu", pct: 100 },
  { label: "Fri", pct: 88 },
];

export const EXAM_COUNTDOWN = { title: "Mid‑year assessments", daysLeft: 18, subject: "Core + Korean language" };

export const STUDY_STREAK_DAYS = 14;

export const ACTIVITY_MINUTES = [
  { label: "Outdoor", value: 45, color: "bg-emerald-400/80" },
  { label: "Reading", value: 25, color: "bg-teal-400/80" },
  { label: "Music", value: 20, color: "bg-lime-400/70" },
  { label: "Screens", value: 40, color: "bg-white/15" },
];

export const SLEEP_QUALITY = { score: 82, deepHours: 2.1, bedTime: "21:40", wakeTime: "06:55", note: "Stable for 6 nights" };

export const HOMEWORK_ITEMS = [
  { id: "h1", subject: "Math", task: "Fractions worksheet · p. 44–46", due: "Tomorrow" },
  { id: "h2", subject: "Korean", task: "Hangul diary (8 sentences)", due: "Thu" },
  { id: "h3", subject: "Science", task: "Volcano model materials list", due: "Mon" },
];

export const TUITION_TRACKER = {
  term: "Term 2 · 2026",
  paidNpr: 185000,
  totalNpr: 370000,
  nextInstallment: "2026-07-01",
};

export const GPA_PROGRESS = { current: 3.72, target: 3.85, term: "Spring" };

export const SUBJECT_PERFORMANCE = [
  { subject: "Mathematics", pct: 91 },
  { subject: "English", pct: 88 },
  { subject: "Science", pct: 84 },
  { subject: "Korean", pct: 79 },
];

export const EDUCATION_FUND = {
  monthlySipNpr: 45000,
  yearsToUniversity: 9,
  projectedCorpusNpr: 6_200_000,
  gapNpr: 1_100_000,
};

export const MEDICINE_REMINDERS = [
  { id: "m1", name: "Vitamin D drops", schedule: "Morning · with breakfast", child: "Rohan" },
  { id: "m2", name: "Antihistamine (seasonal)", schedule: "Evening if AQI > 80", child: "Arya" },
];

export const INSURANCE_TRACKER = [
  { id: "in1", label: "Family health (international)", renews: "2026-09-12", premiumNpr: 336000 },
  { id: "in2", label: "Travel · APAC", renews: "2026-12-01", premiumNpr: 42000 },
];

export const VACCINATIONS = [
  { id: "v1", name: "Influenza (2026)", child: "Both", status: "Scheduled · Jun 08" },
  { id: "v2", name: "MMR booster", child: "Rohan", status: "Complete" },
];

export const EMERGENCY_MEDICAL = {
  bloodTypes: "Parents O+ · Children A+",
  allergies: "Rohan · mild shellfish · EpiPen in kitchen pouch",
  insurerCard: "Policy #FN‑88421 · Assistance +82‑1588‑0000",
};

export const CALENDAR_EVENTS_FULL: CalendarEvent[] = [
  ...FAMILY_CALENDAR_PREVIEW,
  { id: "e6", title: "Parent‑teacher conference", date: "2026-06-04", type: "school" },
  { id: "e7", title: "Rent + parking", date: "2026-06-01", type: "bill" },
  { id: "e8", title: "Dad’s salary day", date: "2026-06-29", type: "salary" },
];

export const PARENTING_AI_INSIGHTS: AiInsight[] = [
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
];

export const FAMILY_FINANCIAL_ALERTS = [
  { id: "fa1", title: "KRW→NPR rate moved +0.8% this week", detail: "Good window for the school fee transfer." },
  { id: "fa2", title: "Discretionary dining up 11% MoM", detail: "Still within family budget envelope." },
];

export const BEHAVIOR_INSIGHTS = [
  { id: "bi1", child: "Arya", text: "Morning focus peaks 07:10–08:30 — shift hardest subject there." },
  { id: "bi2", child: "Rohan", text: "Tantrum frequency down 35% since consistent bedtime (last 14d)." },
];

export const SMART_RECOMMENDATIONS = [
  "Batch visa documents on Jun 02 (lighter school week).",
  "Schedule dentist after salary day to align cashflow.",
  "Add grandparents as read‑only calendar viewers for school events.",
];
