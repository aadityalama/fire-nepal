"use client";

import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  DollarSign,
  LayoutGrid,
  LineChart as LineChartIcon,
  Pencil,
  Plus,
  Search,
  StickyNote,
  Trash2,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FamilyGlassCard, FamilySectionTitle, familyHeadingClass, familyMutedText } from "@/components/family-module/FamilyUiPrimitives";
import { FamilyBtnGhost, FamilyBtnPrimary } from "@/components/family-module/ui/family-module-buttons";
import { FamilyFieldLabel, FamilyInput, FamilySelect, FamilyTextarea } from "@/components/family-module/ui/FamilyFormFields";
import { FamilyOverlay } from "@/components/family-module/ui/FamilyOverlay";
import { useFamilyModule } from "@/contexts/FamilyModuleContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import type { ExamResult, ExamScheduleEntry, HomeworkItem, SchedulePeriod, SchoolFeePayment, TeacherNote } from "@/lib/family-module/types";
import { mondayFirstDayOfWeek, SCHEDULE_DAY_LABELS, scheduleDayLabel } from "./schedule-dow";

type TabId = "daily" | "weekly" | "homework" | "examCal" | "fees" | "notes" | "scores" | "analytics" | "parents";

function formatNpr(n: number): string {
  return new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(n);
}

function childName(children: { id: string; name: string }[], id: string): string {
  return children.find((c) => c.id === id)?.name ?? "—";
}

function tabButtonClass(light: boolean, active: boolean): string {
  const base =
    "inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-wide transition active:scale-[0.99] sm:text-xs";
  if (light) {
    return active
      ? `${base} border-emerald-400/60 bg-emerald-50 text-emerald-950 shadow-sm`
      : `${base} border-emerald-200/60 bg-white/70 text-slate-600 hover:border-emerald-300`;
  }
  return active
    ? `${base} border-emerald-400/40 bg-emerald-500/15 text-white shadow-[0_0_20px_-8px_rgba(52,211,153,0.35)]`
    : `${base} border-white/10 bg-white/[0.04] text-zinc-400 hover:border-emerald-400/25 hover:text-white`;
}

function toneChip(light: boolean, tone: "positive" | "watch" | "neutral"): string {
  if (tone === "positive")
    return light ? "bg-emerald-100 text-emerald-900" : "bg-emerald-500/20 text-emerald-200";
  if (tone === "watch") return light ? "bg-amber-100 text-amber-950" : "bg-amber-500/15 text-amber-200";
  return light ? "bg-slate-100 text-slate-800" : "bg-white/10 text-zinc-300";
}

export function SchoolScheduleSystem() {
  const { state, dispatch } = useFamilyModule();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const {
    children,
    schedulePeriods,
    examSchedule,
    teacherNotes,
    homework,
    feePaymentHistory,
    examResults,
    gpaHistory,
    subjectTrendPoints,
    gpa,
    subjects,
    tuition,
    vaultEducationInsights,
  } = state;

  const [tab, setTab] = useState<TabId>("daily");
  const [childFilter, setChildFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const [schedModal, setSchedModal] = useState<{ mode: "add" } | { mode: "edit"; row: SchedulePeriod } | null>(null);
  const [examCalModal, setExamCalModal] = useState<{ mode: "add" } | { mode: "edit"; row: ExamScheduleEntry } | null>(null);
  const [noteModal, setNoteModal] = useState<{ mode: "add" } | { mode: "edit"; row: TeacherNote } | null>(null);
  const [feeModal, setFeeModal] = useState<{ mode: "add" } | { mode: "edit"; row: SchoolFeePayment } | null>(null);
  const [scoreModal, setScoreModal] = useState<{ mode: "add" } | { mode: "edit"; row: ExamResult } | null>(null);
  const [gpaSnapOpen, setGpaSnapOpen] = useState(false);
  const [hwModal, setHwModal] = useState<{ mode: "add" } | { mode: "edit"; item: HomeworkItem } | null>(null);

  const periodsFiltered = useMemo(() => {
    let rows = schedulePeriods;
    if (childFilter !== "all") rows = rows.filter((p) => p.childId === childFilter);
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      rows = rows.filter(
        (p) => p.subject.toLowerCase().includes(qq) || p.teacherName.toLowerCase().includes(qq) || p.startTime.includes(qq),
      );
    }
    return rows;
  }, [schedulePeriods, childFilter, q]);

  const todayDow = mondayFirstDayOfWeek();
  const todayPeriods = useMemo(
    () =>
      [...periodsFiltered]
        .filter((p) => p.dayOfWeek === todayDow)
        .sort((a, b) => a.periodOrder - b.periodOrder || a.startTime.localeCompare(b.startTime)),
    [periodsFiltered, todayDow],
  );

  const weeklyByDay = useMemo(() => {
    const map: SchedulePeriod[][] = [[], [], [], [], [], [], []];
    for (const p of periodsFiltered) {
      if (p.dayOfWeek >= 0 && p.dayOfWeek <= 6) {
        map[p.dayOfWeek]!.push(p);
      }
    }
    for (let d = 0; d < 7; d++) {
      map[d]!.sort((a, b) => a.periodOrder - b.periodOrder || a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [periodsFiltered]);

  const homeworkFiltered = useMemo(() => {
    let rows = homework;
    if (childFilter !== "all") rows = rows.filter((h) => h.childId === childFilter || !h.childId);
    return rows;
  }, [homework, childFilter]);

  const hwDoneRatio = useMemo(() => {
    if (homeworkFiltered.length === 0) return 0;
    const done = homeworkFiltered.filter((h) => h.completed).length;
    return Math.round((done / homeworkFiltered.length) * 100);
  }, [homeworkFiltered]);

  const examCalFiltered = useMemo(() => {
    let rows = [...examSchedule].sort((a, b) => a.date.localeCompare(b.date));
    if (childFilter !== "all") rows = rows.filter((e) => e.childId === childFilter);
    return rows;
  }, [examSchedule, childFilter]);

  const feesFiltered = useMemo(() => {
    let rows = [...feePaymentHistory].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
    if (childFilter !== "all") rows = rows.filter((f) => f.childId === childFilter);
    return rows;
  }, [feePaymentHistory, childFilter]);

  const notesFiltered = useMemo(() => {
    let rows = [...teacherNotes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (childFilter !== "all") rows = rows.filter((n) => n.childId === childFilter);
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      rows = rows.filter(
        (n) => n.subject.toLowerCase().includes(qq) || n.teacherName.toLowerCase().includes(qq) || n.body.toLowerCase().includes(qq),
      );
    }
    return rows;
  }, [teacherNotes, childFilter, q]);

  const scoresFiltered = useMemo(() => {
    let rows = [...examResults].sort((a, b) => b.date.localeCompare(a.date));
    if (childFilter !== "all") rows = rows.filter((r) => r.childId === childFilter);
    return rows;
  }, [examResults, childFilter]);

  const gpaChart = useMemo(
    () => [...gpaHistory].sort((a, b) => a.date.localeCompare(b.date)).map((g) => ({ label: g.date.slice(0, 7), gpa: g.gpa, term: g.term })),
    [gpaHistory],
  );

  const subjectBars = useMemo(
    () => subjects.map((s) => ({ name: s.subject.length > 14 ? `${s.subject.slice(0, 12)}…` : s.subject, pct: s.pct })),
    [subjects],
  );

  const subjectTrendChart = useMemo(() => {
    const subjs = [...new Set(subjectTrendPoints.map((s) => s.subject))];
    const dates = [...new Set(subjectTrendPoints.map((s) => s.date))].sort();
    return dates.map((date) => {
      const row: Record<string, string | number> = { date: date.slice(5) };
      for (const sub of subjs) {
        const hit = subjectTrendPoints.find((p) => p.date === date && p.subject === sub);
        if (hit) row[sub] = hit.pct;
      }
      return row;
    });
  }, [subjectTrendPoints]);
  const subjectKeys = useMemo(() => [...new Set(subjectTrendPoints.map((s) => s.subject))], [subjectTrendPoints]);
  const palette = ["#34d399", "#2dd4bf", "#a3e635", "#38bdf8", "#f472b6", "#fbbf24"];

  const upcomingExams = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return examCalFiltered.filter((e) => e.date >= today).slice(0, 4);
  }, [examCalFiltered]);

  const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
    { id: "daily", label: "Daily", icon: <Calendar size={14} /> },
    { id: "weekly", label: "Weekly", icon: <LayoutGrid size={14} /> },
    { id: "homework", label: "Homework", icon: <BookOpen size={14} /> },
    { id: "examCal", label: "Exam schedule", icon: <Calendar size={14} /> },
    { id: "fees", label: "Fee history", icon: <DollarSign size={14} /> },
    { id: "notes", label: "Teacher notes", icon: <StickyNote size={14} /> },
    { id: "scores", label: "Exam scores", icon: <Award size={14} /> },
    { id: "analytics", label: "Analytics", icon: <LineChartIcon size={14} /> },
    { id: "parents", label: "Parents", icon: <Users size={14} /> },
  ];

  if (children.length === 0) {
    return (
      <FamilyGlassCard light={light} padding="lg" className="mb-6 sm:mb-8">
        <FamilySectionTitle
          light={light}
          eyebrow="School schedule"
          title="Add a child to use the schedule system"
          subtitle="Children profiles power timetables, homework, and parent summaries."
        />
      </FamilyGlassCard>
    );
  }

  return (
    <div className="mb-8 space-y-4 sm:mb-10 sm:space-y-5">
      <FamilyGlassCard light={light} padding="lg">
        <FamilySectionTitle
          light={light}
          eyebrow="School schedule system"
          title="Class timetable, homework, exams & analytics"
          subtitle="Premium glass workspace — all data stays in this browser session until you connect an API."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <FamilySelect light={light} value={childFilter} onChange={(e) => setChildFilter(e.target.value)} className="min-w-[9rem] text-xs">
                <option value="all">All children</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </FamilySelect>
            </div>
          }
        />

        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/5 pb-4 sm:gap-2.5">
          {tabs.map((t) => (
            <button key={t.id} type="button" className={tabButtonClass(light, tab === t.id)} onClick={() => setTab(t.id)}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {(tab === "daily" || tab === "weekly" || tab === "notes") && (
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className={`relative flex-1 ${light ? "text-slate-500" : "text-zinc-500"}`}>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70" aria-hidden />
              <FamilyInput
                light={light}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={tab === "notes" ? "Search notes…" : "Filter subject or teacher…"}
                className="pl-9"
              />
            </div>
          </div>
        )}

        {tab === "daily" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={`text-sm font-bold ${familyHeadingClass(light)}`}>
                Today · {scheduleDayLabel(todayDow)} · {new Date().toLocaleDateString(undefined, { dateStyle: "medium" })}
              </p>
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setSchedModal({ mode: "add" })}>
                <Plus size={14} /> Add period
              </FamilyBtnPrimary>
            </div>
            {todayPeriods.length === 0 ? (
              <p className={`text-sm ${familyMutedText(light)}`}>No periods for today — switch child filter or add schedule rows.</p>
            ) : (
              <ul className="space-y-2">
                {todayPeriods.map((p) => (
                  <li
                    key={p.id}
                    className={`flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                      light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-[10px] font-black uppercase tracking-wide ${light ? "text-emerald-800" : "text-emerald-300/90"}`}>
                        P{p.periodOrder} · {p.startTime}–{p.endTime} · {childName(children, p.childId)}
                      </p>
                      <p className={`font-bold ${familyHeadingClass(light)}`}>{p.subject}</p>
                      <p className={`text-xs ${familyMutedText(light)}`}>{p.teacherName}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => setSchedModal({ mode: "edit", row: p })}>
                        <Pencil size={14} /> Edit
                      </FamilyBtnGhost>
                      <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => dispatch({ type: "DELETE_SCHEDULE_PERIOD", id: p.id })}>
                        <Trash2 size={14} /> Delete
                      </FamilyBtnGhost>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "weekly" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setSchedModal({ mode: "add" })}>
                <Plus size={14} /> Add period
              </FamilyBtnPrimary>
            </div>
            <div className="overflow-x-auto pb-2">
              <div className="grid min-w-[720px] grid-cols-7 gap-2">
                {SCHEDULE_DAY_LABELS.map((label, d) => (
                  <div key={label} className="space-y-2">
                    <p
                      className={`text-center text-[10px] font-black uppercase tracking-wide ${
                        d === todayDow ? (light ? "text-emerald-700" : "text-emerald-300") : familyMutedText(light)
                      }`}
                    >
                      {label}
                    </p>
                    {(weeklyByDay[d] ?? []).map((p) => (
                      <div
                        key={p.id}
                        className={`rounded-xl border p-2.5 text-xs ${
                          light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"
                        }`}
                      >
                        <p className={`font-black tabular-nums ${light ? "text-emerald-800" : "text-emerald-300"}`}>
                          {p.startTime}–{p.endTime}
                        </p>
                        <p className={`mt-1 font-bold leading-tight ${familyHeadingClass(light)}`}>{p.subject}</p>
                        <p className={`mt-0.5 text-[10px] ${familyMutedText(light)}`}>{p.teacherName}</p>
                        <p className={`mt-1 text-[9px] font-bold uppercase ${familyMutedText(light)}`}>{childName(children, p.childId)}</p>
                        <div className="mt-2 flex gap-1">
                          <FamilyBtnGhost light={light} className="h-7 flex-1 px-1 text-[10px]" onClick={() => setSchedModal({ mode: "edit", row: p })}>
                            Edit
                          </FamilyBtnGhost>
                          <FamilyBtnGhost
                            light={light}
                            className="h-7 flex-1 px-1 text-[10px]"
                            onClick={() => dispatch({ type: "DELETE_SCHEDULE_PERIOD", id: p.id })}
                          >
                            Del
                          </FamilyBtnGhost>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "homework" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setHwModal({ mode: "add" })}>
                <Plus size={14} /> Add homework
              </FamilyBtnPrimary>
            </div>
            <p className={`text-xs font-bold ${familyMutedText(light)}`}>Completion · {hwDoneRatio}% done this view</p>
            <ul className="space-y-2">
              {homeworkFiltered.map((h) => (
                <li
                  key={h.id}
                  className={`flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                    light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    onClick={() => dispatch({ type: "UPDATE_HOMEWORK", id: h.id, patch: { completed: !h.completed } })}
                    aria-pressed={!!h.completed}
                  >
                    {h.completed ? (
                      <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${light ? "text-emerald-600" : "text-emerald-400"}`} />
                    ) : (
                      <Circle className={`mt-0.5 h-5 w-5 shrink-0 ${familyMutedText(light)}`} />
                    )}
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-wide ${light ? "text-emerald-800" : "text-emerald-300/90"}`}>
                        {h.subject}
                        {h.childId ? ` · ${childName(children, h.childId)}` : ""}
                      </p>
                      <p className={`font-bold ${h.completed ? "line-through opacity-60" : ""} ${familyHeadingClass(light)}`}>{h.task}</p>
                      <span className={`text-xs font-black ${familyMutedText(light)}`}>Due {h.due}</span>
                    </div>
                  </button>
                  <div className="flex shrink-0 gap-2">
                    <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => setHwModal({ mode: "edit", item: h })}>
                      <Pencil size={14} /> Edit
                    </FamilyBtnGhost>
                    <FamilyBtnGhost
                      light={light}
                      className="h-9 px-2 text-[11px]"
                      onClick={() => dispatch({ type: "UPDATE_HOMEWORK", id: h.id, patch: { completed: !h.completed } })}
                    >
                      Toggle
                    </FamilyBtnGhost>
                    <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => dispatch({ type: "DELETE_HOMEWORK", id: h.id })}>
                      <Trash2 size={14} />
                    </FamilyBtnGhost>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "examCal" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setExamCalModal({ mode: "add" })}>
                <Plus size={14} /> Add exam
              </FamilyBtnPrimary>
            </div>
            <ul className="space-y-2">
              {examCalFiltered.map((e) => (
                <li
                  key={e.id}
                  className={`flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                    light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <div>
                    <p className={`text-[10px] font-black uppercase ${light ? "text-emerald-800" : "text-emerald-300"}`}>
                      {e.date}
                      {e.startTime ? ` · ${e.startTime}` : ""} · {childName(children, e.childId)}
                    </p>
                    <p className={`font-bold ${familyHeadingClass(light)}`}>{e.title}</p>
                    <p className={`text-sm ${familyMutedText(light)}`}>
                      {e.subject}
                      {e.room ? ` · ${e.room}` : ""}
                    </p>
                    {e.notes ? <p className={`mt-1 text-xs ${familyMutedText(light)}`}>{e.notes}</p> : null}
                  </div>
                  <div className="flex gap-2">
                    <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => setExamCalModal({ mode: "edit", row: e })}>
                      <Pencil size={14} /> Edit
                    </FamilyBtnGhost>
                    <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => dispatch({ type: "DELETE_EXAM_SCHEDULE", id: e.id })}>
                      <Trash2 size={14} />
                    </FamilyBtnGhost>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "fees" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setFeeModal({ mode: "add" })}>
                <Plus size={14} /> Add payment
              </FamilyBtnPrimary>
            </div>
            <ul className="space-y-2">
              {feesFiltered.map((f) => (
                <li
                  key={f.id}
                  className={`flex flex-col gap-1 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                    light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <div>
                    <p className={`font-bold ${familyHeadingClass(light)}`}>{f.term}</p>
                    <p className={`text-sm ${familyMutedText(light)}`}>
                      {childName(children, f.childId)} · {f.paidAt} · NPR {formatNpr(f.amountNpr)} · {f.method}
                    </p>
                    {f.reference ? <p className={`text-xs ${familyMutedText(light)}`}>Ref {f.reference}</p> : null}
                  </div>
                  <div className="flex gap-2">
                    <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => setFeeModal({ mode: "edit", row: f })}>
                      <Pencil size={14} />
                    </FamilyBtnGhost>
                    <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => dispatch({ type: "DELETE_FEE_PAYMENT", id: f.id })}>
                      <Trash2 size={14} />
                    </FamilyBtnGhost>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "notes" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setNoteModal({ mode: "add" })}>
                <Plus size={14} /> Add note
              </FamilyBtnPrimary>
            </div>
            <ul className="space-y-2">
              {notesFiltered.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-xl border px-4 py-3 ${light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"}`}
                >
                  <p className={`text-[10px] font-black uppercase ${light ? "text-emerald-800" : "text-emerald-300"}`}>
                    {n.subject} · {n.teacherName} · {childName(children, n.childId)}
                  </p>
                  <p className={`mt-1 text-sm ${familyHeadingClass(light)}`}>{n.body}</p>
                  <p className={`mt-2 text-[10px] font-bold ${familyMutedText(light)}`}>Updated {new Date(n.updatedAt).toLocaleString()}</p>
                  <div className="mt-2 flex gap-2">
                    <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => setNoteModal({ mode: "edit", row: n })}>
                      <Pencil size={14} /> Edit
                    </FamilyBtnGhost>
                    <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => dispatch({ type: "DELETE_TEACHER_NOTE", id: n.id })}>
                      <Trash2 size={14} /> Delete
                    </FamilyBtnGhost>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "scores" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setScoreModal({ mode: "add" })}>
                <Plus size={14} /> Add score
              </FamilyBtnPrimary>
            </div>
            <ul className="space-y-2">
              {scoresFiltered.map((r) => (
                <li
                  key={r.id}
                  className={`flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                    light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <div>
                    <p className={`text-[10px] font-black uppercase ${light ? "text-emerald-800" : "text-emerald-300"}`}>
                      {r.date} · {childName(children, r.childId)}
                    </p>
                    <p className={`font-bold ${familyHeadingClass(light)}`}>{r.title}</p>
                    <p className={`text-sm ${familyMutedText(light)}`}>
                      {r.subject} · {r.scorePct != null ? `${r.scorePct}%` : "—"} · Grade {r.gradeLabel}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => setScoreModal({ mode: "edit", row: r })}>
                      <Pencil size={14} />
                    </FamilyBtnGhost>
                    <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => dispatch({ type: "DELETE_EXAM_RESULT", id: r.id })}>
                      <Trash2 size={14} />
                    </FamilyBtnGhost>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "analytics" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={`text-sm font-bold ${familyHeadingClass(light)}`}>GPA trajectory & subject signals</p>
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setGpaSnapOpen(true)}>
                <Plus size={14} /> Log GPA snapshot
              </FamilyBtnPrimary>
            </div>
            <div className={`h-56 rounded-xl border p-2 ${light ? "border-emerald-100 bg-white/80" : "border-white/10 bg-black/20"}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gpaChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={light ? "#d1fae5" : "#1f2937"} />
                  <XAxis dataKey="label" tick={{ fill: light ? "#475569" : "#94a3b8", fontSize: 11 }} />
                  <YAxis domain={[0, 4]} tick={{ fill: light ? "#475569" : "#94a3b8", fontSize: 11 }} width={28} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: light ? "1px solid #a7f3d0" : "1px solid rgba(255,255,255,0.12)",
                      background: light ? "#fff" : "#0f172a",
                    }}
                  />
                  <Line type="monotone" dataKey="gpa" name="GPA" stroke="#34d399" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <p className={`mb-2 text-sm font-bold ${familyHeadingClass(light)}`}>Subject performance (current)</p>
              <div className={`h-52 rounded-xl border p-2 ${light ? "border-emerald-100 bg-white/80" : "border-white/10 bg-black/20"}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectBars} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={light ? "#d1fae5" : "#1f2937"} />
                    <XAxis dataKey="name" tick={{ fill: light ? "#475569" : "#94a3b8", fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={56} />
                    <YAxis domain={[0, 100]} tick={{ fill: light ? "#475569" : "#94a3b8", fontSize: 11 }} width={28} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: light ? "1px solid #a7f3d0" : "1px solid rgba(255,255,255,0.12)",
                        background: light ? "#fff" : "#0f172a",
                      }}
                    />
                    <Bar dataKey="pct" name="%" fill="#2dd4bf" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {subjectKeys.length > 0 ? (
              <div>
                <p className={`mb-2 text-sm font-bold ${familyHeadingClass(light)}`}>Subject trend points</p>
                <div className={`h-56 rounded-xl border p-2 ${light ? "border-emerald-100 bg-white/80" : "border-white/10 bg-black/20"}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={subjectTrendChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={light ? "#d1fae5" : "#1f2937"} />
                      <XAxis dataKey="date" tick={{ fill: light ? "#475569" : "#94a3b8", fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: light ? "#475569" : "#94a3b8", fontSize: 11 }} width={28} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: light ? "1px solid #a7f3d0" : "1px solid rgba(255,255,255,0.12)",
                          background: light ? "#fff" : "#0f172a",
                        }}
                      />
                      <Legend />
                      {subjectKeys.map((k, i) => (
                        <Line key={k} type="monotone" dataKey={k} stroke={palette[i % palette.length]} strokeWidth={2} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}

            <div>
              <p className={`mb-2 text-sm font-bold ${familyHeadingClass(light)}`}>Education insights</p>
              <ul className="space-y-2">
                {vaultEducationInsights.map((ins) => (
                  <li
                    key={ins.id}
                    className={`rounded-xl border px-4 py-3 ${light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"}`}
                  >
                    <span className={`inline-block rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${toneChip(light, ins.tone)}`}>{ins.tone}</span>
                    <p className={`mt-2 font-bold ${familyHeadingClass(light)}`}>{ins.title}</p>
                    <p className={`mt-1 text-sm ${familyMutedText(light)}`}>{ins.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === "parents" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={`rounded-2xl border p-4 ${light ? "border-emerald-200/80 bg-emerald-50/60" : "border-emerald-400/20 bg-emerald-500/[0.08]"}`}>
              <p className={`text-[10px] font-black uppercase tracking-wide ${familyMutedText(light)}`}>At a glance</p>
              <p className={`mt-2 text-3xl font-black tabular-nums ${familyHeadingClass(light)}`}>{gpa.current.toFixed(2)}</p>
              <p className={`text-xs font-bold ${familyMutedText(light)}`}>Current GPA · goal {gpa.target.toFixed(2)}</p>
              <p className={`mt-4 text-sm ${familyMutedText(light)}`}>
                Tuition term progress · {tuition.totalNpr > 0 ? Math.round((tuition.paidNpr / tuition.totalNpr) * 100) : 0}% paid
              </p>
              <p className={`mt-2 text-sm ${familyMutedText(light)}`}>Homework done (filtered) · {hwDoneRatio}%</p>
            </div>
            <div className={`rounded-2xl border p-4 ${light ? "border-white/80 bg-white/90" : "border-white/10 bg-white/[0.04]"}`}>
              <p className={`text-[10px] font-black uppercase tracking-wide ${familyMutedText(light)}`}>Upcoming exams</p>
              <ul className="mt-3 space-y-2">
                {upcomingExams.length === 0 ? (
                  <li className={`text-sm ${familyMutedText(light)}`}>No upcoming exams in this filter.</li>
                ) : (
                  upcomingExams.map((e) => (
                    <li key={e.id} className={`text-sm ${familyHeadingClass(light)}`}>
                      <span className="font-black">{e.date}</span> · {e.title} · {childName(children, e.childId)}
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className={`sm:col-span-2 rounded-2xl border p-4 ${light ? "border-slate-200/90 bg-slate-50/80" : "border-white/10 bg-black/25"}`}>
              <p className={`text-[10px] font-black uppercase tracking-wide ${familyMutedText(light)}`}>Parent visibility</p>
              <p className={`mt-2 text-sm leading-relaxed ${familyMutedText(light)}`}>
                This dashboard summarizes schedule load, homework completion, graded scores, and fee history from the same Family OS state used on
                Education and Records Vault. Data is demo-local in the browser until you wire authentication and a backend.
              </p>
            </div>
          </div>
        )}
      </FamilyGlassCard>

      {schedModal ? (
        <SchedulePeriodOverlay light={light} modal={schedModal} childrenList={children} onClose={() => setSchedModal(null)} dispatch={dispatch} />
      ) : null}
      {examCalModal ? (
        <ExamScheduleOverlay light={light} modal={examCalModal} childrenList={children} onClose={() => setExamCalModal(null)} dispatch={dispatch} />
      ) : null}
      {noteModal ? (
        <TeacherNoteOverlay light={light} modal={noteModal} childrenList={children} onClose={() => setNoteModal(null)} dispatch={dispatch} />
      ) : null}
      {feeModal ? <FeePaymentOverlay light={light} modal={feeModal} childrenList={children} onClose={() => setFeeModal(null)} dispatch={dispatch} /> : null}
      {scoreModal ? <ExamScoreOverlay light={light} modal={scoreModal} childrenList={children} onClose={() => setScoreModal(null)} dispatch={dispatch} /> : null}
      {gpaSnapOpen ? <GpaSnapshotOverlay light={light} onClose={() => setGpaSnapOpen(false)} dispatch={dispatch} /> : null}
      {hwModal ? (
        <HomeworkFormOverlay light={light} modal={hwModal} childrenList={children} childFilter={childFilter} onClose={() => setHwModal(null)} dispatch={dispatch} />
      ) : null}
    </div>
  );
}

function SchedulePeriodOverlay({
  light,
  modal,
  childrenList,
  onClose,
  dispatch,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; row: SchedulePeriod };
  childrenList: { id: string; name: string }[];
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const row = modal.mode === "edit" ? modal.row : null;
  const [childId, setChildId] = useState(row?.childId ?? childrenList[0]?.id ?? "");
  const [dayOfWeek, setDayOfWeek] = useState(String(row?.dayOfWeek ?? 0));
  const [periodOrder, setPeriodOrder] = useState(String(row?.periodOrder ?? 1));
  const [startTime, setStartTime] = useState(row?.startTime ?? "08:40");
  const [endTime, setEndTime] = useState(row?.endTime ?? "09:30");
  const [subject, setSubject] = useState(row?.subject ?? "");
  const [teacherName, setTeacherName] = useState(row?.teacherName ?? "");
  const save = () => {
    if (!childId || !subject.trim() || !teacherName.trim()) return;
    const d = Math.max(0, Math.min(6, Number(dayOfWeek) || 0));
    const po = Math.max(1, Math.floor(Number(periodOrder) || 1));
    if (modal.mode === "add") {
      dispatch({
        type: "ADD_SCHEDULE_PERIOD",
        row: { childId, dayOfWeek: d, periodOrder: po, startTime, endTime, subject: subject.trim(), teacherName: teacherName.trim() },
      });
    } else {
      dispatch({
        type: "UPDATE_SCHEDULE_PERIOD",
        id: modal.row.id,
        patch: { childId, dayOfWeek: d, periodOrder: po, startTime, endTime, subject: subject.trim(), teacherName: teacherName.trim() },
      });
    }
    onClose();
  };
  return (
    <FamilyOverlay
      open
      onClose={onClose}
      title={modal.mode === "add" ? "Add class period" : "Edit class period"}
      light={light}
      footer={
        <div className="flex justify-end gap-2">
          <FamilyBtnGhost light={light} onClick={onClose}>
            Cancel
          </FamilyBtnGhost>
          <FamilyBtnPrimary light={light} onClick={save}>
            Save
          </FamilyBtnPrimary>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FamilyFieldLabel light>Child</FamilyFieldLabel>
          <FamilySelect light={light} value={childId} onChange={(e) => setChildId(e.target.value)}>
            {childrenList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FamilySelect>
        </div>
        <div>
          <FamilyFieldLabel light>Day (0=Mon … 6=Sun)</FamilyFieldLabel>
          <FamilySelect light={light} value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
            {SCHEDULE_DAY_LABELS.map((label, i) => (
              <option key={label} value={String(i)}>
                {label}
              </option>
            ))}
          </FamilySelect>
        </div>
        <div>
          <FamilyFieldLabel light>Period #</FamilyFieldLabel>
          <FamilyInput light={light} inputMode="numeric" value={periodOrder} onChange={(e) => setPeriodOrder(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Start</FamilyFieldLabel>
          <FamilyInput light={light} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>End</FamilyFieldLabel>
          <FamilyInput light={light} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <FamilyFieldLabel light>Subject</FamilyFieldLabel>
          <FamilyInput light={light} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <FamilyFieldLabel light>Teacher</FamilyFieldLabel>
          <FamilyInput light={light} value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
        </div>
      </div>
    </FamilyOverlay>
  );
}

function ExamScheduleOverlay({
  light,
  modal,
  childrenList,
  onClose,
  dispatch,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; row: ExamScheduleEntry };
  childrenList: { id: string; name: string }[];
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const row = modal.mode === "edit" ? modal.row : null;
  const [childId, setChildId] = useState(row?.childId ?? childrenList[0]?.id ?? "");
  const [title, setTitle] = useState(row?.title ?? "");
  const [subject, setSubject] = useState(row?.subject ?? "");
  const [date, setDate] = useState(row?.date ?? new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(row?.startTime ?? "");
  const [room, setRoom] = useState(row?.room ?? "");
  const [notes, setNotes] = useState(row?.notes ?? "");
  const save = () => {
    if (!childId || !title.trim() || !subject.trim()) return;
    const payload = {
      childId,
      title: title.trim(),
      subject: subject.trim(),
      date,
      startTime: startTime.trim() || undefined,
      room: room.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (modal.mode === "add") dispatch({ type: "ADD_EXAM_SCHEDULE", row: payload });
    else dispatch({ type: "UPDATE_EXAM_SCHEDULE", id: modal.row.id, patch: payload });
    onClose();
  };
  return (
    <FamilyOverlay
      open
      onClose={onClose}
      title={modal.mode === "add" ? "Add exam (schedule)" : "Edit exam"}
      light={light}
      footer={
        <div className="flex justify-end gap-2">
          <FamilyBtnGhost light={light} onClick={onClose}>
            Cancel
          </FamilyBtnGhost>
          <FamilyBtnPrimary light={light} onClick={save}>
            Save
          </FamilyBtnPrimary>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FamilyFieldLabel light>Child</FamilyFieldLabel>
          <FamilySelect light={light} value={childId} onChange={(e) => setChildId(e.target.value)}>
            {childrenList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FamilySelect>
        </div>
        <div className="sm:col-span-2">
          <FamilyFieldLabel light>Title</FamilyFieldLabel>
          <FamilyInput light={light} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Subject</FamilyFieldLabel>
          <FamilyInput light={light} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Date</FamilyFieldLabel>
          <FamilyInput light={light} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Start time (optional)</FamilyFieldLabel>
          <FamilyInput light={light} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Room</FamilyFieldLabel>
          <FamilyInput light={light} value={room} onChange={(e) => setRoom(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <FamilyFieldLabel light>Notes</FamilyFieldLabel>
          <FamilyTextarea light={light} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </FamilyOverlay>
  );
}

function TeacherNoteOverlay({
  light,
  modal,
  childrenList,
  onClose,
  dispatch,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; row: TeacherNote };
  childrenList: { id: string; name: string }[];
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const row = modal.mode === "edit" ? modal.row : null;
  const [childId, setChildId] = useState(row?.childId ?? childrenList[0]?.id ?? "");
  const [subject, setSubject] = useState(row?.subject ?? "");
  const [teacherName, setTeacherName] = useState(row?.teacherName ?? "");
  const [body, setBody] = useState(row?.body ?? "");
  const save = () => {
    if (!childId || !subject.trim() || !teacherName.trim() || !body.trim()) return;
    const updatedAt = new Date().toISOString();
    if (modal.mode === "add") {
      dispatch({
        type: "ADD_TEACHER_NOTE",
        row: { childId, subject: subject.trim(), teacherName: teacherName.trim(), body: body.trim(), updatedAt },
      });
    } else {
      dispatch({
        type: "UPDATE_TEACHER_NOTE",
        id: modal.row.id,
        patch: { childId, subject: subject.trim(), teacherName: teacherName.trim(), body: body.trim(), updatedAt },
      });
    }
    onClose();
  };
  return (
    <FamilyOverlay
      open
      onClose={onClose}
      title={modal.mode === "add" ? "Teacher note" : "Edit teacher note"}
      light={light}
      footer={
        <div className="flex justify-end gap-2">
          <FamilyBtnGhost light={light} onClick={onClose}>
            Cancel
          </FamilyBtnGhost>
          <FamilyBtnPrimary light={light} onClick={save}>
            Save
          </FamilyBtnPrimary>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <FamilyFieldLabel light>Child</FamilyFieldLabel>
          <FamilySelect light={light} value={childId} onChange={(e) => setChildId(e.target.value)}>
            {childrenList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FamilySelect>
        </div>
        <div>
          <FamilyFieldLabel light>Subject</FamilyFieldLabel>
          <FamilyInput light={light} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Teacher</FamilyFieldLabel>
          <FamilyInput light={light} value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Note</FamilyFieldLabel>
          <FamilyTextarea light={light} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
      </div>
    </FamilyOverlay>
  );
}

function FeePaymentOverlay({
  light,
  modal,
  childrenList,
  onClose,
  dispatch,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; row: SchoolFeePayment };
  childrenList: { id: string; name: string }[];
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const row = modal.mode === "edit" ? modal.row : null;
  const [childId, setChildId] = useState(row?.childId ?? childrenList[0]?.id ?? "");
  const [term, setTerm] = useState(row?.term ?? "");
  const [paidAt, setPaidAt] = useState(row?.paidAt ?? new Date().toISOString().slice(0, 10));
  const [amountNpr, setAmountNpr] = useState(String(row?.amountNpr ?? 0));
  const [method, setMethod] = useState(row?.method ?? "Wire");
  const [reference, setReference] = useState(row?.reference ?? "");
  const save = () => {
    if (!childId || !term.trim()) return;
    const amt = Math.max(0, Number(amountNpr) || 0);
    const payload = {
      childId,
      term: term.trim(),
      paidAt,
      amountNpr: amt,
      method: method.trim() || "—",
      reference: reference.trim() || undefined,
    };
    if (modal.mode === "add") dispatch({ type: "ADD_FEE_PAYMENT", row: payload });
    else dispatch({ type: "UPDATE_FEE_PAYMENT", id: modal.row.id, patch: payload });
    onClose();
  };
  return (
    <FamilyOverlay
      open
      onClose={onClose}
      title={modal.mode === "add" ? "School fee payment" : "Edit fee payment"}
      light={light}
      footer={
        <div className="flex justify-end gap-2">
          <FamilyBtnGhost light={light} onClick={onClose}>
            Cancel
          </FamilyBtnGhost>
          <FamilyBtnPrimary light={light} onClick={save}>
            Save
          </FamilyBtnPrimary>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <FamilyFieldLabel light>Child</FamilyFieldLabel>
          <FamilySelect light={light} value={childId} onChange={(e) => setChildId(e.target.value)}>
            {childrenList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FamilySelect>
        </div>
        <div>
          <FamilyFieldLabel light>Term label</FamilyFieldLabel>
          <FamilyInput light={light} value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Paid date</FamilyFieldLabel>
          <FamilyInput light={light} type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Amount (NPR)</FamilyFieldLabel>
          <FamilyInput light={light} inputMode="numeric" value={amountNpr} onChange={(e) => setAmountNpr(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Method</FamilyFieldLabel>
          <FamilyInput light={light} value={method} onChange={(e) => setMethod(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Reference (optional)</FamilyFieldLabel>
          <FamilyInput light={light} value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
      </div>
    </FamilyOverlay>
  );
}

function ExamScoreOverlay({
  light,
  modal,
  childrenList,
  onClose,
  dispatch,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; row: ExamResult };
  childrenList: { id: string; name: string }[];
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const row = modal.mode === "edit" ? modal.row : null;
  const [childId, setChildId] = useState(row?.childId ?? childrenList[0]?.id ?? "");
  const [title, setTitle] = useState(row?.title ?? "");
  const [subject, setSubject] = useState(row?.subject ?? "");
  const [date, setDate] = useState(row?.date ?? new Date().toISOString().slice(0, 10));
  const [scorePct, setScorePct] = useState(row?.scorePct != null ? String(row.scorePct) : "");
  const [gradeLabel, setGradeLabel] = useState(row?.gradeLabel ?? "");
  const save = () => {
    if (!childId || !title.trim() || !subject.trim() || !gradeLabel.trim()) return;
    const pct = scorePct.trim() === "" ? null : Math.min(100, Math.max(0, Number(scorePct) || 0));
    const payload = {
      childId,
      title: title.trim(),
      subject: subject.trim(),
      date,
      scorePct: pct,
      gradeLabel: gradeLabel.trim(),
    };
    if (modal.mode === "add") dispatch({ type: "ADD_EXAM_RESULT", row: payload });
    else dispatch({ type: "UPDATE_EXAM_RESULT", id: modal.row.id, patch: payload });
    onClose();
  };
  return (
    <FamilyOverlay
      open
      onClose={onClose}
      title={modal.mode === "add" ? "Add exam result" : "Edit exam result"}
      light={light}
      footer={
        <div className="flex justify-end gap-2">
          <FamilyBtnGhost light={light} onClick={onClose}>
            Cancel
          </FamilyBtnGhost>
          <FamilyBtnPrimary light={light} onClick={save}>
            Save
          </FamilyBtnPrimary>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <FamilyFieldLabel light>Child</FamilyFieldLabel>
          <FamilySelect light={light} value={childId} onChange={(e) => setChildId(e.target.value)}>
            {childrenList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FamilySelect>
        </div>
        <div>
          <FamilyFieldLabel light>Assessment title</FamilyFieldLabel>
          <FamilyInput light={light} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Subject</FamilyFieldLabel>
          <FamilyInput light={light} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Date</FamilyFieldLabel>
          <FamilyInput light={light} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Score % (optional)</FamilyFieldLabel>
          <FamilyInput light={light} inputMode="numeric" value={scorePct} onChange={(e) => setScorePct(e.target.value)} placeholder="Leave blank if N/A" />
        </div>
        <div>
          <FamilyFieldLabel light>Grade label</FamilyFieldLabel>
          <FamilyInput light={light} value={gradeLabel} onChange={(e) => setGradeLabel(e.target.value)} placeholder="A, B+, Pass…" />
        </div>
      </div>
    </FamilyOverlay>
  );
}

function GpaSnapshotOverlay({
  light,
  onClose,
  dispatch,
}: {
  light: boolean;
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [gpaVal, setGpaVal] = useState("3.7");
  const [term, setTerm] = useState("Spring 2026");
  const save = () => {
    const g = Math.min(4, Math.max(0, Number(gpaVal) || 0));
    dispatch({ type: "ADD_GPA_SNAPSHOT", row: { date, gpa: g, term: term.trim() || "Term" } });
    onClose();
  };
  return (
    <FamilyOverlay
      open
      onClose={onClose}
      title="Log GPA snapshot"
      light={light}
      footer={
        <div className="flex justify-end gap-2">
          <FamilyBtnGhost light={light} onClick={onClose}>
            Cancel
          </FamilyBtnGhost>
          <FamilyBtnPrimary light={light} onClick={save}>
            Save
          </FamilyBtnPrimary>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <FamilyFieldLabel light>Date</FamilyFieldLabel>
          <FamilyInput light={light} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>GPA (0–4)</FamilyFieldLabel>
          <FamilyInput light={light} inputMode="decimal" value={gpaVal} onChange={(e) => setGpaVal(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Term label</FamilyFieldLabel>
          <FamilyInput light={light} value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
      </div>
    </FamilyOverlay>
  );
}

function HomeworkFormOverlay({
  light,
  modal,
  childrenList,
  childFilter,
  onClose,
  dispatch,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; item: HomeworkItem };
  childrenList: { id: string; name: string }[];
  childFilter: string;
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const it = modal.mode === "edit" ? modal.item : null;
  const defaultChild = childFilter !== "all" ? childFilter : childrenList[0]?.id ?? "";
  const [subject, setSubject] = useState(it?.subject ?? "");
  const [task, setTask] = useState(it?.task ?? "");
  const [due, setDue] = useState(it?.due ?? "");
  const [childId, setChildId] = useState(it?.childId ?? defaultChild);
  const [completed, setCompleted] = useState(!!it?.completed);
  const save = () => {
    if (!subject.trim() || !task.trim() || !childId) return;
    if (modal.mode === "add") {
      dispatch({
        type: "ADD_HOMEWORK",
        item: { subject: subject.trim(), task: task.trim(), due: due.trim() || "—", childId, completed },
      });
    } else {
      dispatch({
        type: "UPDATE_HOMEWORK",
        id: modal.item.id,
        patch: { subject: subject.trim(), task: task.trim(), due: due.trim() || "—", childId, completed },
      });
    }
    onClose();
  };
  return (
    <FamilyOverlay
      open
      onClose={onClose}
      title={modal.mode === "add" ? "Add homework" : "Edit homework"}
      light={light}
      footer={
        <div className="flex justify-end gap-2">
          <FamilyBtnGhost light={light} onClick={onClose}>
            Cancel
          </FamilyBtnGhost>
          <FamilyBtnPrimary light={light} onClick={save}>
            Save
          </FamilyBtnPrimary>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <FamilyFieldLabel light>Child</FamilyFieldLabel>
          <FamilySelect light={light} value={childId} onChange={(e) => setChildId(e.target.value)}>
            {childrenList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FamilySelect>
        </div>
        <div>
          <FamilyFieldLabel light>Subject</FamilyFieldLabel>
          <FamilyInput light={light} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Task</FamilyFieldLabel>
          <FamilyTextarea light={light} value={task} onChange={(e) => setTask(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Due</FamilyFieldLabel>
          <FamilyInput light={light} value={due} onChange={(e) => setDue(e.target.value)} placeholder="Tomorrow, Mon, …" />
        </div>
        <label className={`flex cursor-pointer items-center gap-2 text-sm font-bold ${familyHeadingClass(light)}`}>
          <input type="checkbox" className="h-4 w-4 rounded border-emerald-300" checked={completed} onChange={(e) => setCompleted(e.target.checked)} />
          Mark complete
        </label>
      </div>
    </FamilyOverlay>
  );
}
