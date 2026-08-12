"use client";

import { ChevronRight } from "lucide-react";
import type { ChecklistStatus, ReturnChecklistItem } from "@/lib/return-to-nepal/return-checklist";

const STATUS_STYLES: Record<ChecklistStatus, string> = {
  completed: "bg-emerald-500/20 text-emerald-300 ring-emerald-400/30",
  on_track: "bg-teal-500/15 text-teal-200 ring-teal-400/25",
  in_progress: "bg-amber-500/15 text-amber-200 ring-amber-400/25",
  missing: "bg-rose-500/15 text-rose-200 ring-rose-400/25",
};

const STATUS_LABELS: Record<ChecklistStatus, string> = {
  completed: "Completed",
  on_track: "On Track",
  in_progress: "In Progress",
  missing: "Missing",
};

/**
 * Full-card tappable checklist row for mobile + desktop.
 *
 * Uses a stretched native <a> over the entire card so taps anywhere navigate.
 * Content is pointer-events-none so nested text/badge never steal the hit target.
 * Avoids next/link soft-nav edge cases that can silently no-op on some mobile WebViews.
 */
export function ReturnChecklistCard({ item }: { item: ReturnChecklistItem }) {
  const badgeText = item.badgeLabel ?? STATUS_LABELS[item.status];

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
          aria-label={`Open ${item.label} — ${badgeText}`}
          className="absolute inset-0 z-20 touch-manipulation"
          style={{ WebkitTapHighlightColor: "rgba(16, 185, 129, 0.22)" }}
          onClick={(event) => {
            // Hard navigate: Next soft-nav can silently no-op in some mobile WebViews/PWAs.
            // Acceptance: tap anywhere on the card must leave this page for the destination.
            event.preventDefault();
            window.location.assign(item.href);
          }}
        >
          <span className="sr-only">
            Open {item.label} ({badgeText})
          </span>
        </a>

        {/* Visual content: never captures pointer events */}
        <div className="pointer-events-none relative z-10 flex min-h-[56px] w-full items-center justify-between gap-3 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{item.label}</p>
            <p className="truncate text-[11px] font-semibold text-white/40">{item.detail}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ${STATUS_STYLES[item.status]}`}
            >
              {badgeText}
            </span>
            {/* Always-visible action affordance (not hover-only / not low-contrast) */}
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
