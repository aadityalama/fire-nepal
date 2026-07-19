"use client";

import { Building2, ChevronRight, MapPin, Plus } from "lucide-react";
import { realEstateAllPhotos } from "@/components/portfolio/real-estate-documents";
import { propertyCardMetrics } from "@/components/portfolio/real-estate-portfolio-stats";
import type { RealEstateRow } from "@/components/portfolio/types";
import {
  formatReCcy,
  formatReSignedCcy,
  ReBadge,
  ReGlass,
  ReSectionTitle,
  RE_KIND_LABEL,
} from "@/components/portfolio/real-estate/RealEstateUi";

export function RealEstatePropertiesList({
  rows,
  onOpenProperty,
  onAdd,
}: {
  rows: RealEstateRow[];
  onOpenProperty: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-4 md:space-y-5">
      <ReSectionTitle
        title="My Properties"
        subtitle={`${rows.length} ${rows.length === 1 ? "property" : "properties"}`}
        action={
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 px-3.5 text-xs font-black text-emerald-950"
          >
            <Plus size={15} /> Add
          </button>
        }
      />

      {rows.length === 0 ? (
        <ReGlass className="p-8 text-center md:p-12">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300">
            <Building2 size={26} />
          </div>
          <p className="mt-4 text-sm font-semibold text-emerald-200/65">No properties yet</p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 text-sm font-black text-emerald-100"
          >
            <Plus size={16} /> Add your first property
          </button>
        </ReGlass>
      ) : (
        <>
          {/* Mobile: dense horizontal rows */}
          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <PropertyRowCard key={row.id} row={row} onOpen={() => onOpenProperty(row.id)} />
            ))}
          </div>

          {/* Tablet: 2-col media cards */}
          <div className="hidden gap-4 md:grid md:grid-cols-2 lg:hidden">
            {rows.map((row) => (
              <PropertyMediaCard key={row.id} row={row} onOpen={() => onOpenProperty(row.id)} />
            ))}
          </div>

          {/* Desktop: 3-col portfolio cards with tall thumbs */}
          <div className="hidden gap-4 lg:grid lg:grid-cols-3 xl:grid-cols-3">
            {rows.map((row) => (
              <PropertyMediaCard key={row.id} row={row} onOpen={() => onOpenProperty(row.id)} tall />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PropertyRowCard({ row, onOpen }: { row: RealEstateRow; onOpen: () => void }) {
  const m = propertyCardMetrics(row);
  const photos = realEstateAllPhotos(row);
  return (
    <ReGlass className="p-3.5" onClick={onOpen}>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-emerald-950/80 ring-1 ring-emerald-400/20">
          {photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-emerald-400/45">
              <Building2 size={24} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-black text-emerald-50">{row.name || "Untitled property"}</p>
            <ReBadge>{RE_KIND_LABEL[row.propertyType]}</ReBadge>
          </div>
          <p className="mt-1 flex items-center gap-1 truncate text-[11px] font-semibold text-emerald-200/55">
            <MapPin size={12} className="shrink-0" />
            {row.location?.trim() || "Location not set"}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] font-bold tabular-nums">
            <p className="text-emerald-200/50">
              Buy <span className="text-emerald-100">{formatReCcy(row.purchaseValue, row.currency)}</span>
            </p>
            <p className="text-emerald-200/50">
              Now <span className="text-lime-200">{formatReCcy(row.estimatedValue, row.currency)}</span>
            </p>
            <p className={m.profit != null && m.profit >= 0 ? "text-lime-300" : "text-rose-300"}>
              P/L {m.profit != null ? formatReSignedCcy(m.profit, row.currency) : "—"}
            </p>
            <p className="text-emerald-100">ROI {m.roi != null ? `${m.roi.toFixed(1)}%` : "—"}</p>
          </div>
        </div>
        <ChevronRight size={18} className="shrink-0 text-emerald-300/50" />
      </div>
    </ReGlass>
  );
}

function PropertyMediaCard({
  row,
  onOpen,
  tall,
}: {
  row: RealEstateRow;
  onOpen: () => void;
  tall?: boolean;
}) {
  const m = propertyCardMetrics(row);
  const photos = realEstateAllPhotos(row);
  return (
    <ReGlass className="overflow-hidden p-0" onClick={onOpen}>
      <div className={`relative bg-emerald-950/80 ${tall ? "aspect-[16/10]" : "aspect-[16/9]"}`}>
        {photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photos[0]} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-emerald-400/40">
            <Building2 size={36} />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <ReBadge>{RE_KIND_LABEL[row.propertyType]}</ReBadge>
        </div>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-black text-emerald-50">{row.name || "Untitled property"}</p>
            <p className="mt-1 flex items-center gap-1 truncate text-[11px] font-semibold text-emerald-200/55">
              <MapPin size={12} className="shrink-0" />
              {row.location?.trim() || "Location not set"}
            </p>
          </div>
          <ChevronRight size={18} className="mt-1 shrink-0 text-emerald-300/50" />
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-emerald-400/10 pt-3 text-[11px] font-bold tabular-nums">
          <div>
            <p className="text-emerald-200/45">Purchase</p>
            <p className="mt-0.5 text-emerald-100">{formatReCcy(row.purchaseValue, row.currency)}</p>
          </div>
          <div>
            <p className="text-emerald-200/45">Current</p>
            <p className="mt-0.5 text-lime-200">{formatReCcy(row.estimatedValue, row.currency)}</p>
          </div>
          <div>
            <p className="text-emerald-200/45">P/L</p>
            <p className={`mt-0.5 ${m.profit != null && m.profit >= 0 ? "text-lime-300" : "text-rose-300"}`}>
              {m.profit != null ? formatReSignedCcy(m.profit, row.currency) : "—"}
            </p>
          </div>
          <div>
            <p className="text-emerald-200/45">ROI</p>
            <p className="mt-0.5 text-emerald-100">{m.roi != null ? `${m.roi.toFixed(1)}%` : "—"}</p>
          </div>
        </div>
      </div>
    </ReGlass>
  );
}
