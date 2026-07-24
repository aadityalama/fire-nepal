"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  filterInvestmentCards,
  formatSignedPct,
  type HoldingFilterId,
  type InvestmentCardModel,
} from "@/components/portfolio/investments/investment-card-model";
import {
  EmptyState,
  InvBadge,
  InvGlass,
  InvSectionTitle,
  SymbolLogo,
  ToneValue,
  formatInvMoney,
} from "@/components/portfolio/investments/InvestmentUi";
import { cn } from "@/lib/utils";

const FILTERS: { id: HoldingFilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "profit", label: "Profit" },
  { id: "loss", label: "Loss" },
  { id: "dividend_pending", label: "Dividend Pending" },
];

export function InvestmentHoldingsList({
  models,
  onOpenHolding,
  compact = false,
  limit,
  showHeader = true,
  showSearch = true,
}: {
  models: InvestmentCardModel[];
  onOpenHolding: (id: string) => void;
  compact?: boolean;
  limit?: number;
  showHeader?: boolean;
  showSearch?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HoldingFilterId>("all");

  const filtered = useMemo(() => {
    const list = filterInvestmentCards(models, showSearch ? query : "", showSearch ? filter : "all");
    return limit != null ? list.slice(0, limit) : list;
  }, [models, query, filter, limit, showSearch]);

  return (
    <section className="space-y-3">
      {showHeader ? (
        <InvSectionTitle
          title="Holdings"
          subtitle={compact ? "Tap a stock for full details" : `${filtered.length} of ${models.length} positions`}
        />
      ) : null}

      {showSearch ? (
        <div className="flex flex-col gap-2.5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300/45"
              strokeWidth={2.2}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by symbol…"
              aria-label="Search holdings by symbol"
              className="wealth-input-text w-full rounded-2xl py-3 pl-11 pr-3 text-sm font-bold"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-black uppercase tracking-wide transition",
                  filter === f.id
                    ? "border-emerald-300/50 bg-emerald-400 text-emerald-950 shadow-sm shadow-emerald-950/30"
                    : "border-emerald-400/20 bg-black/25 text-emerald-100/75 hover:border-emerald-300/35",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title={models.length === 0 ? "No holdings yet" : "No matches"}
          subtitle={
            models.length === 0
              ? "Use + Add Stock to record your first NEPSE buy, IPO, or dividend."
              : "Try another symbol or filter."
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((m) => (
            <li key={m.row.id}>
              <HoldingCard model={m} onOpen={() => onOpenHolding(m.row.id)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HoldingCard({ model, onOpen }: { model: InvestmentCardModel; onOpen: () => void }) {
  const todayTone = model.todayPct == null ? undefined : model.todayPct >= 0 ? "lime" : "rose";
  return (
    <InvGlass onClick={onOpen} className="p-3.5 sm:p-4">
      <div className="flex items-center gap-3">
        <SymbolLogo initials={model.initials} hue={model.accentHue} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-black tracking-tight text-emerald-50">{model.symbol}</p>
            {todayTone ? <InvBadge tone={todayTone}>{formatSignedPct(model.todayPct)}</InvBadge> : null}
          </div>
          <p className="mt-0.5 truncate text-xs font-semibold text-emerald-200/55">
            {model.units.toLocaleString("en-NP")} units
            {model.sector ? ` · ${model.sector}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-black tabular-nums text-white sm:text-base">{formatInvMoney(model.currentValueNpr)}</p>
          <ToneValue value={model.totalPnlNpr} className="mt-0.5 block text-xs sm:text-sm">
            {model.totalPnlNpr >= 0 ? "+" : ""}
            {formatInvMoney(model.totalPnlNpr)}
          </ToneValue>
        </div>
      </div>
    </InvGlass>
  );
}
