"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFamilyModule } from "@/contexts/FamilyModuleContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { FamilyBtnGhost, FamilyBtnPrimary } from "@/components/family-module/ui/family-module-buttons";
import { FamilyFieldLabel, FamilyInput, FamilyTextarea } from "@/components/family-module/ui/FamilyFormFields";
import { FamilyOverlay } from "@/components/family-module/ui/FamilyOverlay";
import { FamilyGlassCard, FamilySectionTitle, familyHeadingClass, familyMutedText } from "./FamilyUiPrimitives";
import type { InsuranceRow, MedicineReminder, VaccinationRow } from "@/lib/family-module/types";

function formatNpr(n: number): string {
  return new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(n);
}

export function HealthDashboard() {
  const { state, dispatch } = useFamilyModule();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { medicineReminders, insurance, vaccinations, emergencyMedical } = state;

  const [medModal, setMedModal] = useState<{ mode: "add" } | { mode: "edit"; row: MedicineReminder } | null>(null);
  const [insModal, setInsModal] = useState<{ mode: "add" } | { mode: "edit"; row: InsuranceRow } | null>(null);
  const [vacModal, setVacModal] = useState<{ mode: "add" } | { mode: "edit"; row: VaccinationRow } | null>(null);
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 sm:mb-8">
        <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${light ? "text-emerald-700/80" : "text-emerald-400/70"}`}>Health</p>
        <h1 className={`mt-1 text-2xl font-black tracking-tight sm:text-3xl ${familyHeadingClass(light)}`}>Medicine, cover, and safety net</h1>
        <p className={`mt-2 max-w-2xl text-sm sm:text-base ${familyMutedText(light)}`}>
          Create medicine reminders, update insurance and vaccinations, and edit emergency medical info.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6">
        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Daily"
            title="Medicine reminders"
            subtitle="Add, edit, or delete reminders."
            action={
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setMedModal({ mode: "add" })}>
                <Plus size={14} /> Add
              </FamilyBtnPrimary>
            }
          />
          <ul className="space-y-3">
            {medicineReminders.map((m) => (
              <li
                key={m.id}
                className={`flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                  light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <div>
                  <p className={`font-bold ${familyHeadingClass(light)}`}>{m.name}</p>
                  <p className={`text-xs ${familyMutedText(light)}`}>
                    {m.schedule} · {m.child}
                  </p>
                </div>
                <div className="flex gap-2">
                  <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => setMedModal({ mode: "edit", row: m })}>
                    <Pencil size={14} /> Edit
                  </FamilyBtnGhost>
                  <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => dispatch({ type: "DELETE_MEDICINE", id: m.id })}>
                    <Trash2 size={14} /> Delete
                  </FamilyBtnGhost>
                </div>
              </li>
            ))}
          </ul>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Coverage"
            title="Insurance tracker"
            subtitle="Renewal radar — NPR premiums."
            action={
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setInsModal({ mode: "add" })}>
                <Plus size={14} /> Add
              </FamilyBtnPrimary>
            }
          />
          <ul className="space-y-3">
            {insurance.map((i) => (
              <li
                key={i.id}
                className={`flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                  light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <div>
                  <p className={`font-bold ${familyHeadingClass(light)}`}>{i.label}</p>
                  <p className={`text-xs ${familyMutedText(light)}`}>Renews {i.renews}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-sm font-black tabular-nums ${light ? "text-emerald-800" : "text-emerald-200"}`}>NPR {formatNpr(i.premiumNpr)}</span>
                  <FamilyBtnGhost light={light} className="h-9 px-2" onClick={() => setInsModal({ mode: "edit", row: i })}>
                    <Pencil size={14} />
                  </FamilyBtnGhost>
                  <FamilyBtnGhost light={light} className="h-9 px-2" onClick={() => dispatch({ type: "DELETE_INSURANCE", id: i.id })}>
                    <Trash2 size={14} />
                  </FamilyBtnGhost>
                </div>
              </li>
            ))}
          </ul>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Prevention"
            title="Vaccination tracker"
            subtitle="Clinic status lines — editable."
            action={
              <FamilyBtnPrimary light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setVacModal({ mode: "add" })}>
                <Plus size={14} /> Add
              </FamilyBtnPrimary>
            }
          />
          <ul className="space-y-3">
            {vaccinations.map((v) => (
              <li
                key={v.id}
                className={`flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                  light ? "border-emerald-100/90 bg-white/90" : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <div>
                  <p className={`font-bold ${familyHeadingClass(light)}`}>{v.name}</p>
                  <p className={`text-xs ${familyMutedText(light)}`}>
                    {v.child} · {v.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <FamilyBtnGhost light={light} className="h-9 px-2" onClick={() => setVacModal({ mode: "edit", row: v })}>
                    <Pencil size={14} />
                  </FamilyBtnGhost>
                  <FamilyBtnGhost light={light} className="h-9 px-2" onClick={() => dispatch({ type: "DELETE_VACCINATION", id: v.id })}>
                    <Trash2 size={14} />
                  </FamilyBtnGhost>
                </div>
              </li>
            ))}
          </ul>
        </FamilyGlassCard>

        <FamilyGlassCard light={light} padding="lg">
          <FamilySectionTitle
            light={light}
            eyebrow="Crisis"
            title="Emergency medical info"
            subtitle="Blood types, allergies, insurer card."
            action={
              <FamilyBtnGhost light={light} className="min-h-[36px] px-3 py-1.5 text-[11px]" onClick={() => setEmergencyOpen(true)}>
                <Pencil size={14} /> Edit
              </FamilyBtnGhost>
            }
          />
          <div className="space-y-4">
            <div className={`rounded-xl border p-4 ${light ? "border-emerald-200/80 bg-emerald-50/80" : "border-emerald-400/25 bg-emerald-500/10"}`}>
              <p className={`text-[10px] font-black uppercase tracking-wide ${familyMutedText(light)}`}>Blood types</p>
              <p className={`mt-1 text-sm font-bold ${familyHeadingClass(light)}`}>{emergencyMedical.bloodTypes}</p>
            </div>
            <div className={`rounded-xl border p-4 ${light ? "border-amber-200/80 bg-amber-50/70" : "border-amber-400/25 bg-amber-500/10"}`}>
              <p className={`text-[10px] font-black uppercase tracking-wide ${familyMutedText(light)}`}>Allergies</p>
              <p className={`mt-1 text-sm font-bold ${familyHeadingClass(light)}`}>{emergencyMedical.allergies}</p>
            </div>
            <div className={`rounded-xl border p-4 ${light ? "border-slate-200/80 bg-white" : "border-white/10 bg-white/[0.04]"}`}>
              <p className={`text-[10px] font-black uppercase tracking-wide ${familyMutedText(light)}`}>Insurer card</p>
              <p className={`mt-1 text-sm font-bold ${familyHeadingClass(light)}`}>{emergencyMedical.insurerCard}</p>
            </div>
          </div>
        </FamilyGlassCard>
      </div>

      {medModal ? <MedicineOverlay light={light} modal={medModal} onClose={() => setMedModal(null)} dispatch={dispatch} childNames={state.children.map((c) => c.name)} /> : null}
      {insModal ? <InsuranceOverlay light={light} modal={insModal} onClose={() => setInsModal(null)} dispatch={dispatch} /> : null}
      {vacModal ? <VaccinationOverlay light={light} modal={vacModal} onClose={() => setVacModal(null)} dispatch={dispatch} /> : null}
      {emergencyOpen ? (
        <EmergencyOverlay light={light} data={emergencyMedical} onClose={() => setEmergencyOpen(false)} dispatch={dispatch} />
      ) : null}
    </div>
  );
}

function MedicineOverlay({
  light,
  modal,
  onClose,
  dispatch,
  childNames,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; row: MedicineReminder };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
  childNames: string[];
}) {
  const r = modal.mode === "edit" ? modal.row : null;
  const [name, setName] = useState(r?.name ?? "");
  const [schedule, setSchedule] = useState(r?.schedule ?? "");
  const [child, setChild] = useState(r?.child ?? childNames[0] ?? "Family");
  const onSave = () => {
    if (!name.trim()) return;
    if (modal.mode === "add") dispatch({ type: "ADD_MEDICINE", row: { name: name.trim(), schedule: schedule.trim(), child: child.trim() } });
    else dispatch({ type: "UPDATE_MEDICINE", id: modal.row.id, patch: { name: name.trim(), schedule: schedule.trim(), child: child.trim() } });
    onClose();
  };
  return (
    <FamilyOverlay
      open
      onClose={onClose}
      title={modal.mode === "add" ? "Add medicine reminder" : "Edit medicine reminder"}
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
          <FamilyFieldLabel light>Medicine</FamilyFieldLabel>
          <FamilyInput light value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Schedule / notes</FamilyFieldLabel>
          <FamilyInput light value={schedule} onChange={(e) => setSchedule(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Child / scope</FamilyFieldLabel>
          <FamilyInput light value={child} onChange={(e) => setChild(e.target.value)} list="child-names" />
          <datalist id="child-names">
            {childNames.map((n) => (
              <option key={n} value={n} />
            ))}
            <option value="Both" />
            <option value="Family" />
          </datalist>
        </div>
      </div>
    </FamilyOverlay>
  );
}

function InsuranceOverlay({
  light,
  modal,
  onClose,
  dispatch,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; row: InsuranceRow };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const r = modal.mode === "edit" ? modal.row : null;
  const [label, setLabel] = useState(r?.label ?? "");
  const [renews, setRenews] = useState(r?.renews ?? "");
  const [premium, setPremium] = useState(String(r?.premiumNpr ?? 0));
  const onSave = () => {
    if (!label.trim()) return;
    const row = { label: label.trim(), renews, premiumNpr: Math.max(0, Number(premium) || 0) };
    if (modal.mode === "add") dispatch({ type: "ADD_INSURANCE", row });
    else dispatch({ type: "UPDATE_INSURANCE", id: modal.row.id, patch: row });
    onClose();
  };
  return (
    <FamilyOverlay open onClose={onClose} title={modal.mode === "add" ? "Add insurance" : "Edit insurance"} light={light}>
      <div className="space-y-3">
        <div>
          <FamilyFieldLabel light>Label</FamilyFieldLabel>
          <FamilyInput light value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Renews</FamilyFieldLabel>
          <FamilyInput light type="date" value={renews} onChange={(e) => setRenews(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Premium (NPR)</FamilyFieldLabel>
          <FamilyInput light inputMode="numeric" value={premium} onChange={(e) => setPremium(e.target.value)} />
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

function VaccinationOverlay({
  light,
  modal,
  onClose,
  dispatch,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; row: VaccinationRow };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const r = modal.mode === "edit" ? modal.row : null;
  const [name, setName] = useState(r?.name ?? "");
  const [child, setChild] = useState(r?.child ?? "");
  const [status, setStatus] = useState(r?.status ?? "");
  const onSave = () => {
    if (!name.trim()) return;
    const row = { name: name.trim(), child: child.trim() || "—", status: status.trim() || "—" };
    if (modal.mode === "add") dispatch({ type: "ADD_VACCINATION", row });
    else dispatch({ type: "UPDATE_VACCINATION", id: modal.row.id, patch: row });
    onClose();
  };
  return (
    <FamilyOverlay open onClose={onClose} title={modal.mode === "add" ? "Add vaccination" : "Edit vaccination"} light={light}>
      <div className="space-y-3">
        <div>
          <FamilyFieldLabel light>Vaccine / event</FamilyFieldLabel>
          <FamilyInput light value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Child</FamilyFieldLabel>
          <FamilyInput light value={child} onChange={(e) => setChild(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Status</FamilyFieldLabel>
          <FamilyInput light value={status} onChange={(e) => setStatus(e.target.value)} />
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

function EmergencyOverlay({
  light,
  data,
  onClose,
  dispatch,
}: {
  light: boolean;
  data: { bloodTypes: string; allergies: string; insurerCard: string };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const [blood, setBlood] = useState(data.bloodTypes);
  const [allergies, setAllergies] = useState(data.allergies);
  const [card, setCard] = useState(data.insurerCard);
  return (
    <FamilyOverlay open onClose={onClose} title="Emergency medical info" light={light}>
      <div className="space-y-3">
        <div>
          <FamilyFieldLabel light>Blood types</FamilyFieldLabel>
          <FamilyInput light value={blood} onChange={(e) => setBlood(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Allergies</FamilyFieldLabel>
          <FamilyTextarea light value={allergies} onChange={(e) => setAllergies(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Insurer / card line</FamilyFieldLabel>
          <FamilyTextarea light value={card} onChange={(e) => setCard(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <FamilyBtnGhost light={light} onClick={onClose}>
          Cancel
        </FamilyBtnGhost>
        <FamilyBtnPrimary
          light={light}
          onClick={() => {
            dispatch({ type: "SET_EMERGENCY_MEDICAL", patch: { bloodTypes: blood.trim(), allergies: allergies.trim(), insurerCard: card.trim() } });
            onClose();
          }}
        >
          Save
        </FamilyBtnPrimary>
      </div>
    </FamilyOverlay>
  );
}
