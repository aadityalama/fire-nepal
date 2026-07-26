"use client";

import { formatFundamentalDate } from "@/lib/market/nepse-fundamentals-format";
import { DATA_UNAVAILABLE, type NepseCompanyActionRow } from "@/types/market/nepse-company-fundamentals";

const ACTION_LABEL: Record<NepseCompanyActionRow["actionType"], string> = {
  rights: "Rights",
  bonus: "Bonus",
  dividend: "Dividend",
  agm: "AGM",
  book_close: "Book Close",
  fpo: "FPO",
  ipo: "IPO",
  merger: "Merger",
};

export function CompanyActionsTimeline({
  actions,
  fallbackNews,
}: {
  actions: NepseCompanyActionRow[];
  fallbackNews?: { id: string; title: string; date: string | null; source: string; url: string; marketWide?: boolean }[];
}) {
  if (actions.length) {
    return (
      <ol className="relative space-y-0 border-l border-emerald-300/40 pl-4 dark:border-emerald-400/25" data-testid="company-actions-timeline">
        {actions.map((item) => (
          <li key={item.id} className="relative pb-4 last:pb-0">
            <span className="absolute -left-[1.28rem] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-[#f4f8f6] dark:ring-[#030a08]" />
            <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-500">
              <span className="mr-1.5 rounded-full border border-emerald-300/40 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
                {ACTION_LABEL[item.actionType]}
              </span>
              {formatFundamentalDate(item.actionDate)}
              {item.source ? ` · ${item.source}` : ""}
            </p>
            {item.sourceUrl ? (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block text-sm font-black leading-snug text-slate-950 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300"
              >
                {item.title}
              </a>
            ) : (
              <p className="mt-1 text-sm font-black leading-snug text-slate-950 dark:text-white">{item.title}</p>
            )}
            {item.details ? <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-zinc-500">{item.details}</p> : null}
          </li>
        ))}
      </ol>
    );
  }

  if (fallbackNews?.length) {
    return (
      <ol className="relative space-y-0 border-l border-emerald-300/40 pl-4 dark:border-emerald-400/25" data-testid="company-actions-timeline">
        {fallbackNews.map((item) => (
          <li key={item.id} className="relative pb-4 last:pb-0">
            <span className="absolute -left-[1.28rem] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-[#f4f8f6] dark:ring-[#030a08]" />
            <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-500">
              {item.date ? formatFundamentalDate(item.date) : DATA_UNAVAILABLE} · {item.source}
              {item.marketWide ? " · Market-wide" : ""}
            </p>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-sm font-black leading-snug text-slate-950 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300"
            >
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div
      className="grid min-h-36 place-items-center rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/60 p-6 text-center dark:border-white/10 dark:bg-white/[0.02]"
      data-testid="company-actions-timeline"
    >
      <p className="text-sm font-black text-slate-800 dark:text-zinc-200">{DATA_UNAVAILABLE}</p>
      <p className="mt-1.5 max-w-md text-[11px] font-medium leading-relaxed text-slate-500 dark:text-zinc-500">
        Rights, bonus, dividend, AGM, book close, FPO, IPO and merger events will appear once the corporate-actions feed is ingested.
      </p>
    </div>
  );
}
