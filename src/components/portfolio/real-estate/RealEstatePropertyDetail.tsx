"use client";

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { NumericMoneyInput } from "@/components/NumericMoneyInput";
import { CurrencySelect } from "@/components/portfolio/CurrencySelect";
import { PortfolioIsoDateField } from "@/components/portfolio/PortfolioIsoDateField";
import { RealEstateAiInsightsEngine } from "@/components/portfolio/RealEstateAiInsightsEngine";
import { reAiWealthInsightsBundle } from "@/components/portfolio/re-ai-wealth-insights";
import {
  REAL_ESTATE_TXN_KINDS,
  REAL_ESTATE_TXNS_MAX,
  realEstateAllPhotos,
} from "@/components/portfolio/real-estate-documents";
import {
  reHoldingYrMo,
  reImpliedAnnualGrowthPct,
} from "@/components/portfolio/real-estate-metrics";
import { propertyCardMetrics, propertyCompletenessScore } from "@/components/portfolio/real-estate-portfolio-stats";
import { recordRealEstateBuyProperty, recordRealEstateSellProperty } from "@/components/portfolio/portfolio-ledger";
import { newId } from "@/components/portfolio/storage";
import type {
  PortfolioLedgerEntry,
  RealEstateKind,
  RealEstatePropertyTxn,
  RealEstatePropertyTxnKind,
  RealEstateRow,
  WealthPortfolioStateV2,
} from "@/components/portfolio/types";
import { RealEstateDocumentsVault } from "@/components/portfolio/real-estate/RealEstateDocumentsVault";
import { RealEstatePhotosGallery } from "@/components/portfolio/real-estate/RealEstatePhotosGallery";
import {
  buildGrowthSeries,
  formatReCcy,
  formatReSignedCcy,
  ReBackHeader,
  ReFieldLabel,
  ReGlass,
  ReInputClassName,
  ReScoreRing,
  RE_KIND_LABEL,
} from "@/components/portfolio/real-estate/RealEstateUi";
import { sanitizeGoogleMapsUrl } from "@/components/portfolio/real-estate-maps-url";
import { formatMoney } from "@/lib/expense-utils";
import { amountToNpr, type PortfolioDisplayCurrency } from "@/lib/portfolio-convert";
import { cn } from "@/lib/utils";

type DetailTab = "overview" | "analytics" | "ai" | "transactions" | "documents" | "photos";

const TABS: { id: DetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "analytics", label: "Analytics" },
  { id: "ai", label: "AI Insights" },
  { id: "transactions", label: "Transactions" },
  { id: "documents", label: "Documents" },
  { id: "photos", label: "Photos" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RealEstatePropertyDetail({
  row,
  ledger,
  krwPerNpr,
  usdPerNpr,
  onBack,
  onChange,
  onRemove,
  onMutate,
}: {
  row: RealEstateRow;
  ledger: readonly PortfolioLedgerEntry[];
  krwPerNpr: number;
  usdPerNpr: number;
  onBack: () => void;
  onChange: (id: string, patch: Partial<RealEstateRow>) => void;
  onRemove: (id: string) => void;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const [slide, setSlide] = useState(0);
  const [editing, setEditing] = useState(false);
  const photos = realEstateAllPhotos(row);
  const metrics = propertyCardMetrics(row);
  const score = propertyCompletenessScore(row);
  const ai = useMemo(() => reAiWealthInsightsBundle(row), [row]);

  const growth = buildGrowthSeries(row.purchaseValue, row.estimatedValue, 10);

  return (
    <div className="space-y-4">
      <ReBackHeader
        title={row.name || "Untitled property"}
        subtitle={row.location?.trim() || RE_KIND_LABEL[row.propertyType]}
        onBack={onBack}
        right={
          <button
            type="button"
            onClick={() => {
              if (confirm("Delete this property?")) {
                onRemove(row.id);
                onBack();
              }
            }}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-400/25 bg-rose-500/10 text-rose-200"
            aria-label="Delete property"
          >
            <Trash2 size={18} />
          </button>
        }
      />

      {/* Gallery */}
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-emerald-400/20">
        <div className="aspect-[16/10] bg-gradient-to-br from-emerald-950 to-[#04140f]">
          {photos[slide] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos[slide]} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-sm font-semibold text-emerald-200/40">No photos yet</div>
          )}
        </div>
        {photos.length > 1 ? (
          <>
            <button
              type="button"
              className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white"
              onClick={() => setSlide((s) => (s - 1 + photos.length) % photos.length)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white"
              onClick={() => setSlide((s) => (s + 1) % photos.length)}
            >
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlide(i)}
                  className={cn("h-1.5 rounded-full transition", i === slide ? "w-5 bg-lime-300" : "w-1.5 bg-white/40")}
                />
              ))}
            </div>
          </>
        ) : null}
        <div className="absolute right-3 top-3">
          <ReScoreRing score={score} size={72} label="Health" />
        </div>
      </div>

      {/* Tabs */}
      <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-black uppercase tracking-wide transition",
              tab === t.id
                ? "border-emerald-400/45 bg-emerald-500/20 text-lime-200"
                : "border-emerald-400/15 text-emerald-200/55",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <OverviewTab
          row={row}
          metrics={metrics}
          editing={editing}
          setEditing={setEditing}
          onChange={onChange}
          krwPerNpr={krwPerNpr}
          usdPerNpr={usdPerNpr}
        />
      ) : null}
      {tab === "analytics" ? <AnalyticsTab row={row} metrics={metrics} growth={growth} /> : null}
      {tab === "ai" ? (
        <div className="space-y-3">
          <ReGlass className="p-4">
            <div className="flex items-center gap-4">
              <ReScoreRing score={score} size={80} />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/50">Sentiment</p>
                <p className="mt-1 text-sm font-black text-emerald-50">{ai.sentimentLabelEn}</p>
                <p className="mt-1 text-xs font-semibold text-emerald-200/55">{ai.sentimentLabelNe}</p>
              </div>
            </div>
          </ReGlass>
          {ai.cards[0] ? (
            <ReGlass className="p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/50">Recommendation</p>
              <p className="mt-1 text-sm font-black text-emerald-50">{ai.cards[0].headlineEn}</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-200/60">{ai.cards[0].bodyEn}</p>
            </ReGlass>
          ) : null}
          <RealEstateAiInsightsEngine bundle={ai} />
        </div>
      ) : null}
      {tab === "transactions" ? (
        <TransactionsTab row={row} ledger={ledger} onChange={onChange} onMutate={onMutate} />
      ) : null}
      {tab === "documents" ? <RealEstateDocumentsVault row={row} onChange={onChange} /> : null}
      {tab === "photos" ? <RealEstatePhotosGallery row={row} onChange={onChange} /> : null}
    </div>
  );
}

function OverviewTab({
  row,
  metrics,
  editing,
  setEditing,
  onChange,
  krwPerNpr,
  usdPerNpr,
}: {
  row: RealEstateRow;
  metrics: ReturnType<typeof propertyCardMetrics>;
  editing: boolean;
  setEditing: (v: boolean) => void;
  onChange: (id: string, patch: Partial<RealEstateRow>) => void;
  krwPerNpr: number;
  usdPerNpr: number;
}) {
  const holding = metrics.holding;
  const profitNpr =
    metrics.profit != null ? amountToNpr(metrics.profit, row.currency, krwPerNpr, usdPerNpr) : null;

  if (editing) {
    return (
      <EditPropertyForm
        row={row}
        onChange={onChange}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <MetricTile label="Purchase" value={formatReCcy(row.purchaseValue, row.currency)} />
        <MetricTile label="Current" value={formatReCcy(row.estimatedValue, row.currency)} tone="lime" />
        <MetricTile
          label="Profit"
          value={metrics.profit != null ? formatReSignedCcy(metrics.profit, row.currency) : "—"}
          tone={metrics.profit != null && metrics.profit >= 0 ? "lime" : "rose"}
        />
        <MetricTile label="ROI" value={metrics.roi != null ? `${metrics.roi.toFixed(1)}%` : "—"} />
        <MetricTile
          label="Holding"
          value={holding ? `${holding.years}y ${holding.months}m` : "—"}
        />
        <MetricTile label="Type" value={RE_KIND_LABEL[row.propertyType]} />
      </div>

      <ReGlass className="p-4">
        <div className="flex items-center gap-2 text-emerald-200/60">
          <Calendar size={14} />
          <p className="text-xs font-bold">Acquired {row.acquiredDate || "—"}</p>
        </div>
        {row.mapsUrl ? (
          <a
            href={row.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-black text-emerald-300"
          >
            Open in Maps <ExternalLink size={12} />
          </a>
        ) : null}
        {row.currency !== "NPR" && profitNpr != null ? (
          <p className="mt-2 text-[11px] font-semibold text-emerald-200/50">≈ {formatMoney(profitNpr, "NPR")} P/L</p>
        ) : null}
      </ReGlass>

      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-sm font-black text-emerald-100"
      >
        <Pencil size={16} /> Edit Property
      </button>
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone = "emerald",
}: {
  label: string;
  value: string;
  tone?: "emerald" | "lime" | "rose";
}) {
  const tones = {
    emerald: "text-emerald-50",
    lime: "text-lime-200",
    rose: "text-rose-300",
  };
  return (
    <ReGlass className="p-3.5">
      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/50">{label}</p>
      <p className={`mt-1.5 text-sm font-black tabular-nums ${tones[tone]}`}>{value}</p>
    </ReGlass>
  );
}

function EditPropertyForm({
  row,
  onChange,
  onDone,
}: {
  row: RealEstateRow;
  onChange: (id: string, patch: Partial<RealEstateRow>) => void;
  onDone: () => void;
}) {
  return (
    <ReGlass className="space-y-3 p-4">
      <div>
        <ReFieldLabel>Name</ReFieldLabel>
        <input
          value={row.name}
          onChange={(e) => onChange(row.id, { name: e.target.value })}
          className={ReInputClassName}
        />
      </div>
      <div>
        <ReFieldLabel>Type</ReFieldLabel>
        <select
          value={row.propertyType}
          onChange={(e) => onChange(row.id, { propertyType: e.target.value as RealEstateKind })}
          className={ReInputClassName}
        >
          {(Object.keys(RE_KIND_LABEL) as RealEstateKind[]).map((k) => (
            <option key={k} value={k}>
              {RE_KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <ReFieldLabel>Location</ReFieldLabel>
        <input
          value={row.location ?? ""}
          onChange={(e) => onChange(row.id, { location: e.target.value || undefined })}
          className={ReInputClassName}
        />
      </div>
      <div>
        <ReFieldLabel>Maps URL</ReFieldLabel>
        <input
          value={row.mapsUrl ?? ""}
          onChange={(e) =>
            onChange(row.id, {
              mapsUrl: sanitizeGoogleMapsUrl(e.target.value) ?? (e.target.value || undefined),
            })
          }
          className={ReInputClassName}
        />
      </div>
      <div>
        <ReFieldLabel>Currency</ReFieldLabel>
        <CurrencySelect value={row.currency} onChange={(c) => onChange(row.id, { currency: c })} />
      </div>
      <div>
        <ReFieldLabel>Purchase value</ReFieldLabel>
        <NumericMoneyInput
          value={row.purchaseValue}
          onChange={(n) => onChange(row.id, { purchaseValue: n })}
          className={ReInputClassName}
        />
      </div>
      <div>
        <ReFieldLabel>Current value</ReFieldLabel>
        <NumericMoneyInput
          value={row.estimatedValue}
          onChange={(n) => onChange(row.id, { estimatedValue: n })}
          className={ReInputClassName}
        />
      </div>
      <div>
        <ReFieldLabel>Annual rental income (optional)</ReFieldLabel>
        <NumericMoneyInput
          value={row.annualRentalIncome}
          onChange={(n) => onChange(row.id, { annualRentalIncome: n })}
          className={ReInputClassName}
        />
      </div>
      <div>
        <ReFieldLabel>Expected annual appreciation %</ReFieldLabel>
        <NumericMoneyInput
          value={row.annualAppreciationEstimatePct}
          onChange={(n) => onChange(row.id, { annualAppreciationEstimatePct: n })}
          variant="percent"
          className={ReInputClassName}
        />
      </div>
      <PortfolioIsoDateField
        label="Acquired date"
        value={row.acquiredDate}
        onChange={(v) => onChange(row.id, { acquiredDate: v })}
        className="w-full sm:max-w-none"
      />
      <button
        type="button"
        onClick={onDone}
        className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-sm font-black text-emerald-950"
      >
        Done
      </button>
    </ReGlass>
  );
}

function AnalyticsTab({
  row,
  metrics,
  growth,
}: {
  row: RealEstateRow;
  metrics: ReturnType<typeof propertyCardMetrics>;
  growth: { label: string; value: number }[];
}) {
  const cagr = metrics.cagr ?? reImpliedAnnualGrowthPct(row.purchaseValue, row.estimatedValue, row.acquiredDate);
  const holding = reHoldingYrMo(row.acquiredDate);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <MetricTile label="CAGR" value={cagr != null ? `${cagr.toFixed(1)}%` : "—"} tone="lime" />
        <MetricTile label="Rental yield" value={metrics.rentalYield != null ? `${metrics.rentalYield.toFixed(1)}%` : "—"} />
        <MetricTile
          label="Annual appreciation"
          value={
            row.annualAppreciationEstimatePct != null
              ? `${row.annualAppreciationEstimatePct.toFixed(1)}%`
              : "—"
          }
        />
        <MetricTile label="Portfolio growth" value={metrics.roi != null ? `${metrics.roi.toFixed(1)}% ROI` : "—"} />
      </div>
      {holding ? (
        <p className="text-center text-xs font-semibold text-emerald-200/55">
          Held {holding.years} years {holding.months} months
        </p>
      ) : null}
      <ReGlass className="p-4">
        <p className="mb-2 text-xs font-black uppercase tracking-wider text-emerald-200/55">Value growth</p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={growth}>
              <defs>
                <linearGradient id="rePropGrow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(52,211,153,0.08)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "rgba(167,243,208,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Tooltip
                contentStyle={{
                  background: "#04140f",
                  border: "1px solid rgba(52,211,153,0.25)",
                  borderRadius: 12,
                  fontSize: 11,
                }}
                formatter={(v: number) => [formatReCcy(v, row.currency), "Value"]}
              />
              <Area type="monotone" dataKey="value" stroke="#6ee7b7" strokeWidth={2.2} fill="url(#rePropGrow)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ReGlass>
    </div>
  );
}

function TransactionsTab({
  row,
  ledger,
  onChange,
  onMutate,
}: {
  row: RealEstateRow;
  ledger: readonly PortfolioLedgerEntry[];
  onChange: (id: string, patch: Partial<RealEstateRow>) => void;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<RealEstatePropertyTxnKind>("rental_income");
  const [amount, setAmount] = useState<number | undefined>();
  const [fees, setFees] = useState<number | undefined>();
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState<PortfolioDisplayCurrency>(row.currency);

  const propertyTxns = row.propertyTransactions ?? [];
  const ledgerTxns = ledger.filter((e) => e.bucket === "real_estate" && e.rowId === row.id);

  type TimelineItem = {
    id: string;
    date: string;
    label: string;
    amount: number;
    currency: string;
    tone: "in" | "out";
    source: "property" | "ledger";
  };

  const timeline: TimelineItem[] = [
    ...propertyTxns.map((t) => {
      const meta = REAL_ESTATE_TXN_KINDS.find((k) => k.value === t.kind);
      return {
        id: t.id,
        date: t.date,
        label: meta?.label ?? t.kind,
        amount: t.amount,
        currency: t.currency,
        tone: meta?.tone ?? "out",
        source: "property" as const,
      };
    }),
    ...ledgerTxns.map((e) => ({
      id: e.id,
      date: e.tradeDate,
      label: e.ledgerAction || (e.txType === "buy" ? "Buy property" : "Sell property"),
      amount: e.quantity * e.unitPrice,
      currency: e.currency,
      tone: (e.txType === "sell" ? "in" : "out") as "in" | "out",
      source: "ledger" as const,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const submit = () => {
    if (amount == null || !(amount > 0)) {
      toast.error("Enter a valid amount");
      return;
    }
    if (kind === "purchase" || kind === "sale") {
      const payload = { amount, tradeDate: date, fees, notes: notes.trim() || undefined };
      const ok =
        kind === "purchase"
          ? onMutate((s) => recordRealEstateBuyProperty(s, row.id, payload))
          : onMutate((s) => recordRealEstateSellProperty(s, row.id, payload));
      if (!ok) {
        toast.error(kind === "sale" ? "Sell exceeds property value or invalid date." : "Could not record purchase.");
        return;
      }
    }

    const txns = row.propertyTransactions ?? [];
    if (txns.length >= REAL_ESTATE_TXNS_MAX) {
      toast.error(`Transaction history capped at ${REAL_ESTATE_TXNS_MAX}.`);
      return;
    }
    const next: RealEstatePropertyTxn = {
      id: newId(),
      kind,
      amount,
      currency,
      date,
      notes: notes.trim() || undefined,
      fees,
    };
    onChange(row.id, { propertyTransactions: [...txns, next] });
    setAmount(undefined);
    setFees(undefined);
    setNotes("");
    setOpen(false);
    toast.success("Transaction recorded");
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-sm font-black text-emerald-950"
      >
        <Plus size={16} /> Add Transaction
      </button>

      {open ? (
        <ReGlass className="space-y-3 p-4">
          <div>
            <ReFieldLabel>Type</ReFieldLabel>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as RealEstatePropertyTxnKind)}
              className={ReInputClassName}
            >
              {REAL_ESTATE_TXN_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <ReFieldLabel>Currency</ReFieldLabel>
            <CurrencySelect value={currency} onChange={setCurrency} />
          </div>
          <div>
            <ReFieldLabel>Amount</ReFieldLabel>
            <NumericMoneyInput value={amount} onChange={setAmount} className={ReInputClassName} />
          </div>
          <div>
            <ReFieldLabel>Fees (optional)</ReFieldLabel>
            <NumericMoneyInput value={fees} onChange={setFees} className={ReInputClassName} />
          </div>
          <PortfolioIsoDateField label="Date" value={date} onChange={(v) => setDate(v ?? todayIso())} className="w-full sm:max-w-none" />
          <div>
            <ReFieldLabel>Notes</ReFieldLabel>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={ReInputClassName} />
          </div>
          <button
            type="button"
            onClick={submit}
            className="min-h-11 w-full rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-sm font-black text-emerald-100"
          >
            Save transaction
          </button>
        </ReGlass>
      ) : null}

      {timeline.length === 0 ? (
        <ReGlass className="p-6 text-center text-sm font-semibold text-emerald-200/55">No transactions yet.</ReGlass>
      ) : (
        <div className="relative space-y-0 pl-4">
          <div className="absolute bottom-2 left-[7px] top-2 w-px bg-emerald-400/25" />
          {timeline.map((item) => (
            <div key={`${item.source}-${item.id}`} className="relative pb-4 pl-5">
              <span
                className={cn(
                  "absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-[#07111A]",
                  item.tone === "in" ? "bg-lime-400" : "bg-rose-400",
                )}
              />
              <ReGlass className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-emerald-50">{item.label}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-emerald-200/50">{item.date}</p>
                  </div>
                  <p
                    className={cn(
                      "text-sm font-black tabular-nums",
                      item.tone === "in" ? "text-lime-300" : "text-rose-300",
                    )}
                  >
                    {item.tone === "in" ? "+" : "−"}
                    {formatReCcy(item.amount, item.currency)}
                  </p>
                </div>
              </ReGlass>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
