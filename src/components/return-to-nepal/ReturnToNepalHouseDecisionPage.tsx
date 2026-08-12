"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Home, Ban, Hammer } from "lucide-react";
import { useReturnToNepalPlanner } from "@/contexts/ReturnToNepalContext";
import { BackToReturnChecklistBanner } from "@/components/return-to-nepal/BackToReturnChecklistBanner";
import {
  RETURN_CHECKLIST_FROM,
  RETURN_TO_NEPAL_CHECKLIST_HREF,
} from "@/lib/return-to-nepal/return-checklist-routes";
import type { HousePlanStatus } from "@/lib/return-to-nepal/types";

const PAGE_BG = "#000805";
const GLASS = "rounded-[1.35rem] border border-white/10 bg-white/[0.055] backdrop-blur-xl";

const OPTIONS: Array<{
  id: HousePlanStatus;
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

export function ReturnToNepalHouseDecisionPage() {
  const { state, patch, live } = useReturnToNepalPlanner();
  const router = useRouter();
  const params = useSearchParams();
  const fromChecklist = params.get("from") === RETURN_CHECKLIST_FROM;
  const current = state.housePlanStatus ?? "unknown";

  const choose = (next: HousePlanStatus) => {
    patch({ housePlanStatus: next });
    if (next === "plan_to_buy_build") {
      router.push(`/savings-tracker?from=${RETURN_CHECKLIST_FROM}`);
      return;
    }
    router.push(fromChecklist ? RETURN_TO_NEPAL_CHECKLIST_HREF : "/return-to-nepal");
  };

  return (
    <div className="min-h-screen pb-28 text-white" style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-lg px-4 pt-4 sm:px-6 sm:pt-6">
        <BackToReturnChecklistBanner />
        <header className="mb-6 flex items-start gap-3">
          <Link
            href={fromChecklist ? RETURN_TO_NEPAL_CHECKLIST_HREF : "/return-to-nepal"}
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

        <div className={`${GLASS} mb-4 p-4`}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">Current plan</p>
          <p className="mt-2 text-sm font-bold text-white">
            {current === "unknown"
              ? "Not chosen yet"
              : OPTIONS.find((o) => o.id === current)?.title ?? current}
          </p>
          {current === "plan_to_buy_build" ? (
            <p className="mt-1 text-xs font-semibold text-white/45">
              {live.houseGoalConfigured
                ? `${live.houseProgressPct.toFixed(0)}% funded from House / Land savings goal`
                : "Add a House / Land Fund goal in Savings to track funding."}
            </p>
          ) : null}
        </div>

        <ul className="space-y-3">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = current === option.id;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  data-testid={`house-plan-${option.id}`}
                  onClick={() => choose(option.id)}
                  className={`flex min-h-[64px] w-full cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition active:scale-[0.99] ${
                    selected
                      ? "border-emerald-400/50 bg-emerald-500/15 ring-1 ring-emerald-400/30"
                      : "border-white/10 bg-black/25 hover:border-emerald-400/30 hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-emerald-300">
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
    </div>
  );
}
