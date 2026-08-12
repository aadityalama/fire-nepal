"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Home, Ban, Hammer, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useReturnToNepalPlanner } from "@/contexts/ReturnToNepalContext";
import { BackToReturnChecklistBanner } from "@/components/return-to-nepal/BackToReturnChecklistBanner";
import { RETURN_CHECKLIST_FROM } from "@/lib/return-to-nepal/return-checklist-routes";
import {
  canStartHousePlanSave,
  housePlanReturnHref,
  housePlanSelectionDirty,
  isSelectableHousePlanStatus,
  runHousePlanSave,
} from "@/lib/return-to-nepal/house-plan-flow";
import type { HousePlanStatus } from "@/lib/return-to-nepal/types";

const PAGE_BG = "#000805";
const GLASS = "rounded-[1.35rem] border border-white/10 bg-white/[0.055] backdrop-blur-xl";

const OPTIONS: Array<{
  id: Exclude<HousePlanStatus, "unknown">;
  title: string;
  body: string;
  icon: typeof Home;
}> = [
  {
    id: "plan_to_buy_build",
    title: "Plan to buy or build",
    body: "Track funding progress from your House / Land savings goal.",
    icon: Hammer,
  },
  {
    id: "already_own",
    title: "I already own a house",
    body: "Mark this checklist item complete — no funding target needed.",
    icon: Home,
  },
  {
    id: "not_needed",
    title: "Not needed for my return",
    body: "Skip house funding for Return Readiness (family home, rent, etc.).",
    icon: Ban,
  },
];

function savedPlanLabel(status: HousePlanStatus): string {
  if (status === "unknown") return "Not chosen yet";
  return OPTIONS.find((o) => o.id === status)?.title ?? status;
}

export function ReturnToNepalHouseDecisionPage() {
  const { state, live, hydrated, cloudReady, hydrateError, retryHydrate, persistNow } =
    useReturnToNepalPlanner();
  const params = useSearchParams();
  const fromChecklist = params.get("from") === RETURN_CHECKLIST_FROM;

  const savedStatus = state.housePlanStatus ?? "unknown";
  const [pending, setPending] = useState<HousePlanStatus | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingLockRef = useRef(false);

  useEffect(() => {
    if (!hydrated || !cloudReady || initialized) return;
    setPending(isSelectableHousePlanStatus(savedStatus) ? savedStatus : null);
    setInitialized(true);
  }, [hydrated, cloudReady, initialized, savedStatus]);

  const loading = !hydrated || !cloudReady;
  const dirty = housePlanSelectionDirty(savedStatus, pending);
  const canSave = canStartHousePlanSave({ pending, saving, hydrateError });
  const backHref = housePlanReturnHref(fromChecklist);

  const handleBack = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!dirty || saving) {
      if (saving) event.preventDefault();
      return;
    }
    const leave = window.confirm("You have unsaved changes. Leave without saving?");
    if (!leave) event.preventDefault();
  };

  const handleSave = async () => {
    // Prevent duplicate taps while an in-flight save is awaiting.
    if (savingLockRef.current) return;
    if (!canStartHousePlanSave({ pending, saving, hydrateError })) return;
    if (!isSelectableHousePlanStatus(pending)) return;

    savingLockRef.current = true;
    setSaveError(null);
    setSaving(true);

    const result = await runHousePlanSave({
      pending,
      state,
      persistNow,
    });

    if (result.ok) {
      // Hard navigate so checklist remounts with the just-persisted housePlanStatus.
      window.location.assign(housePlanReturnHref(fromChecklist));
      return;
    }

    savingLockRef.current = false;
    setSaving(false);
    setSaveError(result.error);
  };

  return (
    <div className="min-h-screen pb-32 text-white" style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-lg px-4 pt-4 sm:px-6 sm:pt-6">
        <BackToReturnChecklistBanner />
        <header className="mb-6 flex items-start gap-3">
          <Link
            href={backHref}
            onClick={handleBack}
            className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-white/80 transition active:scale-[0.98]"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-tight sm:text-2xl">House in Nepal</h1>
            <p className="mt-1 text-sm font-semibold text-emerald-100/50">
              Choose your housing plan for Return Readiness
            </p>
          </div>
        </header>

        {hydrateError ? (
          <div
            className="mb-4 rounded-2xl border border-rose-400/35 bg-rose-500/10 px-4 py-3"
            role="alert"
            data-testid="house-plan-load-error"
          >
            <p className="text-sm font-black text-rose-100">Load failed</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-rose-100/80">{hydrateError}</p>
            <button
              type="button"
              onClick={retryHydrate}
              className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-rose-300/30 bg-rose-500/15 px-3.5 py-2 text-xs font-black text-rose-50"
            >
              <RefreshCw size={14} aria-hidden />
              Retry load
            </button>
          </div>
        ) : null}

        {saveError ? (
          <div
            className="mb-4 rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-3"
            role="alert"
            data-testid="house-plan-save-error"
          >
            <p className="text-sm font-black text-amber-100">Save failed</p>
            <p className="mt-1 text-xs font-semibold text-amber-100/85">{saveError}</p>
            <button
              type="button"
              data-testid="house-plan-save-retry"
              disabled={saving || !isSelectableHousePlanStatus(pending)}
              onClick={() => void handleSave()}
              className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-500/15 px-3.5 py-2 text-xs font-black text-amber-50 disabled:opacity-50"
            >
              <RefreshCw size={14} aria-hidden />
              Retry save
            </button>
          </div>
        ) : null}

        <div className={`${GLASS} mb-4 p-4`}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">Saved plan</p>
          <p className="mt-2 text-sm font-bold text-white" data-testid="house-plan-saved-label">
            {loading ? "Loading…" : savedPlanLabel(savedStatus)}
          </p>
          {savedStatus === "plan_to_buy_build" ? (
            <p className="mt-1 text-xs font-semibold text-white/45">
              {live.houseGoalConfigured
                ? `${live.houseProgressPct.toFixed(0)}% funded from House / Land savings goal`
                : "Add a House / Land Fund goal in Savings to track funding."}
            </p>
          ) : null}
        </div>

        <p className="mb-3 text-[11px] font-semibold text-white/40">Tap an option, then Save &amp; Continue.</p>

        <ul className="space-y-3">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = pending === option.id;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  data-testid={`house-plan-${option.id}`}
                  aria-pressed={selected}
                  disabled={loading || Boolean(hydrateError) || saving}
                  onClick={() => {
                    setPending(option.id);
                    setSaveError(null);
                  }}
                  className={`flex min-h-[64px] w-full cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected
                      ? "border-emerald-400/50 bg-emerald-500/15 ring-2 ring-emerald-400/40"
                      : "border-white/10 bg-black/25 hover:border-emerald-400/30 hover:bg-white/[0.06]"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      selected ? "bg-emerald-500/25 text-emerald-200" : "bg-white/[0.06] text-emerald-300"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">{option.title}</span>
                      {selected ? <Check size={14} className="text-emerald-300" aria-hidden /> : null}
                    </span>
                    <span className="mt-0.5 block text-[12px] font-semibold text-white/45">{option.body}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#000805]/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            data-testid="house-plan-save-continue"
            disabled={!canSave}
            onClick={() => void handleSave()}
            className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-emerald-500 px-4 text-sm font-black text-[#04120d] shadow-[0_12px_40px_-16px_rgba(16,185,129,0.75)] transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
          >
            {saving ? "Saving…" : "Save & Continue"}
          </button>
          {!isSelectableHousePlanStatus(pending) && !loading ? (
            <p className="mt-2 text-center text-[11px] font-semibold text-white/40">
              Select a housing plan to continue
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
