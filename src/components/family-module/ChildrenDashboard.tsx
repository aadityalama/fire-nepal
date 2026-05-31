"use client";

import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useFamilyModule } from "@/contexts/FamilyModuleContext";
import { daysUntilIsoDate } from "@/lib/family-module/family-date-utils";
import type { ActivitySlice, ChildSummary } from "@/lib/family-module/types";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { FamilyBtnDanger, FamilyBtnGhost, FamilyBtnPrimary } from "@/components/family-module/ui/family-module-buttons";
import { FamilyFieldLabel, FamilyInput, FamilySelect, FamilyTextarea } from "@/components/family-module/ui/FamilyFormFields";
import { FamilyOverlay } from "@/components/family-module/ui/FamilyOverlay";
import { FamilyGlassCard, FamilySectionTitle, familyHeadingClass, familyMutedText } from "./FamilyUiPrimitives";

type ChildModal = { mode: "add" } | { mode: "edit"; child: ChildSummary };

export function ChildrenDashboard() {
  const { state, dispatch } = useFamilyModule();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  const { children, attendanceWeek, exam, studyStreakDays, activityMinutes, sleepQuality } = state;
  const totalAct = useMemo(() => activityMinutes.reduce((a, x) => a + x.value, 0), [activityMinutes]);
  const examDays = daysUntilIsoDate(exam.examDate);

  const [childModal, setChildModal] = useState<ChildModal | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [examOpen, setExamOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [activityModal, setActivityModal] = useState<{ mode: "add" } | { mode: "edit"; row: ActivitySlice } | null>(null);
  const [deleteChildId, setDeleteChildId] = useState<string | null>(null);

  const closeAll = useCallback(() => {
    setChildModal(null);
    setAttendanceOpen(false);
    setExamOpen(false);
    setStreakOpen(false);
    setSleepOpen(false);
    setActivityModal(null);
    setDeleteChildId(null);
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${light ? "text-emerald-700/80" : "text-emerald-400/70"}`}>Children</p>
          <h1 className={`mt-1 text-2xl font-black tracking-tight sm:text-3xl ${familyHeadingClass(light)}`}>Profiles, rhythm, and growth</h1>
          <p className={`mt-2 max-w-2xl text-sm sm:text-base ${familyMutedText(light)}`}>
            Editable profiles, attendance, exams, streaks, movement, and sleep — local-first until backend sync.
          </p>
        </div>
        <FamilyBtnPrimary light={light} className="shrink-0 self-start" onClick={() => setChildModal({ mode: "add" })}>
          <Plus size={16} /> Add Child
        </FamilyBtnPrimary>
      </div>

      <FamilySectionTitle light={light} eyebrow="Household" title="Child profile cards" subtitle="Add, edit, or remove children — changes stay in this browser session." />
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {children.map((c) => (
          <FamilyGlassCard key={c.id} light={light} padding="lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div
                className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-xl font-black text-emerald-950 shadow-lg ${c.avatarHue}`}
              >
                {c.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-lg font-black ${familyHeadingClass(light)}`}>{c.name}</p>
                <p className={`text-sm ${familyMutedText(light)}`}>
                  {c.school} · {c.grade}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                      light ? "bg-emerald-100 text-emerald-900" : "bg-emerald-500/15 text-emerald-100"
                    }`}
                  >
                    Age {c.age}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                      light ? "bg-slate-100 text-slate-800" : "bg-white/10 text-zinc-200"
                    }`}
                  >
                    {c.mood}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 self-start sm:flex-col sm:self-center">
                <FamilyBtnGhost light={light} className="min-h-[38px] px-3 py-2 text-[11px]" onClick={() => setChildModal({ mode: "edit", child: c })}>
                  <Pencil size={14} /> Edit
                </FamilyBtnGhost>
                <FamilyBtnDanger light={light} className="min-h-[38px] px-3 py-2 text-[11px]" onClick={() => setDeleteChildId(c.id)}>
                  <Trash2 size={14} /> Delete
                </FamilyBtnDanger>
                <Link
                  href="/education"
                  className={`inline-flex min-h-[38px] items-center justify-center rounded-xl border px-3 py-2 text-[11px] font-black transition ${
                    light ? "border-emerald-200/90 hover:bg-emerald-50" : "border-emerald-400/25 hover:bg-white/10"
                  }`}
                >
                  Education →
                </Link>
              </div>
            </div>
          </FamilyGlassCard>
        ))}
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6">
        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="This week"
            title="Attendance"
            subtitle="Composite proxy — tap Edit to adjust each day."
            action={
              <FamilyBtnGhost light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setAttendanceOpen(true)}>
                Edit
              </FamilyBtnGhost>
            }
          />
          <div className="flex gap-2">
            {attendanceWeek.map((d) => (
              <div key={d.label} className="flex-1 text-center">
                <div className={`relative mb-2 h-24 overflow-hidden rounded-xl ${light ? "bg-emerald-50" : "bg-white/10"}`}>
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-t-lg bg-gradient-to-t from-emerald-600 to-lime-400 transition-all duration-500"
                    style={{ height: `${Math.min(100, Math.max(0, d.pct))}%` }}
                  />
                </div>
                <p className={`text-[10px] font-black uppercase tracking-wide ${familyMutedText(light)}`}>{d.label}</p>
                <p className={`text-xs font-bold tabular-nums ${familyHeadingClass(light)}`}>{d.pct}%</p>
              </div>
            ))}
          </div>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Assessments"
            title="Exam countdown"
            subtitle={exam.subject}
            action={
              <FamilyBtnGhost light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setExamOpen(true)}>
                Edit
              </FamilyBtnGhost>
            }
          />
          <div className="flex flex-wrap items-end gap-4">
            <p className={`text-5xl font-black tabular-nums sm:text-6xl ${familyHeadingClass(light)}`}>{examDays}</p>
            <div>
              <p className={`text-sm font-black ${light ? "text-emerald-800" : "text-emerald-200"}`}>days remaining</p>
              <p className={`text-sm ${familyMutedText(light)}`}>{exam.title}</p>
            </div>
          </div>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Habits"
            title="Study streak"
            subtitle="Self-logged streak — editable."
            action={
              <FamilyBtnGhost light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setStreakOpen(true)}>
                Edit
              </FamilyBtnGhost>
            }
          />
          <div className="flex items-center gap-6">
            <div
              className={`grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-dashed text-center ${
                light ? "border-emerald-200 bg-emerald-50" : "border-emerald-500/30 bg-emerald-500/10"
              }`}
            >
              <div>
                <p className={`text-2xl font-black ${familyHeadingClass(light)}`}>{studyStreakDays}</p>
                <p className={`text-[10px] font-bold uppercase ${familyMutedText(light)}`}>days</p>
              </div>
            </div>
            <p className={`text-sm leading-relaxed ${familyMutedText(light)}`}>
              Streaks gamify consistency without nagging. Wire to your homework module for auto-validation.
            </p>
          </div>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Today"
            title="Activity tracker"
            subtitle="Minutes by bucket — add, edit, or remove rows."
            action={
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setActivityModal({ mode: "add" })}>
                <Plus size={14} /> Add
              </FamilyBtnPrimary>
            }
          />
          <div className="space-y-3">
            {activityMinutes.map((a) => (
              <div key={a.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex justify-between text-xs font-bold">
                    <span className={familyHeadingClass(light)}>{a.label}</span>
                    <span className={familyMutedText(light)}>{totalAct ? Math.round((a.value / totalAct) * 100) : 0}%</span>
                  </div>
                  <div className={`h-2.5 overflow-hidden rounded-full ${light ? "bg-emerald-100" : "bg-white/10"}`}>
                    <div className={`h-full rounded-full ${a.color}`} style={{ width: `${totalAct ? (a.value / totalAct) * 100 : 0}%` }} />
                  </div>
                </div>
                <FamilyBtnGhost light={light} className="h-9 w-9 shrink-0 p-0" onClick={() => setActivityModal({ mode: "edit", row: a })} aria-label="Edit activity">
                  <Pencil size={14} />
                </FamilyBtnGhost>
                <FamilyBtnDanger light={light} className="h-9 w-9 shrink-0 p-0" onClick={() => dispatch({ type: "DELETE_ACTIVITY", id: a.id })} aria-label="Delete activity">
                  <Trash2 size={14} />
                </FamilyBtnDanger>
              </div>
            ))}
          </div>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} className="lg:col-span-2" padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Recovery"
            title="Sleep quality"
            subtitle={sleepQuality.note}
            action={
              <FamilyBtnGhost light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setSleepOpen(true)}>
                Edit
              </FamilyBtnGhost>
            }
          />
          <div className="grid gap-6 sm:grid-cols-3">
            <div className={`rounded-2xl border p-5 text-center ${light ? "border-emerald-100 bg-white/90" : "border-white/10 bg-white/[0.04]"}`}>
              <p className={`text-4xl font-black tabular-nums ${familyHeadingClass(light)}`}>{sleepQuality.score}</p>
              <p className={`mt-1 text-xs font-bold uppercase tracking-wide ${familyMutedText(light)}`}>Sleep score</p>
            </div>
            <div className={`rounded-2xl border p-5 ${light ? "border-emerald-100 bg-white/90" : "border-white/10 bg-white/[0.04]"}`}>
              <p className={`text-sm font-black ${familyHeadingClass(light)}`}>Deep sleep</p>
              <p className={`mt-2 text-2xl font-black tabular-nums ${light ? "text-emerald-800" : "text-emerald-200"}`}>{sleepQuality.deepHours}h</p>
            </div>
            <div className={`rounded-2xl border p-5 ${light ? "border-emerald-100 bg-white/90" : "border-white/10 bg-white/[0.04]"}`}>
              <p className={`text-sm font-black ${familyHeadingClass(light)}`}>Bed / wake</p>
              <p className={`mt-2 text-sm font-bold ${familyMutedText(light)}`}>
                {sleepQuality.bedTime} → {sleepQuality.wakeTime}
              </p>
              <p className={`mt-3 flex items-center gap-2 text-xs ${familyMutedText(light)}`}>
                <Sparkles size={14} className="text-emerald-400" /> Consistent wind-down helps behavior scores.
              </p>
            </div>
          </div>
        </FamilyGlassCard>
      </div>

      {childModal ? (
        <ChildFormOverlay light={light} modal={childModal} onClose={closeAll} dispatch={dispatch} />
      ) : null}
      {deleteChildId ? (
        <DeleteChildOverlay light={light} id={deleteChildId} onClose={closeAll} dispatch={dispatch} name={children.find((c) => c.id === deleteChildId)?.name ?? ""} />
      ) : null}
      {attendanceOpen ? (
        <AttendanceOverlay light={light} days={attendanceWeek} onClose={closeAll} dispatch={dispatch} />
      ) : null}
      {examOpen ? <ExamOverlay light={light} exam={exam} onClose={closeAll} dispatch={dispatch} /> : null}
      {streakOpen ? <StreakOverlay light={light} days={studyStreakDays} onClose={closeAll} dispatch={dispatch} /> : null}
      {sleepOpen ? <SleepOverlay light={light} sleep={sleepQuality} onClose={closeAll} dispatch={dispatch} /> : null}
      {activityModal ? (
        <ActivityOverlay light={light} modal={activityModal} onClose={closeAll} dispatch={dispatch} />
      ) : null}
    </div>
  );
}

function ChildFormOverlay({
  light,
  modal,
  onClose,
  dispatch,
}: {
  light: boolean;
  modal: ChildModal;
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const initial =
    modal.mode === "edit"
      ? modal.child
      : { name: "", age: 8, school: "", grade: "", mood: "Calm" };
  const [name, setName] = useState(initial.name);
  const [age, setAge] = useState(String(initial.age));
  const [school, setSchool] = useState(initial.school);
  const [grade, setGrade] = useState(initial.grade);
  const [mood, setMood] = useState(initial.mood);

  const onSave = () => {
    const a = Number(age) || 0;
    if (!name.trim()) return;
    if (modal.mode === "add") {
      dispatch({
        type: "ADD_CHILD",
        child: { name: name.trim(), age: a, school: school.trim(), grade: grade.trim(), mood: mood.trim() },
      });
    } else {
      dispatch({
        type: "UPDATE_CHILD",
        id: modal.child.id,
        patch: { name: name.trim(), age: a, school: school.trim(), grade: grade.trim(), mood: mood.trim() },
      });
    }
    onClose();
  };

  return (
    <FamilyOverlay
      open
      onClose={onClose}
      title={modal.mode === "add" ? "Add child" : "Edit child"}
      description="Profile fields are stored in local family state for this session."
      light={light}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <FamilyBtnGhost light={light} onClick={onClose}>
            Cancel
          </FamilyBtnGhost>
          <FamilyBtnPrimary light={light} onClick={onSave}>
            Save
          </FamilyBtnPrimary>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <FamilyFieldLabel light>Name</FamilyFieldLabel>
          <FamilyInput light value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" />
        </div>
        <div>
          <FamilyFieldLabel light>Age</FamilyFieldLabel>
          <FamilyInput light inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>School</FamilyFieldLabel>
          <FamilyInput light value={school} onChange={(e) => setSchool(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Grade</FamilyFieldLabel>
          <FamilyInput light value={grade} onChange={(e) => setGrade(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Mood tag</FamilyFieldLabel>
          <FamilyInput light value={mood} onChange={(e) => setMood(e.target.value)} />
        </div>
      </div>
    </FamilyOverlay>
  );
}

function DeleteChildOverlay({
  light,
  id,
  name,
  onClose,
  dispatch,
}: {
  light: boolean;
  id: string;
  name: string;
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  return (
    <FamilyOverlay open onClose={onClose} title="Delete child?" description={`Remove ${name || "this child"} from your local list.`} light={light}>
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <FamilyBtnGhost light={light} onClick={onClose}>
          Cancel
        </FamilyBtnGhost>
        <FamilyBtnDanger
          light={light}
          onClick={() => {
            dispatch({ type: "DELETE_CHILD", id });
            onClose();
          }}
        >
          Delete
        </FamilyBtnDanger>
      </div>
    </FamilyOverlay>
  );
}

function AttendanceOverlay({
  light,
  days,
  onClose,
  dispatch,
}: {
  light: boolean;
  days: { label: string; pct: number }[];
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [values, setValues] = useState(() => days.map((d) => String(d.pct)));

  const syncToReducer = () => {
    values.forEach((raw, index) => {
      const v = Math.min(100, Math.max(0, Number(raw) || 0));
      dispatch({ type: "SET_ATTENDANCE", index, pct: v });
    });
  };

  return (
    <FamilyOverlay open onClose={onClose} title="Edit attendance" description="Set attendance % for each weekday (0–100)." light={light} wide>
      <div className="grid gap-3 sm:grid-cols-5">
        {days.map((d, index) => (
          <div key={d.label}>
            <FamilyFieldLabel light>{d.label}</FamilyFieldLabel>
            <FamilyInput
              light
              inputMode="numeric"
              value={values[index] ?? "0"}
              onChange={(e) => {
                const next = [...values];
                next[index] = e.target.value;
                setValues(next);
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <FamilyBtnGhost light={light} onClick={onClose}>
          Cancel
        </FamilyBtnGhost>
        <FamilyBtnPrimary
          light={light}
          onClick={() => {
            syncToReducer();
            onClose();
          }}
        >
          Save
        </FamilyBtnPrimary>
      </div>
    </FamilyOverlay>
  );
}

function ExamOverlay({
  light,
  exam,
  onClose,
  dispatch,
}: {
  light: boolean;
  exam: { title: string; subject: string; examDate: string };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [title, setTitle] = useState(exam.title);
  const [subject, setSubject] = useState(exam.subject);
  const [examDate, setExamDate] = useState(exam.examDate);
  return (
    <FamilyOverlay open onClose={onClose} title="Edit exam" light={light}>
      <div className="space-y-3">
        <div>
          <FamilyFieldLabel light>Title</FamilyFieldLabel>
          <FamilyInput light value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Subject / scope</FamilyFieldLabel>
          <FamilyInput light value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Exam date</FamilyFieldLabel>
          <FamilyInput light type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <FamilyBtnGhost light={light} onClick={onClose}>
          Cancel
        </FamilyBtnGhost>
        <FamilyBtnPrimary
          light={light}
          onClick={() => {
            dispatch({ type: "SET_EXAM", patch: { title: title.trim(), subject: subject.trim(), examDate } });
            onClose();
          }}
        >
          Save
        </FamilyBtnPrimary>
      </div>
    </FamilyOverlay>
  );
}

function StreakOverlay({
  light,
  days,
  onClose,
  dispatch,
}: {
  light: boolean;
  days: number;
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [v, setV] = useState(String(days));
  return (
    <FamilyOverlay open onClose={onClose} title="Study streak" light={light}>
      <FamilyFieldLabel light>Consecutive days</FamilyFieldLabel>
      <FamilyInput light inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)} />
      <div className="mt-4 flex justify-end gap-2">
        <FamilyBtnGhost light={light} onClick={onClose}>
          Cancel
        </FamilyBtnGhost>
        <FamilyBtnPrimary
          light={light}
          onClick={() => {
            dispatch({ type: "SET_STUDY_STREAK", days: Number(v) || 0 });
            onClose();
          }}
        >
          Save
        </FamilyBtnPrimary>
      </div>
    </FamilyOverlay>
  );
}

function SleepOverlay({
  light,
  sleep,
  onClose,
  dispatch,
}: {
  light: boolean;
  sleep: { score: number; deepHours: number; bedTime: string; wakeTime: string; note: string };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [score, setScore] = useState(String(sleep.score));
  const [deep, setDeep] = useState(String(sleep.deepHours));
  const [bed, setBed] = useState(sleep.bedTime);
  const [wake, setWake] = useState(sleep.wakeTime);
  const [note, setNote] = useState(sleep.note);
  return (
    <FamilyOverlay open onClose={onClose} title="Sleep tracking" light={light}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FamilyFieldLabel light>Score (0–100)</FamilyFieldLabel>
          <FamilyInput light inputMode="numeric" value={score} onChange={(e) => setScore(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Deep sleep (hours)</FamilyFieldLabel>
          <FamilyInput light inputMode="decimal" value={deep} onChange={(e) => setDeep(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Bedtime</FamilyFieldLabel>
          <FamilyInput light type="time" value={bed} onChange={(e) => setBed(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Wake time</FamilyFieldLabel>
          <FamilyInput light type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
        </div>
      </div>
      <div className="mt-3">
        <FamilyFieldLabel light>Note</FamilyFieldLabel>
        <FamilyTextarea light value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <FamilyBtnGhost light={light} onClick={onClose}>
          Cancel
        </FamilyBtnGhost>
        <FamilyBtnPrimary
          light={light}
          onClick={() => {
            dispatch({
              type: "SET_SLEEP",
              patch: {
                score: Math.min(100, Math.max(0, Number(score) || 0)),
                deepHours: Math.max(0, Number(deep) || 0),
                bedTime: bed,
                wakeTime: wake,
                note: note.trim(),
              },
            });
            onClose();
          }}
        >
          Save
        </FamilyBtnPrimary>
      </div>
    </FamilyOverlay>
  );
}

const ACTIVITY_COLORS = [
  "bg-emerald-400/80",
  "bg-teal-400/80",
  "bg-lime-400/70",
  "bg-cyan-400/70",
  "bg-white/15",
] as const;

function ActivityOverlay({
  light,
  modal,
  onClose,
  dispatch,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; row: ActivitySlice };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const row = modal.mode === "edit" ? modal.row : null;
  const [label, setLabel] = useState(row?.label ?? "");
  const [value, setValue] = useState(String(row?.value ?? 30));
  const [color, setColor] = useState(row?.color ?? ACTIVITY_COLORS[0]);

  const onSave = () => {
    const n = Math.max(0, Number(value) || 0);
    if (!label.trim()) return;
    if (modal.mode === "add") {
      dispatch({ type: "ADD_ACTIVITY", slice: { label: label.trim(), value: n, color } });
    } else {
      dispatch({ type: "UPDATE_ACTIVITY", id: modal.row.id, patch: { label: label.trim(), value: n, color } });
    }
    onClose();
  };

  return (
    <FamilyOverlay open onClose={onClose} title={modal.mode === "add" ? "Add activity" : "Edit activity"} light={light}>
      <div className="space-y-3">
        <div>
          <FamilyFieldLabel light>Label</FamilyFieldLabel>
          <FamilyInput light value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Minutes</FamilyFieldLabel>
          <FamilyInput light inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Bar color</FamilyFieldLabel>
          <FamilySelect light value={color} onChange={(e) => setColor(e.target.value)}>
            {ACTIVITY_COLORS.map((c) => (
              <option key={c} value={c}>
                {c.replace("bg-", "").replace("/", " ")}
              </option>
            ))}
          </FamilySelect>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <FamilyBtnGhost light={light} onClick={onClose}>
          Cancel
        </FamilyBtnGhost>
        <FamilyBtnPrimary light={light} onClick={onSave}>
          Save
        </FamilyBtnPrimary>
      </div>
    </FamilyOverlay>
  );
}
