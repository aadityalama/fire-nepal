"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { CHECKLIST_STATUS_LABELS, type ChecklistStatus } from "@/lib/return-to-nepal/checklist-status";
import type { ReturnChecklistItem } from "@/lib/return-to-nepal/return-checklist";

const STATUS_STYLES: Record<ChecklistStatus, string> = {
  completed: "bg-emerald-500/20 text-emerald-300 ring-emerald-400/30",
  on_track: "bg-teal-500/15 text-teal-200 ring-teal-400/25",
  in_progress: "bg-amber-500/15 text-amber-200 ring-amber-400/25",
  missing: "bg-rose-500/15 text-rose-200 ring-rose-400/25",
  target_not_set: "bg-sky-500/15 text-sky-200 ring-sky-400/25",
  not_applicable: "bg-zinc-500/20 text-zinc-200 ring-zinc-400/30",
  data_unavailable: "bg-slate-500/20 text-slate-200 ring-slate-400/30",
  loading: "bg-teal-500/10 text-teal-100/80 ring-teal-400/20",
};

const STATUS_LABELS = CHECKLIST_STATUS_LABELS;

export type ReturnChecklistCardProps = {
  item: ReturnChecklistItem;
  /** Explicit NOT APPLICABLE for optional domains (SSF / Business). */
  onMarkNotApplicable?: () => void;
  /** Clear NOT APPLICABLE and reopen the requirement. */
  onClearNotApplicable?: () => void;
};

/**
 * Full-card tappable checklist row for mobile + desktop.
 *
 * Uses a stretched native <a> over the entire card so taps anywhere navigate.
 * Content is pointer-events-none so nested text/badge never steal the hit target.
 * Optional N/A / breakdown controls re-enable pointer events and stop navigation.
 */
export function ReturnChecklistCard({
  item,
  onMarkNotApplicable,
  onClearNotApplicable,
}: ReturnChecklistCardProps) {
  const badgeText = item.badgeLabel ?? STATUS_LABELS[item.status];
  const showMarkNa =
    Boolean(onMarkNotApplicable) &&
    (item.status === "missing" || item.status === "target_not_set" || item.status === "in_progress");
  const showClearNa = Boolean(onClearNotApplicable) && item.status === "not_applicable";
  const hasBreakdown = Boolean(item.breakdownLines && item.breakdownLines.length > 0);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const barPct =
    item.coveragePct != null && Number.isFinite(item.coveragePct)
      ? Math.max(0, Math.min(100, item.coveragePct))
      : null;

  return (
    <li className="relative list-none">
      <div
        className="relative min-h-[56px] overflow-hidden rounded-xl border border-white/[0.06] bg-black/20"
        data-return-checklist-card={item.id}
      >
        {/* Stretched link: covers the full card; highest z-index in this card */}
        <a
          href={item.href}
          data-testid={`return-checklist-${item.id}`}
          data-href={item.href}
          aria-label={`${item.actionLabel} — ${item.label} (${badgeText})`}
          className="absolute inset-0 z-20 touch-manipulation"
          style={{ WebkitTapHighlightColor: "rgba(16, 185, 129, 0.22)" }}
          onClick={(event) => {
            // Hard navigate: Next soft-nav can silently no-op in some mobile WebViews/PWAs.
            event.preventDefault();
            window.location.assign(item.href);
          }}
        >
          <span className="sr-only">
            {item.actionLabel}: {item.label} ({badgeText})
          </span>
        </a>

        {/* Visual content: never captures pointer events (except explicit controls) */}
        <div className="pointer-events-none relative z-10 flex min-h-[56px] w-full items-start justify-between gap-3 px-3 py-2.5">
          <div className="min-w-0 flex-1 pr-1">
            <p className="text-sm font-bold leading-snug text-white">{item.label}</p>
            <p
              className={`mt-0.5 text-[11px] font-semibold leading-snug text-white/40 ${
                item.id === "passive" ? "line-clamp-4 sm:line-clamp-none" : "line-clamp-2"
              }`}
            >
              {item.detail}
            </p>
            {barPct != null ? (
              <div className="mt-2 h-1.5 w-full max-w-[16rem] overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400/80"
                  style={{ width: `${barPct}%` }}
                  data-testid={`return-checklist-bar-${item.id}`}
                />
              </div>
            ) : null}
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300/70">
              {item.actionLabel}
            </p>
            {(showMarkNa || showClearNa || hasBreakdown) && (
              <div className="pointer-events-auto relative z-30 mt-1.5 flex flex-wrap items-center gap-2">
                {showMarkNa ? (
                  <button
                    type="button"
                    data-testid={`return-checklist-na-${item.id}`}
                    className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/55 ring-1 ring-white/15 hover:bg-white/10 hover:text-white/80"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onMarkNotApplicable?.();
                    }}
                  >
                    Not applicable
                  </button>
                ) : null}
                {showClearNa ? (
                  <button
                    type="button"
                    data-testid={`return-checklist-clear-na-${item.id}`}
                    className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300/80 ring-1 ring-emerald-400/25 hover:bg-emerald-500/10"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onClearNotApplicable?.();
                    }}
                  >
                    Include again
                  </button>
                ) : null}
                {hasBreakdown ? (
                  <button
                    type="button"
                    data-testid={`return-checklist-breakdown-${item.id}`}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200/80 ring-1 ring-emerald-400/20 hover:bg-emerald-500/10"
                    aria-expanded={breakdownOpen}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setBreakdownOpen((open) => !open);
                    }}
                  >
                    Sources
                    <ChevronDown
                      size={12}
                      className={`transition ${breakdownOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                ) : null}
              </div>
            )}
            {hasBreakdown && breakdownOpen ? (
              <ul
                className="pointer-events-none mt-2 space-y-1 rounded-lg border border-white/[0.06] bg-black/30 px-2.5 py-2"
                data-testid={`return-checklist-breakdown-list-${item.id}`}
              >
                {item.breakdownLines!.map((line) => (
                  <li
                    key={`${line.label}-${line.value}`}
                    className="flex items-start justify-between gap-3 text-[10px] font-semibold"
                  >
                    <span
                      className={
                        line.tone === "passive"
                          ? "text-emerald-200/80"
                          : line.tone === "active"
                            ? "text-amber-200/80"
                            : "text-white/45"
                      }
                    >
                      {line.label}
                    </span>
                    <span className="shrink-0 text-right text-white/70">{line.value}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start pt-0.5">
            <span
              className={`max-w-[7.5rem] shrink-0 truncate rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ${STATUS_STYLES[item.status]}`}
              title={badgeText}
            >
              {badgeText}
            </span>
            <span
              className="grid h-8 w-8 place-items-center rounded-lg bg-white/12 text-white ring-1 ring-white/25"
              aria-hidden
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}
