"use client";

import { LineChart, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFamilyModule } from "@/contexts/FamilyModuleContext";
import type { AiInsight, BehaviorRow, FamilyAlert, RecommendationRow } from "@/lib/family-module/types";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { FamilyBtnGhost, FamilyBtnPrimary } from "@/components/family-module/ui/family-module-buttons";
import { FamilyFieldLabel, FamilyInput, FamilySelect, FamilyTextarea } from "@/components/family-module/ui/FamilyFormFields";
import { FamilyOverlay } from "@/components/family-module/ui/FamilyOverlay";
import { FamilyGlassCard, FamilySectionTitle, familyHeadingClass, familyMutedText } from "./FamilyUiPrimitives";

export function ParentingAiDashboard() {
  const { state, dispatch } = useFamilyModule();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { parentingNotes, parentingInsights, familyAlerts, behaviorInsights, smartRecommendations } = state;

  const [noteModal, setNoteModal] = useState<{ mode: "add" } | { mode: "edit"; id: string; title: string; body: string } | null>(null);
  const [insightModal, setInsightModal] = useState<{ mode: "add" } | { mode: "edit"; insight: AiInsight } | null>(null);
  const [alertModal, setAlertModal] = useState<{ mode: "add" } | { mode: "edit"; alert: FamilyAlert } | null>(null);
  const [behaviorModal, setBehaviorModal] = useState<{ mode: "add" } | { mode: "edit"; row: BehaviorRow } | null>(null);
  const [recModal, setRecModal] = useState<{ mode: "add" } | { mode: "edit"; row: RecommendationRow } | null>(null);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 sm:mb-8">
        <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${light ? "text-emerald-700/80" : "text-emerald-400/70"}`}>Parenting AI</p>
        <h1 className={`mt-1 text-2xl font-black tracking-tight sm:text-3xl ${familyHeadingClass(light)}`}>Signals without noise</h1>
        <p className={`mt-2 max-w-2xl text-sm sm:text-base ${familyMutedText(light)}`}>
          Editable notes, AI cards, alerts, behavior lines, and recommendations — stored in local family state.
        </p>
      </div>

      <div className="mb-6">
        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Journal"
            title="Parenting notes"
            subtitle="Capture observations and agreements — full CRUD."
            action={
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setNoteModal({ mode: "add" })}>
                <Plus size={14} /> Add note
              </FamilyBtnPrimary>
            }
          />
          <ul className="space-y-3">
            {parentingNotes.map((n) => (
              <li
                key={n.id}
                className={`flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-start sm:justify-between ${
                  light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <div className="min-w-0">
                  <p className={`font-black ${familyHeadingClass(light)}`}>{n.title}</p>
                  <p className={`mt-1 text-sm ${familyMutedText(light)}`}>{n.body}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => setNoteModal({ mode: "edit", id: n.id, title: n.title, body: n.body })}>
                    <Pencil size={14} /> Edit
                  </FamilyBtnGhost>
                  <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => dispatch({ type: "DELETE_PARENTING_NOTE", id: n.id })}>
                    <Trash2 size={14} /> Delete
                  </FamilyBtnGhost>
                </div>
              </li>
            ))}
          </ul>
        </FamilyGlassCard>
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6">
        <FamilyGlassCard light={light} className="lg:col-span-2" padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Copilot"
            title="AI recommendation cards"
            subtitle="Add, edit tone, or remove insight cards."
            action={
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setInsightModal({ mode: "add" })}>
                <Plus size={14} /> Add card
              </FamilyBtnPrimary>
            }
          />
          <div className="grid gap-4 md:grid-cols-3">
            {parentingInsights.map((ins) => (
              <div
                key={ins.id}
                className={`flex flex-col rounded-2xl border p-5 transition duration-300 hover:-translate-y-1 ${
                  ins.tone === "positive"
                    ? light
                      ? "border-emerald-200/80 bg-emerald-50/90"
                      : "border-emerald-400/25 bg-emerald-500/[0.08]"
                    : ins.tone === "watch"
                      ? light
                        ? "border-amber-200/80 bg-amber-50/80"
                        : "border-amber-400/25 bg-amber-500/[0.07]"
                      : light
                        ? "border-slate-200/80 bg-white"
                        : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <Sparkles size={18} className={ins.tone === "watch" ? "text-amber-500" : "text-emerald-400"} />
                <p className={`mt-3 text-sm font-black leading-snug ${familyHeadingClass(light)}`}>{ins.title}</p>
                <p className={`mt-2 flex-1 text-xs leading-relaxed ${familyMutedText(light)}`}>{ins.body}</p>
                <div className="mt-3 flex gap-2">
                  <FamilyBtnGhost light={light} className="h-9 flex-1 text-[11px]" onClick={() => setInsightModal({ mode: "edit", insight: ins })}>
                    Edit
                  </FamilyBtnGhost>
                  <FamilyBtnGhost light={light} className="h-9 flex-1 text-[11px]" onClick={() => dispatch({ type: "DELETE_PARENTING_INSIGHT", id: ins.id })}>
                    Delete
                  </FamilyBtnGhost>
                </div>
              </div>
            ))}
          </div>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Treasury"
            title="Family alerts"
            subtitle="FX and envelope signals."
            action={
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setAlertModal({ mode: "add" })}>
                <Plus size={14} /> Add
              </FamilyBtnPrimary>
            }
          />
          <ul className="space-y-3">
            {familyAlerts.map((a) => (
              <li
                key={a.id}
                className={`rounded-xl border px-4 py-3 ${light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"}`}
              >
                <p className={`font-bold ${familyHeadingClass(light)}`}>{a.title}</p>
                <p className={`mt-1 text-xs ${familyMutedText(light)}`}>{a.detail}</p>
                <div className="mt-2 flex gap-2">
                  <FamilyBtnGhost light={light} className="h-8 px-2 text-[11px]" onClick={() => setAlertModal({ mode: "edit", alert: a })}>
                    Edit
                  </FamilyBtnGhost>
                  <FamilyBtnGhost light={light} className="h-8 px-2 text-[11px]" onClick={() => dispatch({ type: "DELETE_FAMILY_ALERT", id: a.id })}>
                    Delete
                  </FamilyBtnGhost>
                </div>
              </li>
            ))}
          </ul>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Coaching"
            title="Child behavior insights"
            subtitle="Editable coaching lines."
            action={
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setBehaviorModal({ mode: "add" })}>
                <Plus size={14} /> Add
              </FamilyBtnPrimary>
            }
          />
          <ul className="space-y-3">
            {behaviorInsights.map((b) => (
              <li
                key={b.id}
                className={`rounded-xl border px-4 py-3 ${light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"}`}
              >
                <p className={`text-[11px] font-black uppercase tracking-wide ${light ? "text-emerald-800" : "text-emerald-300/90"}`}>{b.child}</p>
                <p className={`mt-1 text-sm font-semibold ${familyHeadingClass(light)}`}>{b.text}</p>
                <div className="mt-2 flex gap-2">
                  <FamilyBtnGhost light={light} className="h-8 px-2 text-[11px]" onClick={() => setBehaviorModal({ mode: "edit", row: b })}>
                    Edit
                  </FamilyBtnGhost>
                  <FamilyBtnGhost light={light} className="h-8 px-2 text-[11px]" onClick={() => dispatch({ type: "DELETE_BEHAVIOR", id: b.id })}>
                    Delete
                  </FamilyBtnGhost>
                </div>
              </li>
            ))}
          </ul>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} className="lg:col-span-2" padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Forecast"
            title="Education spending predictions"
            subtitle="Scenario deck (static copy) + editable playbook below."
            action={<LineChart size={18} className={light ? "text-emerald-700" : "text-emerald-400"} />}
          />
          <div
            className={`grid gap-4 rounded-2xl border p-5 sm:grid-cols-3 ${
              light ? "border-emerald-100/90 bg-gradient-to-br from-emerald-50/90 to-white" : "border-emerald-400/20 bg-emerald-500/[0.06]"
            }`}
          >
            <div>
              <p className={`text-[10px] font-black uppercase tracking-wide ${familyMutedText(light)}`}>Next 90 days</p>
              <p className={`mt-2 text-2xl font-black ${familyHeadingClass(light)}`}>+4.2%</p>
              <p className={`mt-1 text-xs ${familyMutedText(light)}`}>Expected NPR outflow vs prior quarter (when tracked).</p>
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-wide ${familyMutedText(light)}`}>Confidence</p>
              <p className={`mt-2 text-2xl font-black ${familyHeadingClass(light)}`}>Medium</p>
              <p className={`mt-1 text-xs ${familyMutedText(light)}`}>More history tightens the band.</p>
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-wide ${familyMutedText(light)}`}>Stress test</p>
              <p className={`mt-2 text-2xl font-black ${familyHeadingClass(light)}`}>−8%</p>
              <p className={`mt-1 text-xs ${familyMutedText(light)}`}>If KRW weakens vs NPR basket (scenario).</p>
            </div>
          </div>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} className="lg:col-span-2" padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Playbook"
            title="Smart recommendations"
            subtitle="Ordered nudges — edit text or add new lines."
            action={
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setRecModal({ mode: "add" })}>
                <Plus size={14} /> Add
              </FamilyBtnPrimary>
            }
          />
          <ol className="space-y-3">
            {smartRecommendations.map((rec, idx) => (
              <li
                key={rec.id}
                className={`flex gap-3 rounded-xl border px-4 py-3 ${light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"}`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-black ${
                    light ? "bg-emerald-600 text-white" : "bg-emerald-500/25 text-emerald-100"
                  }`}
                >
                  {idx + 1}
                </span>
                <p className={`min-w-0 flex-1 text-sm font-semibold leading-relaxed ${familyHeadingClass(light)}`}>{rec.text}</p>
                <div className="flex shrink-0 flex-col gap-2">
                  <FamilyBtnGhost light={light} className="h-8 px-2 text-[11px]" onClick={() => setRecModal({ mode: "edit", row: rec })}>
                    Edit
                  </FamilyBtnGhost>
                  <FamilyBtnGhost light={light} className="h-8 px-2 text-[11px]" onClick={() => dispatch({ type: "DELETE_RECOMMENDATION", id: rec.id })}>
                    Delete
                  </FamilyBtnGhost>
                </div>
              </li>
            ))}
          </ol>
        </FamilyGlassCard>
      </div>

      {noteModal ? <NoteOverlay light={light} modal={noteModal} onClose={() => setNoteModal(null)} dispatch={dispatch} /> : null}
      {insightModal ? <InsightOverlay light={light} modal={insightModal} onClose={() => setInsightModal(null)} dispatch={dispatch} /> : null}
      {alertModal ? <AlertOverlay light={light} modal={alertModal} onClose={() => setAlertModal(null)} dispatch={dispatch} /> : null}
      {behaviorModal ? <BehaviorOverlay light={light} modal={behaviorModal} onClose={() => setBehaviorModal(null)} dispatch={dispatch} childNames={state.children.map((c) => c.name)} /> : null}
      {recModal ? <RecOverlay light={light} modal={recModal} onClose={() => setRecModal(null)} dispatch={dispatch} /> : null}
    </div>
  );
}

function NoteOverlay({
  light,
  modal,
  onClose,
  dispatch,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; id: string; title: string; body: string };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [title, setTitle] = useState(modal.mode === "edit" ? modal.title : "");
  const [body, setBody] = useState(modal.mode === "edit" ? modal.body : "");
  const onSave = () => {
    if (!title.trim()) return;
    if (modal.mode === "add") dispatch({ type: "ADD_PARENTING_NOTE", note: { title: title.trim(), body: body.trim() } });
    else dispatch({ type: "UPDATE_PARENTING_NOTE", id: modal.id, patch: { title: title.trim(), body: body.trim() } });
    onClose();
  };
  return (
    <FamilyOverlay open onClose={onClose} title={modal.mode === "add" ? "Add parenting note" : "Edit note"} light={light}>
      <FamilyFieldLabel light>Title</FamilyFieldLabel>
      <FamilyInput light className="mb-3" value={title} onChange={(e) => setTitle(e.target.value)} />
      <FamilyFieldLabel light>Body</FamilyFieldLabel>
      <FamilyTextarea light value={body} onChange={(e) => setBody(e.target.value)} />
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

function InsightOverlay({
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
    if (modal.mode === "add") dispatch({ type: "ADD_PARENTING_INSIGHT", insight: { title: title.trim(), body: body.trim(), tone } });
    else dispatch({ type: "UPDATE_PARENTING_INSIGHT", id: modal.insight.id, patch: { title: title.trim(), body: body.trim(), tone } });
    onClose();
  };
  return (
    <FamilyOverlay open onClose={onClose} title={modal.mode === "add" ? "Add AI card" : "Edit AI card"} light={light}>
      <div className="space-y-3">
        <div>
          <FamilyFieldLabel light>Title</FamilyFieldLabel>
          <FamilyInput light value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Body</FamilyFieldLabel>
          <FamilyTextarea light value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Tone</FamilyFieldLabel>
          <FamilySelect light value={tone} onChange={(e) => setTone(e.target.value as AiInsight["tone"])}>
            <option value="positive">Positive</option>
            <option value="watch">Watch</option>
            <option value="neutral">Neutral</option>
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

function AlertOverlay({
  light,
  modal,
  onClose,
  dispatch,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; alert: FamilyAlert };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const a = modal.mode === "edit" ? modal.alert : null;
  const [title, setTitle] = useState(a?.title ?? "");
  const [detail, setDetail] = useState(a?.detail ?? "");
  const onSave = () => {
    if (!title.trim()) return;
    if (modal.mode === "add") dispatch({ type: "ADD_FAMILY_ALERT", alert: { title: title.trim(), detail: detail.trim() } });
    else dispatch({ type: "UPDATE_FAMILY_ALERT", id: modal.alert.id, patch: { title: title.trim(), detail: detail.trim() } });
    onClose();
  };
  return (
    <FamilyOverlay open onClose={onClose} title={modal.mode === "add" ? "Add alert" : "Edit alert"} light={light}>
      <FamilyFieldLabel light>Title</FamilyFieldLabel>
      <FamilyInput light className="mb-3" value={title} onChange={(e) => setTitle(e.target.value)} />
      <FamilyFieldLabel light>Detail</FamilyFieldLabel>
      <FamilyTextarea light value={detail} onChange={(e) => setDetail(e.target.value)} />
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

function BehaviorOverlay({
  light,
  modal,
  onClose,
  dispatch,
  childNames,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; row: BehaviorRow };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
  childNames: string[];
}) {
  const r = modal.mode === "edit" ? modal.row : null;
  const [child, setChild] = useState(r?.child ?? childNames[0] ?? "");
  const [text, setText] = useState(r?.text ?? "");
  const onSave = () => {
    if (!text.trim()) return;
    if (modal.mode === "add") dispatch({ type: "ADD_BEHAVIOR", row: { child: child.trim() || "—", text: text.trim() } });
    else dispatch({ type: "UPDATE_BEHAVIOR", id: modal.row.id, patch: { child: child.trim(), text: text.trim() } });
    onClose();
  };
  return (
    <FamilyOverlay open onClose={onClose} title={modal.mode === "add" ? "Add behavior insight" : "Edit behavior insight"} light={light}>
      <FamilyFieldLabel light>Child</FamilyFieldLabel>
      <FamilyInput light className="mb-3" value={child} onChange={(e) => setChild(e.target.value)} list="bh-children" />
      <datalist id="bh-children">
        {childNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <FamilyFieldLabel light>Insight</FamilyFieldLabel>
      <FamilyTextarea light value={text} onChange={(e) => setText(e.target.value)} />
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

function RecOverlay({
  light,
  modal,
  onClose,
  dispatch,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; row: RecommendationRow };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [text, setText] = useState(modal.mode === "edit" ? modal.row.text : "");
  const onSave = () => {
    if (!text.trim()) return;
    if (modal.mode === "add") dispatch({ type: "ADD_RECOMMENDATION", row: { text: text.trim() } });
    else dispatch({ type: "UPDATE_RECOMMENDATION", id: modal.row.id, patch: { text: text.trim() } });
    onClose();
  };
  return (
    <FamilyOverlay open onClose={onClose} title={modal.mode === "add" ? "Add recommendation" : "Edit recommendation"} light={light}>
      <FamilyFieldLabel light>Recommendation</FamilyFieldLabel>
      <FamilyTextarea light value={text} onChange={(e) => setText(e.target.value)} />
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
