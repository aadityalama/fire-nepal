"use client";

import { Cake, CreditCard, GraduationCap, Landmark, Pencil, Plane, Plus, Sparkles, Trash2, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useFamilyModule } from "@/contexts/FamilyModuleContext";
import type { CalendarEvent, CalendarEventType } from "@/lib/family-module/types";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { FamilyBtnGhost, FamilyBtnPrimary } from "@/components/family-module/ui/family-module-buttons";
import { FamilyFieldLabel, FamilyInput, FamilySelect } from "@/components/family-module/ui/FamilyFormFields";
import { FamilyOverlay } from "@/components/family-module/ui/FamilyOverlay";
import { FamilyGlassCard, FamilySectionTitle, familyHeadingClass, familyMutedText } from "./FamilyUiPrimitives";

const TYPE_META: Record<
  CalendarEventType,
  { label: string; icon: LucideIcon; chip: string }
> = {
  school: { label: "School events", icon: GraduationCap, chip: "bg-teal-500/20 text-teal-100 border-teal-400/30" },
  salary: { label: "Salary day", icon: Landmark, chip: "bg-lime-500/20 text-lime-100 border-lime-400/30" },
  bill: { label: "Bills", icon: CreditCard, chip: "bg-emerald-500/20 text-emerald-100 border-emerald-400/30" },
  birthday: { label: "Birthdays", icon: Cake, chip: "bg-pink-500/15 text-pink-100 border-pink-400/25" },
  visa: { label: "Visa renewals", icon: Plane, chip: "bg-sky-500/15 text-sky-100 border-sky-400/25" },
};

export function FamilyCalendarDashboard() {
  const { state, dispatch } = useFamilyModule();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const events = useMemo(() => [...state.calendarEvents].sort((a, b) => a.date.localeCompare(b.date)), [state.calendarEvents]);

  const [eventModal, setEventModal] = useState<{ mode: "add" } | { mode: "edit"; event: CalendarEvent } | null>(null);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${light ? "text-emerald-700/80" : "text-emerald-400/70"}`}>Calendar</p>
          <h1 className={`mt-1 text-2xl font-black tracking-tight sm:text-3xl ${familyHeadingClass(light)}`}>Unified family calendar</h1>
          <p className={`mt-2 max-w-2xl text-sm sm:text-base ${familyMutedText(light)}`}>
            Add and edit events — categories are color-coded. Timeline updates instantly (local state).
          </p>
        </div>
        <FamilyBtnPrimary light={light} className="shrink-0 self-start" onClick={() => setEventModal({ mode: "add" })}>
          <Plus size={16} /> Add Event
        </FamilyBtnPrimary>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(Object.keys(TYPE_META) as CalendarEventType[]).map((key) => {
          const meta = TYPE_META[key];
          const Icon = meta.icon;
          const count = events.filter((e) => e.type === key).length;
          return (
            <FamilyGlassCard key={key} light={light} padding="sm" className="text-center sm:text-left">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <Icon size={18} className={light ? "text-emerald-700" : "text-emerald-300"} />
                <p className={`text-xs font-black uppercase tracking-wide ${familyMutedText(light)}`}>{meta.label}</p>
              </div>
              <p className={`mt-2 text-2xl font-black tabular-nums ${familyHeadingClass(light)}`}>{count}</p>
            </FamilyGlassCard>
          );
        })}
      </div>

      <FamilyGlassCard light={light} padding="lg">
        <FamilySectionTitle
          light={light}
          eyebrow="Timeline"
          title="Upcoming moments"
          subtitle="Sorted by date — edit inline actions per row."
          action={<Sparkles size={18} className={light ? "text-emerald-700" : "text-emerald-400"} />}
        />
        <div className="space-y-3">
          {events.map((e) => {
            const meta = TYPE_META[e.type];
            const Icon = meta.icon;
            const chipLight =
              e.type === "school"
                ? "border-teal-200 bg-teal-50 text-teal-900"
                : e.type === "salary"
                  ? "border-lime-200 bg-lime-50 text-lime-900"
                  : e.type === "bill"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : e.type === "birthday"
                      ? "border-pink-200 bg-pink-50 text-pink-900"
                      : "border-sky-200 bg-sky-50 text-sky-900";
            return (
              <div
                key={e.id}
                className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 transition duration-300 hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between ${
                  light ? "border-emerald-100/90 bg-white/95" : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${
                      light ? chipLight : `${meta.chip} border`
                    }`}
                  >
                    <Icon size={20} className={light ? undefined : "opacity-95"} />
                  </div>
                  <div className="min-w-0">
                    <p className={`font-bold leading-snug ${familyHeadingClass(light)}`}>{e.title}</p>
                    <p className={`mt-1 text-xs font-semibold ${familyMutedText(light)}`}>{meta.label}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <p className={`text-xs font-black uppercase tracking-[0.14em] ${light ? "text-emerald-800" : "text-emerald-300"}`}>{e.date}</p>
                  <div className="flex gap-2">
                    <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => setEventModal({ mode: "edit", event: e })}>
                      <Pencil size={14} /> Edit
                    </FamilyBtnGhost>
                    <FamilyBtnGhost light={light} className="h-9 px-2 text-[11px]" onClick={() => dispatch({ type: "DELETE_CALENDAR_EVENT", id: e.id })}>
                      <Trash2 size={14} /> Delete
                    </FamilyBtnGhost>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </FamilyGlassCard>

      {eventModal ? <CalendarEventOverlay light={light} modal={eventModal} onClose={() => setEventModal(null)} dispatch={dispatch} /> : null}
    </div>
  );
}

function CalendarEventOverlay({
  light,
  modal,
  onClose,
  dispatch,
}: {
  light: boolean;
  modal: { mode: "add" } | { mode: "edit"; event: CalendarEvent };
  onClose: () => void;
  dispatch: ReturnType<typeof useFamilyModule>["dispatch"];
}) {
  const ev = modal.mode === "edit" ? modal.event : null;
  const [title, setTitle] = useState(ev?.title ?? "");
  const [date, setDate] = useState(ev?.date ?? new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<CalendarEventType>(ev?.type ?? "school");

  const onSave = () => {
    if (!title.trim()) return;
    if (modal.mode === "add") dispatch({ type: "ADD_CALENDAR_EVENT", event: { title: title.trim(), date, type } });
    else dispatch({ type: "UPDATE_CALENDAR_EVENT", id: modal.event.id, patch: { title: title.trim(), date, type } });
    onClose();
  };

  return (
    <FamilyOverlay
      open
      onClose={onClose}
      title={modal.mode === "add" ? "Add calendar event" : "Edit calendar event"}
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
          <FamilyFieldLabel light>Title</FamilyFieldLabel>
          <FamilyInput light value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Date</FamilyFieldLabel>
          <FamilyInput light type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <FamilyFieldLabel light>Category</FamilyFieldLabel>
          <FamilySelect light value={type} onChange={(e) => setType(e.target.value as CalendarEventType)}>
            {(Object.keys(TYPE_META) as CalendarEventType[]).map((k) => (
              <option key={k} value={k}>
                {TYPE_META[k].label}
              </option>
            ))}
          </FamilySelect>
        </div>
      </div>
    </FamilyOverlay>
  );
}
