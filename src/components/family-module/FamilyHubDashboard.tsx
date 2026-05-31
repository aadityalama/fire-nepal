"use client";

import { ArrowRight, CalendarDays, Pencil, Phone, Plus, Shield, Sparkles, Target, Trash2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useFamilyModule } from "@/contexts/FamilyModuleContext";
import type { AiInsight, EmergencyContact, FamilyBill, FamilyGoal } from "@/lib/family-module/types";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { FamilyBtnGhost, FamilyBtnPrimary } from "@/components/family-module/ui/family-module-buttons";
import { FamilyFieldLabel, FamilyInput, FamilySelect, FamilyTextarea } from "@/components/family-module/ui/FamilyFormFields";
import { FamilyOverlay } from "@/components/family-module/ui/FamilyOverlay";
import { FamilyGlassCard, FamilySectionTitle, familyHeadingClass, familyMutedText } from "./FamilyUiPrimitives";

function formatNpr(n: number): string {
  return new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(n);
}

export function FamilyHubDashboard() {
  const { state, dispatch } = useFamilyModule();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const {
    stabilityScore,
    upcomingBills,
    familyGoals,
    emergencyContacts,
    hubInsights,
    children,
    calendarEvents,
  } = state;

  const previewEvents = useMemo(
    () => [...calendarEvents].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
    [calendarEvents],
  );

  const [scoreOpen, setScoreOpen] = useState(false);
  const [billModal, setBillModal] = useState<{ bill: FamilyBill } | null>(null);
  const [goalModal, setGoalModal] = useState<{ goal: FamilyGoal } | null>(null);
  const [insightModal, setInsightModal] = useState<{ mode: "add" } | { mode: "edit"; insight: AiInsight } | null>(null);
  const [contactModal, setContactModal] = useState<{ mode: "add" } | { mode: "edit"; contact: EmergencyContact } | null>(null);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${light ? "text-emerald-700/80" : "text-emerald-400/70"}`}>
            Family hub
          </p>
          <h1 className={`mt-1 text-2xl font-black tracking-tight sm:text-3xl ${familyHeadingClass(light)}`}>Stability, calendar, and goals</h1>
          <p className={`mt-2 max-w-2xl text-sm sm:text-base ${familyMutedText(light)}`}>
            Live data from your family workspace — edit scores, bills, goals, insights, and contacts below.
          </p>
        </div>
        <Link
          href="/parenting-ai"
          className={`inline-flex items-center gap-2 self-start rounded-full border px-4 py-2.5 text-xs font-black transition duration-300 hover:gap-2.5 sm:text-sm ${
            light
              ? "border-emerald-200/90 bg-white/95 text-emerald-900 shadow-sm hover:bg-emerald-50"
              : "border-emerald-400/25 bg-white/[0.06] text-emerald-50 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.45)] hover:bg-white/10"
          }`}
        >
          Open Parenting AI <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-12 lg:gap-6">
        <FamilyGlassCard light={light} className="lg:col-span-5" padding="lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`text-xs font-bold uppercase tracking-wide ${light ? "text-emerald-800" : "text-emerald-300/90"}`}>
                Family stability score
              </p>
              <p className={`mt-2 text-4xl font-black tabular-nums sm:text-5xl ${familyHeadingClass(light)}`}>{stabilityScore}</p>
              <p className={`mt-2 text-sm ${familyMutedText(light)}`}>Composite of cash buffer, schedule load, and education runway.</p>
            </div>
            <div
              className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl border ${
                light ? "border-emerald-200/80 bg-emerald-50/90 text-emerald-800" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              <Shield size={28} />
            </div>
          </div>
          <div className={`mt-6 h-2.5 overflow-hidden rounded-full ${light ? "bg-emerald-100" : "bg-white/10"}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 shadow-[0_0_20px_rgba(52,211,153,0.45)] transition-all duration-700"
              style={{ width: `${stabilityScore}%` }}
            />
          </div>
          <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold ${familyMutedText(light)}`}>
            <TrendingUp size={14} className="text-emerald-400" />
            +4 pts vs last month (demo)
            <FamilyBtnGhost light={light} className="ml-auto min-h-[32px] px-2 py-1 text-[10px]" onClick={() => setScoreOpen(true)}>
              <Pencil size={12} /> Edit score
            </FamilyBtnGhost>
          </div>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} className="lg:col-span-7" padding="lg">
          <FamilySectionTitle light={light} eyebrow="Cashflow" title="Upcoming bills" subtitle="Tap Edit to adjust amounts or due offsets." />
          <ul className={light ? "divide-y divide-emerald-100" : "divide-y divide-emerald-500/10"}>
            {upcomingBills.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                <div className="min-w-0">
                  <p className={`font-bold ${familyHeadingClass(light)}`}>{b.label}</p>
                  <p className={`text-xs ${familyMutedText(light)}`}>
                    {b.category} · due in {b.dueInDays}d
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`text-sm font-black tabular-nums ${light ? "text-emerald-800" : "text-emerald-200"}`}>
                    NPR {formatNpr(b.amountNpr)}
                  </span>
                  <FamilyBtnGhost light={light} className="h-8 px-2 text-[10px]" onClick={() => setBillModal({ bill: b })}>
                    Edit
                  </FamilyBtnGhost>
                </div>
              </li>
            ))}
          </ul>
        </FamilyGlassCard>

        <div className="lg:col-span-12">
          <FamilySectionTitle light={light} eyebrow="Household" title="Children overview" subtitle="Synced from Children — manage on /children." />
          <div className="grid gap-4 sm:grid-cols-2">
            {children.map((c) => (
              <FamilyGlassCard key={c.id} light={light} padding="md">
                <div className="flex items-center gap-4">
                  <div
                    className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-lg font-black text-emerald-950 shadow-lg ${c.avatarHue}`}
                  >
                    {c.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-base font-black ${familyHeadingClass(light)}`}>{c.name}</p>
                    <p className={`text-xs ${familyMutedText(light)}`}>
                      Age {c.age} · {c.grade} · {c.school}
                    </p>
                    <p className={`mt-1 text-xs font-semibold ${light ? "text-emerald-800" : "text-emerald-300/90"}`}>Mood: {c.mood}</p>
                  </div>
                  <Link
                    href="/children"
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-black transition ${
                      light ? "border-emerald-200/80 hover:bg-emerald-50" : "border-emerald-400/25 hover:bg-white/10"
                    }`}
                  >
                    View
                  </Link>
                </div>
              </FamilyGlassCard>
            ))}
          </div>
        </div>

        <FamilyGlassCard light={light} className="lg:col-span-6" padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Schedule"
            title="Shared calendar"
            subtitle="Next five events from your calendar module."
            action={
              <Link
                href="/family-calendar"
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                  light ? "bg-emerald-600 text-white hover:brightness-105" : "bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
                }`}
              >
                Full calendar <CalendarDays size={14} />
              </Link>
            }
          />
          <ul className="space-y-3">
            {previewEvents.map((e) => (
              <li
                key={e.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition duration-300 hover:-translate-y-0.5 ${
                  light ? "border-emerald-100/90 bg-emerald-50/50" : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <span className={`font-bold ${familyHeadingClass(light)}`}>{e.title}</span>
                <span className={`shrink-0 text-xs font-black uppercase tracking-wide ${familyMutedText(light)}`}>{e.date}</span>
              </li>
            ))}
          </ul>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} className="lg:col-span-6" padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Signals"
            title="AI insight cards"
            subtitle="Hub-level nudges — add or edit cards."
            action={
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setInsightModal({ mode: "add" })}>
                <Plus size={14} /> Add
              </FamilyBtnPrimary>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {hubInsights.map((ins) => (
              <div
                key={ins.id}
                className={`rounded-xl border p-4 transition duration-300 hover:-translate-y-0.5 ${
                  ins.tone === "positive"
                    ? light
                      ? "border-emerald-200/80 bg-emerald-50/80"
                      : "border-emerald-400/25 bg-emerald-500/[0.08]"
                    : ins.tone === "watch"
                      ? light
                        ? "border-amber-200/80 bg-amber-50/70"
                        : "border-amber-400/25 bg-amber-500/[0.07]"
                      : light
                        ? "border-slate-200/80 bg-white"
                        : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className={ins.tone === "watch" ? "text-amber-500" : "text-emerald-400"} />
                  <p className={`text-sm font-black ${familyHeadingClass(light)}`}>{ins.title}</p>
                </div>
                <p className={`mt-2 text-xs leading-relaxed ${familyMutedText(light)}`}>{ins.body}</p>
                <div className="mt-3 flex gap-2">
                  <FamilyBtnGhost light={light} className="h-8 flex-1 text-[11px]" onClick={() => setInsightModal({ mode: "edit", insight: ins })}>
                    Edit
                  </FamilyBtnGhost>
                  <FamilyBtnGhost light={light} className="h-8 flex-1 text-[11px]" onClick={() => dispatch({ type: "DELETE_HUB_INSIGHT", id: ins.id })}>
                    Delete
                  </FamilyBtnGhost>
                </div>
              </div>
            ))}
          </div>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} className="lg:col-span-6" padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Safety"
            title="Emergency contacts"
            subtitle="Physician, kin, building."
            action={
              <div className="flex gap-2">
                <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setContactModal({ mode: "add" })}>
                  <Plus size={14} /> Add
                </FamilyBtnPrimary>
                <Phone size={18} className={light ? "text-emerald-700" : "text-emerald-400"} aria-hidden />
              </div>
            }
          />
          <ul className="space-y-3">
            {emergencyContacts.map((x) => (
              <li
                key={x.id}
                className={`rounded-xl border px-4 py-3 transition duration-300 hover:border-emerald-400/35 ${
                  light ? "border-emerald-100/90 bg-white/80" : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <p className={`font-bold ${familyHeadingClass(light)}`}>{x.name}</p>
                <p className={`text-xs ${familyMutedText(light)}`}>
                  {x.relation} · {x.phone}
                </p>
                {x.note ? <p className={`mt-1 text-xs ${familyMutedText(light)}`}>{x.note}</p> : null}
                <div className="mt-2 flex gap-2">
                  <FamilyBtnGhost light={light} className="h-8 px-2 text-[11px]" onClick={() => setContactModal({ mode: "edit", contact: x })}>
                    Edit
                  </FamilyBtnGhost>
                  <FamilyBtnGhost light={light} className="h-8 px-2 text-[11px]" onClick={() => dispatch({ type: "DELETE_CONTACT", id: x.id })}>
                    <Trash2 size={12} /> Delete
                  </FamilyBtnGhost>
                </div>
              </li>
            ))}
          </ul>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} className="lg:col-span-6" padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="North star"
            title="Family goals"
            subtitle="Edit progress rings."
            action={<Target size={18} className={light ? "text-emerald-700" : "text-emerald-400"} aria-hidden />}
          />
          <div className="space-y-5">
            {familyGoals.map((g) => (
              <div key={g.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm font-black ${familyHeadingClass(light)}`}>{g.title}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black tabular-nums ${light ? "text-emerald-800" : "text-emerald-200"}`}>{g.pct}%</span>
                    <FamilyBtnGhost light={light} className="h-8 px-2 text-[10px]" onClick={() => setGoalModal({ goal: g })}>
                      Edit
                    </FamilyBtnGhost>
                  </div>
                </div>
                <div className={`mt-2 h-2 overflow-hidden rounded-full ${light ? "bg-emerald-100" : "bg-white/10"}`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all duration-700"
                    style={{ width: `${g.pct}%` }}
                  />
                </div>
                <p className={`mt-1.5 text-xs ${familyMutedText(light)}`}>
                  NPR {formatNpr(g.savedNpr)} / {formatNpr(g.targetNpr)}
                </p>
              </div>
            ))}
          </div>
        </FamilyGlassCard>
      </div>

      {scoreOpen ? <ScoreOverlay light={light} score={stabilityScore} onClose={() => setScoreOpen(false)} dispatch={dispatch} /> : null}
      {billModal ? <HubBillOverlay light={light} bill={billModal.bill} onClose={() => setBillModal(null)} dispatch={dispatch} /> : null}
      {goalModal ? <HubGoalOverlay light={light} goal={goalModal.goal} onClose={() => setGoalModal(null)} dispatch={dispatch} /> : null}
      {insightModal ? <HubInsightOverlay light={light} modal={insightModal} onClose={() => setInsightModal(null)} dispatch={dispatch} /> : null}
      {contactModal ? <HubContactOverlay light={light} modal={contactModal} onClose={() => setContactModal(null)} dispatch={dispatch} /> : null}
    </div>
  );
}

function ScoreOverlay({
  light,
  score,
  onClose,
  dispatch,
}: {
  light: boolean;
  score: number;
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [v, setV] = useState(String(score));
  return (
    <FamilyOverlay open onClose={onClose} title="Stability score" light={light}>
      <FamilyFieldLabel light>Score (0–100)</FamilyFieldLabel>
      <FamilyInput light inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)} />
      <div className="mt-4 flex justify-end gap-2">
        <FamilyBtnGhost light={light} onClick={onClose}>
          Cancel
        </FamilyBtnGhost>
        <FamilyBtnPrimary
          light={light}
          onClick={() => {
            dispatch({ type: "SET_STABILITY_SCORE", score: Number(v) || 0 });
            onClose();
          }}
        >
          Save
        </FamilyBtnPrimary>
      </div>
    </FamilyOverlay>
  );
}

function HubBillOverlay({
  light,
  bill,
  onClose,
  dispatch,
}: {
  light: boolean;
  bill: FamilyBill;
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [label, setLabel] = useState(bill.label);
  const [amount, setAmount] = useState(String(bill.amountNpr));
  const [due, setDue] = useState(String(bill.dueInDays));
  const [cat, setCat] = useState(bill.category);
  return (
    <FamilyOverlay open onClose={onClose} title="Edit bill" light={light}>
      <div className="space-y-3">
        <FamilyFieldLabel light>Label</FamilyFieldLabel>
        <FamilyInput light value={label} onChange={(e) => setLabel(e.target.value)} />
        <FamilyFieldLabel light>Amount (NPR)</FamilyFieldLabel>
        <FamilyInput light inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <FamilyFieldLabel light>Due in (days)</FamilyFieldLabel>
        <FamilyInput light inputMode="numeric" value={due} onChange={(e) => setDue(e.target.value)} />
        <FamilyFieldLabel light>Category</FamilyFieldLabel>
        <FamilyInput light value={cat} onChange={(e) => setCat(e.target.value)} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <FamilyBtnGhost light={light} onClick={onClose}>
          Cancel
        </FamilyBtnGhost>
        <FamilyBtnPrimary
          light={light}
          onClick={() => {
            dispatch({
              type: "UPDATE_BILL",
              id: bill.id,
              patch: {
                label: label.trim(),
                amountNpr: Math.max(0, Number(amount) || 0),
                dueInDays: Math.floor(Number(due) || 0),
                category: cat.trim(),
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

function HubGoalOverlay({
  light,
  goal,
  onClose,
  dispatch,
}: {
  light: boolean;
  goal: FamilyGoal;
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [title, setTitle] = useState(goal.title);
  const [pct, setPct] = useState(String(goal.pct));
  const [saved, setSaved] = useState(String(goal.savedNpr));
  const [target, setTarget] = useState(String(goal.targetNpr));
  return (
    <FamilyOverlay open onClose={onClose} title="Edit goal" light={light}>
      <div className="space-y-3">
        <FamilyFieldLabel light>Title</FamilyFieldLabel>
        <FamilyInput light value={title} onChange={(e) => setTitle(e.target.value)} />
        <FamilyFieldLabel light>Progress %</FamilyFieldLabel>
        <FamilyInput light inputMode="numeric" value={pct} onChange={(e) => setPct(e.target.value)} />
        <FamilyFieldLabel light>Saved (NPR)</FamilyFieldLabel>
        <FamilyInput light inputMode="numeric" value={saved} onChange={(e) => setSaved(e.target.value)} />
        <FamilyFieldLabel light>Target (NPR)</FamilyFieldLabel>
        <FamilyInput light inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <FamilyBtnGhost light={light} onClick={onClose}>
          Cancel
        </FamilyBtnGhost>
        <FamilyBtnPrimary
          light={light}
          onClick={() => {
            dispatch({
              type: "UPDATE_GOAL",
              id: goal.id,
              patch: {
                title: title.trim(),
                pct: Math.min(100, Math.max(0, Number(pct) || 0)),
                savedNpr: Math.max(0, Number(saved) || 0),
                targetNpr: Math.max(0, Number(target) || 0),
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

function HubInsightOverlay({
  light,
  modal,
  onClose,
  dispatch,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; insight: AiInsight };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const ins = modal.mode === "edit" ? modal.insight : null;
  const [title, setTitle] = useState(ins?.title ?? "");
  const [body, setBody] = useState(ins?.body ?? "");
  const [tone, setTone] = useState<AiInsight["tone"]>(ins?.tone ?? "neutral");
  const onSave = () => {
    if (!title.trim()) return;
    if (modal.mode === "add") dispatch({ type: "ADD_HUB_INSIGHT", insight: { title: title.trim(), body: body.trim(), tone } });
    else dispatch({ type: "UPDATE_HUB_INSIGHT", id: modal.insight.id, patch: { title: title.trim(), body: body.trim(), tone } });
    onClose();
  };
  return (
    <FamilyOverlay open onClose={onClose} title={modal.mode === "add" ? "Add insight" : "Edit insight"} light={light}>
      <div className="space-y-3">
        <FamilyFieldLabel light>Title</FamilyFieldLabel>
        <FamilyInput light value={title} onChange={(e) => setTitle(e.target.value)} />
        <FamilyFieldLabel light>Body</FamilyFieldLabel>
        <FamilyTextarea light value={body} onChange={(e) => setBody(e.target.value)} />
        <FamilyFieldLabel light>Tone</FamilyFieldLabel>
        <FamilySelect light value={tone} onChange={(e) => setTone(e.target.value as AiInsight["tone"])}>
          <option value="positive">Positive</option>
          <option value="watch">Watch</option>
          <option value="neutral">Neutral</option>
        </FamilySelect>
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

function HubContactOverlay({
  light,
  modal,
  onClose,
  dispatch,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; contact: EmergencyContact };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const c = modal.mode === "edit" ? modal.contact : null;
  const [name, setName] = useState(c?.name ?? "");
  const [relation, setRelation] = useState(c?.relation ?? "");
  const [phone, setPhone] = useState(c?.phone ?? "");
  const [note, setNote] = useState(c?.note ?? "");
  const onSave = () => {
    if (!name.trim()) return;
    const row = { name: name.trim(), relation: relation.trim(), phone: phone.trim(), note: note.trim() || undefined };
    if (modal.mode === "add") dispatch({ type: "ADD_CONTACT", contact: row });
    else dispatch({ type: "UPDATE_CONTACT", id: modal.contact.id, patch: row });
    onClose();
  };
  return (
    <FamilyOverlay open onClose={onClose} title={modal.mode === "add" ? "Add contact" : "Edit contact"} light={light}>
      <div className="space-y-3">
        <FamilyFieldLabel light>Name</FamilyFieldLabel>
        <FamilyInput light value={name} onChange={(e) => setName(e.target.value)} />
        <FamilyFieldLabel light>Relation</FamilyFieldLabel>
        <FamilyInput light value={relation} onChange={(e) => setRelation(e.target.value)} />
        <FamilyFieldLabel light>Phone</FamilyFieldLabel>
        <FamilyInput light value={phone} onChange={(e) => setPhone(e.target.value)} />
        <FamilyFieldLabel light>Note (optional)</FamilyFieldLabel>
        <FamilyInput light value={note} onChange={(e) => setNote(e.target.value)} />
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
