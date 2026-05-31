"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFamilyModule } from "@/contexts/FamilyModuleContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { FamilyBtnGhost, FamilyBtnPrimary } from "@/components/family-module/ui/family-module-buttons";
import { FamilyFieldLabel, FamilyInput } from "@/components/family-module/ui/FamilyFormFields";
import { FamilyOverlay } from "@/components/family-module/ui/FamilyOverlay";
import { SchoolScheduleSystem } from "@/components/family-module/school-schedule/SchoolScheduleSystem";
import { FamilyGlassCard, FamilySectionTitle, familyHeadingClass, familyMutedText } from "./FamilyUiPrimitives";
import type { SubjectRow } from "@/lib/family-module/types";

function formatNpr(n: number): string {
  return new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(n);
}

export function EducationDashboard() {
  const { state, dispatch } = useFamilyModule();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { tuition, gpa, subjects, educationFund } = state;
  const tuitionPct = tuition.totalNpr > 0 ? Math.round((tuition.paidNpr / tuition.totalNpr) * 100) : 0;

  const [tuitionOpen, setTuitionOpen] = useState(false);
  const [gpaOpen, setGpaOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [subModal, setSubModal] = useState<{ mode: "add" } | { mode: "edit"; row: SubjectRow } | null>(null);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 sm:mb-8">
        <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${light ? "text-emerald-700/80" : "text-emerald-400/70"}`}>Education</p>
        <h1 className={`mt-1 text-2xl font-black tracking-tight sm:text-3xl ${familyHeadingClass(light)}`}>Homework, fees, and trajectory</h1>
        <p className={`mt-2 max-w-2xl text-sm sm:text-base ${familyMutedText(light)}`}>
          School schedule, homework with completion, exams, fee history, teacher notes, analytics, and parent summaries — plus tuition, GPA, subjects,
          and education fund. All editable locally.
        </p>
      </div>

      <SchoolScheduleSystem />

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6">
        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Finance"
            title="Tuition fee tracker"
            subtitle={tuition.term}
            action={
              <FamilyBtnGhost light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setTuitionOpen(true)}>
                <Pencil size={14} /> Edit
              </FamilyBtnGhost>
            }
          />
          <div className="flex items-baseline justify-between gap-3">
            <p className={`text-3xl font-black tabular-nums ${familyHeadingClass(light)}`}>{tuitionPct}%</p>
            <p className={`text-xs font-bold ${familyMutedText(light)}`}>of term settled</p>
          </div>
          <div className={`mt-4 h-3 overflow-hidden rounded-full ${light ? "bg-emerald-100" : "bg-white/10"}`}>
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all duration-700" style={{ width: `${tuitionPct}%` }} />
          </div>
          <p className={`mt-4 text-sm ${familyMutedText(light)}`}>
            Paid NPR {formatNpr(tuition.paidNpr)} · Balance NPR {formatNpr(Math.max(0, tuition.totalNpr - tuition.paidNpr))}
          </p>
          <p className={`mt-1 text-xs font-semibold ${light ? "text-emerald-800" : "text-emerald-300"}`}>Next installment · {tuition.nextInstallment}</p>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Outcomes"
            title="GPA progress"
            subtitle={`Target for ${gpa.term} term.`}
            action={
              <FamilyBtnGhost light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setGpaOpen(true)}>
                <Pencil size={14} /> Edit
              </FamilyBtnGhost>
            }
          />
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <p className={`text-5xl font-black tabular-nums ${familyHeadingClass(light)}`}>{gpa.current.toFixed(2)}</p>
              <p className={`text-xs font-bold uppercase ${familyMutedText(light)}`}>Current GPA</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${light ? "border-emerald-200/80 bg-emerald-50/80" : "border-emerald-400/20 bg-emerald-500/10"}`}>
              <p className={`text-xs font-black uppercase ${familyMutedText(light)}`}>Goal</p>
              <p className={`text-2xl font-black tabular-nums ${familyHeadingClass(light)}`}>{gpa.target.toFixed(2)}</p>
            </div>
          </div>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Subjects"
            title="Subject performance"
            subtitle="Skill progress — edit % or add subjects."
            action={
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setSubModal({ mode: "add" })}>
                <Plus size={14} /> Add
              </FamilyBtnPrimary>
            }
          />
          <div className="space-y-4">
            {subjects.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-sm font-bold">
                    <span className={familyHeadingClass(light)}>{s.subject}</span>
                    <span className={light ? "text-emerald-800" : "text-emerald-200"}>{s.pct}%</span>
                  </div>
                  <div className={`mt-2 h-2 overflow-hidden rounded-full ${light ? "bg-emerald-100" : "bg-white/10"}`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${Math.min(100, s.pct)}%` }} />
                  </div>
                </div>
                <FamilyBtnGhost light={light} className="h-9 shrink-0 px-2" onClick={() => setSubModal({ mode: "edit", row: s })}>
                  <Pencil size={14} />
                </FamilyBtnGhost>
                <FamilyBtnGhost light={light} className="h-9 shrink-0 px-2" onClick={() => dispatch({ type: "DELETE_SUBJECT", id: s.id })}>
                  <Trash2 size={14} />
                </FamilyBtnGhost>
              </div>
            ))}
          </div>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} className="lg:col-span-2" padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="FIRE linkage"
            title="Future education fund planning"
            subtitle="SIP discipline + horizon math."
            action={
              <FamilyBtnGhost light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setFundOpen(true)}>
                <Pencil size={14} /> Edit
              </FamilyBtnGhost>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Monthly SIP", value: `NPR ${formatNpr(educationFund.monthlySipNpr)}` },
              { label: "Years to university", value: String(educationFund.yearsToUniversity) },
              { label: "Projected corpus", value: `NPR ${formatNpr(educationFund.projectedCorpusNpr)}` },
              { label: "Gap vs ambition", value: `NPR ${formatNpr(educationFund.gapNpr)}` },
            ].map((x) => (
              <div
                key={x.label}
                className={`rounded-2xl border p-4 transition duration-300 hover:-translate-y-0.5 ${
                  light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <p className={`text-[10px] font-black uppercase tracking-wide ${familyMutedText(light)}`}>{x.label}</p>
                <p className={`mt-2 text-lg font-black tabular-nums ${familyHeadingClass(light)}`}>{x.value}</p>
              </div>
            ))}
          </div>
        </FamilyGlassCard>
      </div>

      {tuitionOpen ? <TuitionOverlay light={light} tuition={tuition} onClose={() => setTuitionOpen(false)} dispatch={dispatch} /> : null}
      {gpaOpen ? <GpaOverlay light={light} gpa={gpa} onClose={() => setGpaOpen(false)} dispatch={dispatch} /> : null}
      {fundOpen ? <FundOverlay light={light} fund={educationFund} onClose={() => setFundOpen(false)} dispatch={dispatch} /> : null}
      {subModal ? <SubjectOverlay light={light} modal={subModal} onClose={() => setSubModal(null)} dispatch={dispatch} /> : null}
    </div>
  );
}

function TuitionOverlay({
  light,
  tuition,
  onClose,
  dispatch,
}: {
  light: boolean;
  tuition: { term: string; paidNpr: number; totalNpr: number; nextInstallment: string };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [term, setTerm] = useState(tuition.term);
  const [paid, setPaid] = useState(String(tuition.paidNpr));
  const [total, setTotal] = useState(String(tuition.totalNpr));
  const [next, setNext] = useState(tuition.nextInstallment);
  return (
    <FamilyOverlay open onClose={onClose} title="Update tuition" light={light}>
      <div className="space-y-3">
        <div>
          <FamilyFieldLabel light>Term label</FamilyFieldLabel>
          <FamilyInput light value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Paid (NPR)</FamilyFieldLabel>
          <FamilyInput light inputMode="numeric" value={paid} onChange={(e) => setPaid(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Total term (NPR)</FamilyFieldLabel>
          <FamilyInput light inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Next installment (YYYY-MM-DD)</FamilyFieldLabel>
          <FamilyInput light type="date" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <FamilyBtnGhost light={light} onClick={onClose}>
          Cancel
        </FamilyBtnGhost>
        <FamilyBtnPrimary
          light={light}
          onClick={() => {
            dispatch({
              type: "SET_TUITION",
              patch: {
                term: term.trim(),
                paidNpr: Math.max(0, Number(paid) || 0),
                totalNpr: Math.max(0, Number(total) || 0),
                nextInstallment: next,
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

function GpaOverlay({
  light,
  gpa,
  onClose,
  dispatch,
}: {
  light: boolean;
  gpa: { current: number; target: number; term: string };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [current, setCurrent] = useState(String(gpa.current));
  const [target, setTarget] = useState(String(gpa.target));
  const [term, setTerm] = useState(gpa.term);
  return (
    <FamilyOverlay open onClose={onClose} title="Edit GPA" light={light}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FamilyFieldLabel light>Current</FamilyFieldLabel>
          <FamilyInput light inputMode="decimal" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Target</FamilyFieldLabel>
          <FamilyInput light inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <FamilyFieldLabel light>Term label</FamilyFieldLabel>
          <FamilyInput light value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <FamilyBtnGhost light={light} onClick={onClose}>
          Cancel
        </FamilyBtnGhost>
        <FamilyBtnPrimary
          light={light}
          onClick={() => {
            dispatch({
              type: "SET_GPA",
              patch: {
                current: Math.min(4, Math.max(0, Number(current) || 0)),
                target: Math.min(4, Math.max(0, Number(target) || 0)),
                term: term.trim(),
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

function FundOverlay({
  light,
  fund,
  onClose,
  dispatch,
}: {
  light: boolean;
  fund: { monthlySipNpr: number; yearsToUniversity: number; projectedCorpusNpr: number; gapNpr: number };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [sip, setSip] = useState(String(fund.monthlySipNpr));
  const [years, setYears] = useState(String(fund.yearsToUniversity));
  const [proj, setProj] = useState(String(fund.projectedCorpusNpr));
  const [gap, setGap] = useState(String(fund.gapNpr));
  return (
    <FamilyOverlay open onClose={onClose} title="Education fund" light={light} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FamilyFieldLabel light>Monthly SIP (NPR)</FamilyFieldLabel>
          <FamilyInput light inputMode="numeric" value={sip} onChange={(e) => setSip(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Years to university</FamilyFieldLabel>
          <FamilyInput light inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Projected corpus</FamilyFieldLabel>
          <FamilyInput light inputMode="numeric" value={proj} onChange={(e) => setProj(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Gap (NPR)</FamilyFieldLabel>
          <FamilyInput light inputMode="numeric" value={gap} onChange={(e) => setGap(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <FamilyBtnGhost light={light} onClick={onClose}>
          Cancel
        </FamilyBtnGhost>
        <FamilyBtnPrimary
          light={light}
          onClick={() => {
            dispatch({
              type: "SET_EDUCATION_FUND",
              patch: {
                monthlySipNpr: Math.max(0, Number(sip) || 0),
                yearsToUniversity: Math.max(0, Math.floor(Number(years) || 0)),
                projectedCorpusNpr: Math.max(0, Number(proj) || 0),
                gapNpr: Math.max(0, Number(gap) || 0),
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

function SubjectOverlay({
  light,
  modal,
  onClose,
  dispatch,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; row: SubjectRow };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const row = modal.mode === "edit" ? modal.row : null;
  const [subject, setSubject] = useState(row?.subject ?? "");
  const [pct, setPct] = useState(String(row?.pct ?? 80));
  const onSave = () => {
    const p = Math.min(100, Math.max(0, Number(pct) || 0));
    if (!subject.trim()) return;
    if (modal.mode === "add") dispatch({ type: "ADD_SUBJECT", row: { subject: subject.trim(), pct: p } });
    else dispatch({ type: "UPDATE_SUBJECT", id: modal.row.id, patch: { subject: subject.trim(), pct: p } });
    onClose();
  };
  return (
    <FamilyOverlay
      open
      onClose={onClose}
      title={modal.mode === "add" ? "Add subject" : "Edit subject"}
      light={light}
      footer={
        <div className="flex justify-end gap-2">
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
          <FamilyFieldLabel light>Subject</FamilyFieldLabel>
          <FamilyInput light value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Performance %</FamilyFieldLabel>
          <FamilyInput light inputMode="numeric" value={pct} onChange={(e) => setPct(e.target.value)} />
        </div>
      </div>
    </FamilyOverlay>
  );
}
