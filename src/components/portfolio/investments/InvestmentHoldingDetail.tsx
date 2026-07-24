"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { Pencil, Trash2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  buildPerformanceSeries,
  classifyLedgerBucket,
  formatSignedPct,
  investmentLedgerForRow,
  kindLabel,
  type ChartRangeId,
  type InvestmentCardModel,
} from "@/components/portfolio/investments/investment-card-model";
import {
  EmptyState,
  InvBackHeader,
  InvBadge,
  InvGlass,
  SymbolLogo,
  ToneValue,
  formatInvMoney,
} from "@/components/portfolio/investments/InvestmentUi";
import type { PortfolioLedgerEntry } from "@/components/portfolio/types";
import { formatMoney } from "@/lib/expense-utils";
import { cn } from "@/lib/utils";

type DetailTab =
  | "overview"
  | "wacc"
  | "transactions"
  | "dividends"
  | "bonus"
  | "rights"
  | "auction"
  | "ipo_fpo"
  | "corporate"
  | "buys"
  | "sells"
  | "charts"
  | "analytics";

const TABS: { id: DetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "wacc", label: "WACC" },
  { id: "transactions", label: "Transactions" },
  { id: "dividends", label: "Dividend History" },
  { id: "bonus", label: "Bonus Shares" },
  { id: "rights", label: "Rights" },
  { id: "auction", label: "Auction" },
  { id: "ipo_fpo", label: "IPO/FPO" },
  { id: "corporate", label: "Corporate Actions" },
  { id: "buys", label: "Buy History" },
  { id: "sells", label: "Sell History" },
  { id: "charts", label: "Charts" },
  { id: "analytics", label: "Analytics" },
];

const RANGES: ChartRangeId[] = ["7D", "1M", "1Y", "ALL"];

export function InvestmentHoldingDetail({
  model,
  ledger,
  onBack,
  onEdit,
  onRemove,
}: {
  model: InvestmentCardModel;
  ledger: readonly PortfolioLedgerEntry[];
  onBack: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const entries = useMemo(() => investmentLedgerForRow(ledger, model.row.id), [ledger, model.row.id]);

  const byClass = useMemo(() => {
    const map = {
      buy: [] as PortfolioLedgerEntry[],
      sell: [] as PortfolioLedgerEntry[],
      dividend: [] as PortfolioLedgerEntry[],
      bonus: [] as PortfolioLedgerEntry[],
      right: [] as PortfolioLedgerEntry[],
      ipo: [] as PortfolioLedgerEntry[],
      fpo: [] as PortfolioLedgerEntry[],
      auction: [] as PortfolioLedgerEntry[],
      other: [] as PortfolioLedgerEntry[],
    };
    for (const e of entries) {
      map[classifyLedgerBucket(e)].push(e);
    }
    return map;
  }, [entries]);

  const marketBuys = byClass.buy;

  return (
    <div className="space-y-4 pb-24">
      <InvBackHeader
        title={model.symbol}
        subtitle={model.companyName}
        onBack={onBack}
        right={
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onEdit}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
              aria-label="Edit holding"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-400/25 bg-rose-500/10 text-rose-200"
              aria-label="Remove holding"
            >
              <Trash2 size={16} />
            </button>
          </div>
        }
      />

      <InvGlass className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <SymbolLogo initials={model.initials} hue={model.accentHue} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black tracking-tight text-white">{model.symbol}</h2>
              <InvBadge>{kindLabel(model.kind)}</InvBadge>
              {model.sector ? <InvBadge tone="sky">{model.sector}</InvBadge> : null}
            </div>
            <p className="mt-1 text-sm font-semibold text-emerald-200/60">{model.companyName}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Units" value={model.units.toLocaleString("en-NP")} />
              <Metric label="Value" value={formatInvMoney(model.currentValueNpr)} />
              <Metric
                label="Today"
                value={formatSignedPct(model.todayPct)}
                tone={model.todayPct}
              />
              <Metric
                label="Total P/L"
                value={`${model.totalPnlNpr >= 0 ? "+" : ""}${formatInvMoney(model.totalPnlNpr)}`}
                tone={model.totalPnlNpr}
              />
            </div>
          </div>
        </div>
      </InvGlass>

      <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-wide transition",
              tab === t.id
                ? "border-emerald-300/50 bg-emerald-400 text-emerald-950"
                : "border-emerald-400/20 bg-black/25 text-emerald-100/70",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? <OverviewPanel model={model} /> : null}
      {tab === "wacc" ? <WaccPanel model={model} /> : null}
      {tab === "transactions" ? <LedgerList title="All transactions" entries={entries} /> : null}
      {tab === "dividends" ? (
        <LedgerList
          title="Dividend history"
          entries={[
            ...byClass.dividend,
            ...(model.row.mfDividendHistory ?? []).map((d, i) => ({
              id: `mf-div-${i}`,
              txType: "cash_dividend" as const,
              bucket: "investment" as const,
              rowId: model.row.id,
              assetLabel: model.symbol,
              quantity: d.amountNpr,
              unitPrice: 1,
              currency: "NPR" as const,
              tradeDate: d.date,
              notes: "MF dividend history",
            })),
          ]}
        />
      ) : null}
      {tab === "bonus" ? <LedgerList title="Bonus shares" entries={byClass.bonus} /> : null}
      {tab === "rights" ? <LedgerList title="Rights" entries={byClass.right} /> : null}
      {tab === "auction" ? <LedgerList title="Auction" entries={byClass.auction} emptyHint="No auction lots recorded for this holding." /> : null}
      {tab === "ipo_fpo" ? (
        <LedgerList title="IPO / FPO" entries={[...byClass.ipo, ...byClass.fpo]} />
      ) : null}
      {tab === "corporate" ? (
        <LedgerList
          title="Corporate actions"
          entries={[...byClass.bonus, ...byClass.right, ...byClass.ipo, ...byClass.fpo, ...byClass.auction]}
        />
      ) : null}
      {tab === "buys" ? <LedgerList title="Buy history" entries={[...marketBuys, ...byClass.ipo, ...byClass.fpo, ...byClass.right]} /> : null}
      {tab === "sells" ? <LedgerList title="Sell history" entries={byClass.sell} /> : null}
      {tab === "charts" ? <ChartsPanel model={model} /> : null}
      {tab === "analytics" ? <AnalyticsPanel model={model} /> : null}
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: number | null;
}) {
  return (
    <div className="rounded-2xl border border-emerald-400/12 bg-black/30 px-2.5 py-2">
      <p className="text-[9px] font-black uppercase tracking-wider text-emerald-200/45">{label}</p>
      {tone == null ? (
        <p className="mt-0.5 truncate text-sm font-black tabular-nums text-emerald-50">{value}</p>
      ) : (
        <ToneValue value={tone} className="mt-0.5 block truncate text-sm">
          {value}
        </ToneValue>
      )}
    </div>
  );
}

function OverviewPanel({ model }: { model: InvestmentCardModel }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <StatCard label="WACC (NPR)" value={formatMoney(model.waccNpr, "NPR")} />
      <StatCard label="LTP" value={model.ltpNpr != null ? formatMoney(model.ltpNpr, "NPR") : "—"} />
      <StatCard label="Cost basis" value={formatInvMoney(model.costNpr)} />
      <StatCard label="Current value" value={formatInvMoney(model.currentValueNpr)} />
      <StatCard
        label="Unrealized P/L"
        value={`${model.totalPnlNpr >= 0 ? "+" : ""}${formatInvMoney(model.totalPnlNpr)}`}
        tone={model.totalPnlNpr}
      />
      <StatCard label="P/L %" value={formatSignedPct(model.totalPnlPct)} tone={model.totalPnlPct} />
      <StatCard label="Allocation" value={`${model.allocPct.toFixed(1)}%`} />
      <StatCard label="Dividends received" value={formatInvMoney(model.dividendsNetNpr)} />
      {model.tick ? (
        <>
          <StatCard label="Day change NPR" value={model.tick.changeNpr != null ? formatMoney(model.tick.changeNpr, "NPR") : "—"} tone={model.tick.changeNpr} />
          <StatCard label="Previous close" value={model.tick.previousCloseNpr != null ? formatMoney(model.tick.previousCloseNpr, "NPR") : "—"} />
          <StatCard label="High / Low" value={`${model.tick.highNpr != null ? formatMoney(model.tick.highNpr, "NPR") : "—"} / ${model.tick.lowNpr != null ? formatMoney(model.tick.lowNpr, "NPR") : "—"}`} />
          <StatCard label="Volume" value={model.tick.volume != null ? model.tick.volume.toLocaleString("en-NP") : "—"} />
        </>
      ) : null}
    </div>
  );
}

function WaccPanel({ model }: { model: InvestmentCardModel }) {
  const lots = model.row.fifoLots ?? [];
  return (
    <div className="space-y-3">
      <InvGlass className="p-4">
        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/50">Weighted average cost</p>
        <p className="mt-1 text-3xl font-black tabular-nums text-white">{formatMoney(model.waccNpr, "NPR")}</p>
        <p className="mt-2 text-xs font-semibold text-emerald-200/55">
          From FIFO lots when present, otherwise average buy price — same engine as portfolio valuations.
        </p>
      </InvGlass>
      {lots.length === 0 ? (
        <EmptyState title="No FIFO lots yet" subtitle="Legacy average buy price is used until the next trade creates lots." />
      ) : (
        <ul className="space-y-2">
          {lots.map((lot) => (
            <li key={lot.id}>
              <InvGlass className="flex items-center justify-between gap-3 p-3.5">
                <div>
                  <p className="text-sm font-black text-emerald-50">{lot.quantity.toLocaleString("en-NP")} units</p>
                  <p className="text-xs font-semibold text-emerald-200/55">Opened {lot.openedAt}</p>
                </div>
                <p className="text-sm font-black tabular-nums text-white">
                  {formatMoney(lot.unitCost, lot.currency)}
                </p>
              </InvGlass>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChartsPanel({ model }: { model: InvestmentCardModel }) {
  const [range, setRange] = useState<ChartRangeId>("1M");
  const uid = useId().replace(/:/g, "");
  const series = useMemo(
    () => buildPerformanceSeries(model.costNpr, model.currentValueNpr, range),
    [model.costNpr, model.currentValueNpr, range],
  );
  const positive = model.totalPnlNpr >= 0;
  return (
    <InvGlass className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-black text-emerald-50">Holding performance</p>
        <div className="flex gap-1 rounded-full border border-emerald-400/15 bg-black/30 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-black",
                range === r ? "bg-emerald-400 text-emerald-950" : "text-emerald-200/65",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`detail-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={positive ? "#34d399" : "#fb7185"} stopOpacity={0.4} />
                <stop offset="100%" stopColor={positive ? "#34d399" : "#fb7185"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Tooltip
              contentStyle={{
                background: "rgba(2,12,10,0.92)",
                border: "1px solid rgba(52,211,153,0.25)",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
              }}
              formatter={(v) => [formatInvMoney(Number(v ?? 0)), "Value"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={positive ? "#34d399" : "#fb7185"}
              strokeWidth={2.25}
              fill={`url(#detail-${uid})`}
              isAnimationActive
              animationDuration={650}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] font-semibold text-emerald-200/45">
        Illustrative path from cost to current mark. Live historical candles stay on the market terminal.
      </p>
    </InvGlass>
  );
}

function AnalyticsPanel({ model }: { model: InvestmentCardModel }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <StatCard label="CAGR" value={formatSignedPct(model.cagrPct)} tone={model.cagrPct} />
      <StatCard label="FIRE % of net worth" value={model.fireImpactPct != null ? `${model.fireImpactPct.toFixed(2)}%` : "—"} />
      <StatCard label="Allocation of investments" value={`${model.allocPct.toFixed(2)}%`} />
      <StatCard label="Realized gain (sells)" value={formatInvMoney(model.realizedGainNpr)} tone={model.realizedGainNpr} />
      <StatCard label="Dividends (net NPR)" value={formatInvMoney(model.dividendsNetNpr)} />
      <StatCard label="Purchase date" value={model.row.purchaseDate ?? "—"} />
      {model.kind === "sip" ? (
        <StatCard label="SIP growth est." value={formatSignedPct(model.sipIrrPct)} tone={model.sipIrrPct} />
      ) : null}
      {model.tick?.marketCap != null ? (
        <StatCard label="Market cap" value={formatMoney(model.tick.marketCap, "NPR")} />
      ) : null}
      {model.tick?.turnoverNpr != null ? (
        <StatCard label="Turnover" value={formatMoney(model.tick.turnoverNpr, "NPR")} />
      ) : null}
      {model.tick?.trades != null ? <StatCard label="Trades" value={String(model.tick.trades)} /> : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: number | null;
}) {
  return (
    <InvGlass className="p-3.5">
      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/45">{label}</p>
      {tone == null || tone === undefined ? (
        <p className="mt-1 text-base font-black tabular-nums text-emerald-50">{value}</p>
      ) : (
        <ToneValue value={tone} className="mt-1 block text-base">
          {value}
        </ToneValue>
      )}
    </InvGlass>
  );
}

function LedgerList({
  title,
  entries,
  emptyHint,
}: {
  title: string;
  entries: PortfolioLedgerEntry[];
  emptyHint?: string;
}) {
  if (entries.length === 0) {
    return <EmptyState title={`No ${title.toLowerCase()}`} subtitle={emptyHint ?? "Nothing recorded yet for this holding."} />;
  }
  return (
    <div className="space-y-2">
      <p className="text-xs font-black uppercase tracking-wider text-emerald-200/50">{title}</p>
      <ul className="space-y-2">
        {entries.map((e) => (
          <li key={e.id}>
            <InvGlass className="p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-emerald-50">
                    {e.ledgerAction || classifyLedgerBucket(e).replace(/_/g, " ")}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-emerald-200/55">
                    {e.tradeDate}
                    {e.notes ? ` · ${e.notes}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-black tabular-nums text-white">
                    {e.txType === "cash_dividend"
                      ? formatMoney(e.quantity, e.currency)
                      : `${e.quantity.toLocaleString("en-NP")} × ${formatMoney(e.unitPrice, e.currency)}`}
                  </p>
                  {e.realizedGainNpr != null ? (
                    <ToneValue value={e.realizedGainNpr} className="mt-0.5 block text-xs">
                      {e.realizedGainNpr >= 0 ? "+" : ""}
                      {formatInvMoney(e.realizedGainNpr)}
                    </ToneValue>
                  ) : null}
                </div>
              </div>
            </InvGlass>
          </li>
        ))}
      </ul>
    </div>
  );
}
