"use client";

import {
  Award,
  Download,
  FileStack,
  Filter,
  GraduationCap,
  LineChart as LineChartIcon,
  Lock,
  Plus,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFamilyModule } from "@/contexts/FamilyModuleContext";
import type { VaultDocument, VaultDocumentCategory } from "@/lib/family-module/types";
import { vaultDeleteBlob, vaultDownloadBlob, vaultGetBlob, vaultPutBlob } from "@/lib/family-module/vault-idb";
import { newFamilyId } from "@/lib/family-module/id";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { FamilyBtnGhost, FamilyBtnPrimary } from "@/components/family-module/ui/family-module-buttons";
import { FamilyFieldLabel, FamilyInput, FamilySelect, FamilyTextarea } from "@/components/family-module/ui/FamilyFormFields";
import { FamilyOverlay } from "@/components/family-module/ui/FamilyOverlay";
import { FamilyGlassCard, FamilySectionTitle, familyHeadingClass, familyMutedText } from "./FamilyUiPrimitives";

const DOC_CATS: { id: VaultDocumentCategory; label: string }[] = [
  { id: "certificate", label: "Certificate" },
  { id: "report_card", label: "Report card" },
  { id: "fee_receipt", label: "Fee receipt" },
  { id: "id_doc", label: "ID / passport" },
  { id: "medical", label: "Medical" },
  { id: "other", label: "Other" },
];

function formatNpr(n: number): string {
  return new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(n);
}

function childName(children: { id: string; name: string }[], id: string | null): string {
  if (!id) return "Family";
  return children.find((c) => c.id === id)?.name ?? "—";
}

export function ChildRecordsVaultDashboard() {
  const { state, dispatch } = useFamilyModule();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const {
    children,
    feePaymentHistory,
    examResults,
    gpaHistory,
    subjectTrendPoints,
    vaultDocuments,
    vaultTimeline,
    documentReminders,
    vaultEducationInsights,
  } = state;

  const [q, setQ] = useState("");
  const [childFilter, setChildFilter] = useState<string>("all");
  const [docCat, setDocCat] = useState<string>("all");
  const [feeOpen, setFeeOpen] = useState(false);
  const [examOpen, setExamOpen] = useState(false);
  const [remOpen, setRemOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const gpaChart = useMemo(
    () => [...gpaHistory].sort((a, b) => a.date.localeCompare(b.date)).map((g) => ({ label: g.date.slice(0, 7), gpa: g.gpa, term: g.term })),
    [gpaHistory],
  );

  const subjectChart = useMemo(() => {
    const subjects = [...new Set(subjectTrendPoints.map((s) => s.subject))];
    const dates = [...new Set(subjectTrendPoints.map((s) => s.date))].sort();
    return dates.map((date) => {
      const row: Record<string, string | number> = { date };
      for (const sub of subjects) {
        const hit = subjectTrendPoints.find((p) => p.date === date && p.subject === sub);
        if (hit) row[sub] = hit.pct;
      }
      return row;
    });
  }, [subjectTrendPoints]);
  const subjectKeys = useMemo(() => [...new Set(subjectTrendPoints.map((s) => s.subject))], [subjectTrendPoints]);

  const palette = ["#34d399", "#2dd4bf", "#a3e635", "#38bdf8", "#f472b6", "#fbbf24"];

  const matches = useCallback(
    (text: string) => {
      if (!q.trim()) return true;
      return text.toLowerCase().includes(q.trim().toLowerCase());
    },
    [q],
  );

  const feesF = useMemo(() => {
    return feePaymentHistory.filter((f) => {
      if (childFilter !== "all" && f.childId !== childFilter) return false;
      return matches(`${f.term} ${f.method} ${f.reference ?? ""} ${formatNpr(f.amountNpr)}`);
    });
  }, [feePaymentHistory, childFilter, matches]);

  const examsF = useMemo(() => {
    return examResults.filter((e) => {
      if (childFilter !== "all" && e.childId !== childFilter) return false;
      return matches(`${e.title} ${e.subject} ${e.gradeLabel} ${e.date}`);
    });
  }, [examResults, childFilter, matches]);

  const docsF = useMemo(() => {
    return vaultDocuments.filter((d) => {
      if (childFilter !== "all" && d.childId && d.childId !== childFilter) return false;
      if (docCat !== "all" && d.category !== docCat) return false;
      return matches(`${d.title} ${d.fileName} ${d.notes ?? ""}`);
    });
  }, [vaultDocuments, childFilter, docCat, matches]);

  const timelineF = useMemo(() => {
    return [...vaultTimeline]
      .filter((t) => matches(`${t.title} ${t.detail}`))
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [vaultTimeline, matches]);

  const remindersF = useMemo(() => {
    return documentReminders.filter((r) => {
      if (childFilter !== "all" && r.childId && r.childId !== childFilter) return false;
      return matches(`${r.title} ${r.note ?? ""}`);
    });
  }, [documentReminders, childFilter, matches]);

  const onDownload = async (doc: VaultDocument) => {
    setBusyId(doc.id);
    try {
      const blob = await vaultGetBlob(doc.id);
      if (blob) vaultDownloadBlob(blob, doc.fileName);
    } finally {
      setBusyId(null);
    }
  };

  const onDeleteDoc = async (doc: VaultDocument) => {
    setBusyId(doc.id);
    try {
      await vaultDeleteBlob(doc.id);
      dispatch({ type: "DELETE_VAULT_DOCUMENT", id: doc.id });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8">
        <div
          className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
            light ? "border-emerald-200/80 bg-white/90" : "border-emerald-500/20 bg-white/[0.05]"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/25">
              <Shield size={22} />
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${light ? "text-emerald-800" : "text-emerald-400/80"}`}>
                Secure vault
              </p>
              <h1 className={`text-xl font-black tracking-tight sm:text-2xl ${familyHeadingClass(light)}`}>Child Records &amp; Document Vault</h1>
              <p className={`mt-1 max-w-xl text-sm ${familyMutedText(light)}`}>
                Files stay in this browser&apos;s IndexedDB; metadata in family state. HD originals supported — export anytime.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <Lock size={14} /> Local encrypted storage path ready
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
            <FamilyInput light={light} className="pl-9" placeholder="Search fees, exams, documents, timeline…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={16} className={familyMutedText(light)} aria-hidden />
            <FamilySelect light={light} value={childFilter} onChange={(e) => setChildFilter(e.target.value)} className="min-w-[8rem]">
              <option value="all">All children</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </FamilySelect>
            <FamilySelect light={light} value={docCat} onChange={(e) => setDocCat(e.target.value)} className="min-w-[9rem]">
              <option value="all">All doc types</option>
              {DOC_CATS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </FamilySelect>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Finance"
            title="School fee payment history"
            subtitle="NPR trail with references."
            action={
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setFeeOpen(true)}>
                <Plus size={14} /> Add payment
              </FamilyBtnPrimary>
            }
          />
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {feesF.map((f) => (
              <li
                key={f.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                  light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <div>
                  <p className={`font-bold ${familyHeadingClass(light)}`}>{f.term}</p>
                  <p className={`text-xs ${familyMutedText(light)}`}>
                    {childName(children, f.childId)} · {f.paidAt} · {f.method}
                  </p>
                </div>
                <span className={`font-black tabular-nums ${light ? "text-emerald-800" : "text-emerald-200"}`}>NPR {formatNpr(f.amountNpr)}</span>
              </li>
            ))}
          </ul>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Assessments"
            title="Exam results"
            subtitle="Scores and grade labels."
            action={
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setExamOpen(true)}>
                <Plus size={14} /> Add result
              </FamilyBtnPrimary>
            }
          />
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {examsF.map((e) => (
              <li
                key={e.id}
                className={`rounded-xl border px-3 py-2.5 text-sm ${light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={`font-bold ${familyHeadingClass(light)}`}>{e.title}</p>
                  <span className={`text-xs font-black ${light ? "text-emerald-800" : "text-emerald-300"}`}>{e.gradeLabel}</span>
                </div>
                <p className={`text-xs ${familyMutedText(light)}`}>
                  {childName(children, e.childId)} · {e.subject} · {e.date}
                  {e.scorePct != null ? ` · ${e.scorePct}%` : ""}
                </p>
              </li>
            ))}
          </ul>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle light={light} eyebrow="Analytics" title="GPA trajectory" subtitle="Term snapshots." action={<LineChartIcon size={18} className="opacity-70" />} />
          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gpaChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={light ? "#d1fae5" : "#14532d40"} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke={light ? "#64748b" : "#94a3b8"} />
                <YAxis domain={[2.5, 4]} tick={{ fontSize: 10 }} stroke={light ? "#64748b" : "#94a3b8"} width={32} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: light ? "1px solid #a7f3d0" : "1px solid #065f46",
                    background: light ? "#fff" : "#052e16",
                  }}
                />
                <Line type="monotone" dataKey="gpa" name="GPA" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle light={light} eyebrow="Analytics" title="Subject performance trends" subtitle="% strength over time." action={<Award size={18} className="opacity-70" />} />
          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={subjectChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={light ? "#d1fae5" : "#14532d40"} />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke={light ? "#64748b" : "#94a3b8"} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke={light ? "#64748b" : "#94a3b8"} width={28} />
                <Tooltip contentStyle={{ borderRadius: 12, background: light ? "#fff" : "#052e16", border: light ? "1px solid #a7f3d0" : "1px solid #065f46" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {subjectKeys.map((sub, i) => (
                  <Line key={sub} type="monotone" dataKey={sub} stroke={palette[i % palette.length]} strokeWidth={2} dot={{ r: 2 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} className="lg:col-span-2" padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Vault"
            title="Certificates & HD documents"
            subtitle="Uploads stored in IndexedDB on this device — download anytime."
            action={
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setUploadOpen(true)}>
                <Upload size={14} /> Upload
              </FamilyBtnPrimary>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {docsF.map((d) => (
              <div
                key={d.id}
                className={`flex flex-col gap-2 rounded-xl border p-4 transition hover:-translate-y-0.5 ${
                  light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileStack size={18} className="text-emerald-500" />
                    <div>
                      <p className={`font-bold leading-snug ${familyHeadingClass(light)}`}>{d.title}</p>
                      <p className={`text-xs ${familyMutedText(light)}`}>
                        {DOC_CATS.find((c) => c.id === d.category)?.label ?? d.category} · {(d.byteSize / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                </div>
                <p className={`text-[11px] ${familyMutedText(light)}`}>
                  {childName(children, d.childId)} · {new Date(d.uploadedAt).toLocaleString()}
                </p>
                {d.notes ? <p className={`text-xs ${familyMutedText(light)}`}>{d.notes}</p> : null}
                <div className="mt-auto flex flex-wrap gap-2">
                  <FamilyBtnGhost light={light} className="min-h-[36px] flex-1 text-[11px]" disabled={busyId === d.id} onClick={() => void onDownload(d)}>
                    <Download size={14} /> Download
                  </FamilyBtnGhost>
                  <FamilyBtnGhost light={light} className="min-h-[36px] text-rose-600 dark:text-rose-300" disabled={busyId === d.id} onClick={() => void onDeleteDoc(d)}>
                    <Trash2 size={14} /> Delete
                  </FamilyBtnGhost>
                </div>
              </div>
            ))}
            {docsF.length === 0 ? <p className={`col-span-full text-sm ${familyMutedText(light)}`}>No documents match filters — upload a PDF or image.</p> : null}
          </div>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Reminders"
            title="Family document reminders"
            subtitle="Passport scans, booster cards, etc."
            action={
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setRemOpen(true)}>
                <Plus size={14} /> Add
              </FamilyBtnPrimary>
            }
          />
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {remindersF.map((r) => (
              <li key={r.id} className={`rounded-xl border px-3 py-2.5 text-sm ${light ? "border-amber-100/90 bg-amber-50/50" : "border-amber-500/20 bg-amber-500/10"}`}>
                <p className={`font-bold ${familyHeadingClass(light)}`}>{r.title}</p>
                <p className={`text-xs ${familyMutedText(light)}`}>
                  Due {r.dueDate} · {childName(children, r.childId)}
                </p>
                {r.note ? <p className={`mt-1 text-xs ${familyMutedText(light)}`}>{r.note}</p> : null}
              </li>
            ))}
          </ul>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle light={light} eyebrow="Insights" title="Education insights" subtitle="Vault-scoped signals." action={<Sparkles size={18} className="opacity-70" />} />
          <ul className="max-h-80 space-y-3 overflow-y-auto">
            {vaultEducationInsights.map((ins) => (
              <li key={ins.id} className={`rounded-xl border p-3 text-sm ${light ? "border-emerald-100 bg-white/90" : "border-white/10 bg-white/[0.04]"}`}>
                <p className={`font-black ${familyHeadingClass(light)}`}>{ins.title}</p>
                <p className={`mt-1 text-xs leading-relaxed ${familyMutedText(light)}`}>{ins.body}</p>
              </li>
            ))}
          </ul>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} className="lg:col-span-2" padding="lg">
          <FamilySectionTitle light={light} eyebrow="History" title="Timeline" subtitle="Fees, exams, uploads, GPA, reminders — newest first." action={<GraduationCap size={18} className="opacity-70" />} />
          <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {timelineF.map((t) => (
              <li
                key={t.id}
                className={`flex flex-wrap items-baseline justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                  light ? "border-emerald-100/80 bg-white/80" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div>
                  <span className={`mr-2 text-[10px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-400`}>{t.kind}</span>
                  <span className={`font-bold ${familyHeadingClass(light)}`}>{t.title}</span>
                  <p className={`text-xs ${familyMutedText(light)}`}>{t.detail}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold uppercase ${familyMutedText(light)}`}>{t.occurredAt.slice(0, 16).replace("T", " ")}</span>
              </li>
            ))}
          </ul>
        </FamilyGlassCard>
      </div>

      {feeOpen ? <FeeOverlay light={light} childrenList={children} onClose={() => setFeeOpen(false)} dispatch={dispatch} /> : null}
      {examOpen ? <ExamOverlay light={light} childrenList={children} onClose={() => setExamOpen(false)} dispatch={dispatch} /> : null}
      {remOpen ? <ReminderOverlay light={light} childrenList={children} onClose={() => setRemOpen(false)} dispatch={dispatch} /> : null}
      {uploadOpen ? (
        <UploadOverlay
          light={light}
          childrenList={children}
          onClose={() => setUploadOpen(false)}
          dispatch={dispatch}
        />
      ) : null}
    </div>
  );
}

function FeeOverlay({
  light,
  childrenList,
  onClose,
  dispatch,
}: {
  light: boolean;
  childrenList: { id: string; name: string }[];
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [childId, setChildId] = useState(childrenList[0]?.id ?? "");
  const [term, setTerm] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Wire");
  const [reference, setReference] = useState("");
  return (
    <FamilyOverlay open onClose={onClose} title="Record fee payment" light={light}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FamilyFieldLabel light>Child</FamilyFieldLabel>
          <FamilySelect light value={childId} onChange={(e) => setChildId(e.target.value)}>
            {childrenList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FamilySelect>
        </div>
        <div className="sm:col-span-2">
          <FamilyFieldLabel light>Term / label</FamilyFieldLabel>
          <FamilyInput light value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Term 3 · 2026" />
        </div>
        <div>
          <FamilyFieldLabel light>Paid on</FamilyFieldLabel>
          <FamilyInput light type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Amount (NPR)</FamilyFieldLabel>
          <FamilyInput light inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Method</FamilyFieldLabel>
          <FamilyInput light value={method} onChange={(e) => setMethod(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Reference (optional)</FamilyFieldLabel>
          <FamilyInput light value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <FamilyBtnGhost light={light} onClick={onClose}>
          Cancel
        </FamilyBtnGhost>
        <FamilyBtnPrimary
          light={light}
          onClick={() => {
            if (!childId || !term.trim() || !amount) return;
            dispatch({
              type: "ADD_FEE_PAYMENT",
              row: {
                childId,
                term: term.trim(),
                paidAt,
                amountNpr: Math.max(0, Number(amount) || 0),
                method: method.trim() || "—",
                reference: reference.trim() || undefined,
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

function ExamOverlay({
  light,
  childrenList,
  onClose,
  dispatch,
}: {
  light: boolean;
  childrenList: { id: string; name: string }[];
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [childId, setChildId] = useState(childrenList[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [subject, setSubject] = useState("");
  const [gradeLabel, setGradeLabel] = useState("");
  const [score, setScore] = useState("");
  return (
    <FamilyOverlay open onClose={onClose} title="Add exam result" light={light}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FamilyFieldLabel light>Child</FamilyFieldLabel>
          <FamilySelect light value={childId} onChange={(e) => setChildId(e.target.value)}>
            {childrenList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FamilySelect>
        </div>
        <div className="sm:col-span-2">
          <FamilyFieldLabel light>Exam title</FamilyFieldLabel>
          <FamilyInput light value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Date</FamilyFieldLabel>
          <FamilyInput light type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Subject</FamilyFieldLabel>
          <FamilyInput light value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Grade label</FamilyFieldLabel>
          <FamilyInput light value={gradeLabel} onChange={(e) => setGradeLabel(e.target.value)} placeholder="A, Pass…" />
        </div>
        <div>
          <FamilyFieldLabel light>Score % (optional)</FamilyFieldLabel>
          <FamilyInput light inputMode="numeric" value={score} onChange={(e) => setScore(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <FamilyBtnGhost light={light} onClick={onClose}>
          Cancel
        </FamilyBtnGhost>
        <FamilyBtnPrimary
          light={light}
          onClick={() => {
            if (!childId || !title.trim() || !subject.trim()) return;
            const scorePct = score === "" ? null : Math.min(100, Math.max(0, Number(score)));
            dispatch({
              type: "ADD_EXAM_RESULT",
              row: {
                childId,
                title: title.trim(),
                date,
                subject: subject.trim(),
                gradeLabel: gradeLabel.trim() || "—",
                scorePct: Number.isFinite(scorePct as number) ? (scorePct as number) : null,
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

function ReminderOverlay({
  light,
  childrenList,
  onClose,
  dispatch,
}: {
  light: boolean;
  childrenList: { id: string; name: string }[];
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(new Date().toISOString().slice(0, 10));
  const [childId, setChildId] = useState<string | "">("");
  const [note, setNote] = useState("");
  return (
    <FamilyOverlay open onClose={onClose} title="Document reminder" light={light}>
      <FamilyFieldLabel light>Title</FamilyFieldLabel>
      <FamilyInput light className="mb-3" value={title} onChange={(e) => setTitle(e.target.value)} />
      <FamilyFieldLabel light>Due date</FamilyFieldLabel>
      <FamilyInput light className="mb-3" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      <FamilyFieldLabel light>Child (optional)</FamilyFieldLabel>
      <FamilySelect light className="mb-3" value={childId} onChange={(e) => setChildId(e.target.value)}>
        <option value="">Family</option>
        {childrenList.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </FamilySelect>
      <FamilyFieldLabel light>Note</FamilyFieldLabel>
      <FamilyTextarea light value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="mt-4 flex justify-end gap-2">
        <FamilyBtnGhost light={light} onClick={onClose}>
          Cancel
        </FamilyBtnGhost>
        <FamilyBtnPrimary
          light={light}
          onClick={() => {
            if (!title.trim()) return;
            dispatch({
              type: "ADD_DOCUMENT_REMINDER",
              row: { title: title.trim(), dueDate: due, childId: childId || null, note: note.trim() || undefined },
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

const MAX_BYTES = 80 * 1024 * 1024;

function UploadOverlay({
  light,
  childrenList,
  onClose,
  dispatch,
}: {
  light: boolean;
  childrenList: { id: string; name: string }[];
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<VaultDocumentCategory>("certificate");
  const [childId, setChildId] = useState<string | "">("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSave = async () => {
    setErr(null);
    if (!file || !title.trim()) {
      setErr("Choose a file and title.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr("File too large for this workspace (max ~80 MB).");
      return;
    }
    const id = newFamilyId("vault");
    setLoading(true);
    try {
      await vaultPutBlob(id, file);
      dispatch({
        type: "ADD_VAULT_DOCUMENT",
        doc: {
          title: title.trim(),
          category,
          childId: childId || null,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          byteSize: file.size,
          uploadedAt: new Date().toISOString(),
          notes: notes.trim() || undefined,
          id,
        },
      });
      onClose();
    } catch {
      setErr("Could not store file. Check browser storage permissions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FamilyOverlay open onClose={onClose} title="Upload to vault" description="Original quality preserved in IndexedDB." light={light} wide>
      {err ? <p className="mb-3 text-sm font-bold text-rose-600 dark:text-rose-300">{err}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FamilyFieldLabel light>Title</FamilyFieldLabel>
          <FamilyInput light value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Category</FamilyFieldLabel>
          <FamilySelect light value={category} onChange={(e) => setCategory(e.target.value as VaultDocumentCategory)}>
            {DOC_CATS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </FamilySelect>
        </div>
        <div>
          <FamilyFieldLabel light>Child (optional)</FamilyFieldLabel>
          <FamilySelect light value={childId} onChange={(e) => setChildId(e.target.value)}>
            <option value="">Family</option>
            {childrenList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FamilySelect>
        </div>
        <div className="sm:col-span-2">
          <FamilyFieldLabel light>File</FamilyFieldLabel>
          <input
            type="file"
            className={`block w-full text-sm ${light ? "text-slate-700" : "text-zinc-200"}`}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="sm:col-span-2">
          <FamilyFieldLabel light>Notes</FamilyFieldLabel>
          <FamilyTextarea light value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <FamilyBtnGhost light={light} onClick={onClose} disabled={loading}>
          Cancel
        </FamilyBtnGhost>
        <FamilyBtnPrimary light={light} disabled={loading} onClick={() => void onSave()}>
          {loading ? "Saving…" : "Save"}
        </FamilyBtnPrimary>
      </div>
    </FamilyOverlay>
  );
}
