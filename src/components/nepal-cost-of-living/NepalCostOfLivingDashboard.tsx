"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Calculator,
  Crown,
  Home,
  LineChart,
  Plus,
  MapPinned,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  Upload,
  Download,
  Trash2,
  Save,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WealthDashboardShell } from "@/components/portfolio/WealthDashboardShell";
import { formatNprInteger } from "@/components/savings-tracker/savings-currency";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { useCountUpNumber } from "@/hooks/useCountUpNumber";
import { useLocalStorageJsonState } from "@/hooks/useLocalStorageJsonState";
import {
  COST_CATEGORY_FIELDS,
  DEFAULT_NEPAL_COST_CITIES,
  NEPAL_COST_STORAGE_KEY,
  createBlankCity,
  normalizeCityDatabase,
} from "@/lib/nepal-cost-data";
import {
  COST_CATEGORY_LABELS,
  DEFAULT_COMPARISON_CITY_IDS,
  NEPAL_LIFESTYLE_TEMPLATES,
  type LifestyleCost,
  type NepalCostLocation,
  type NepalCostLocationId,
  type NepalLifestyleId,
  cityCostSnapshot,
  costForecastSeries,
  futureFireCorpus,
  lifestyleById,
  locationById,
  monthlyCost,
  scaledLifestyleCost,
} from "@/lib/nepal-cost-of-living";

const chartColors = ["#10b981", "#22d3ee", "#f59e0b", "#60a5fa", "#f472b6", "#a3e635"];
const MAP_VIEWBOX = { width: 960, height: 420 };
const MAP_BOUNDS = { minLon: 80.02, maxLon: 88.24, minLat: 26.25, maxLat: 30.55 };
const NEPAL_OUTLINE_COORDS: Array<[number, number]> = [
  [80.058, 30.199],
  [80.416, 30.568],
  [81.031, 30.354],
  [81.525, 30.422],
  [82.105, 30.339],
  [82.421, 29.945],
  [82.954, 30.016],
  [83.363, 29.797],
  [83.951, 29.286],
  [84.744, 29.244],
  [85.116, 28.642],
  [85.621, 28.204],
  [86.176, 27.928],
  [86.759, 28.111],
  [87.343, 27.822],
  [87.857, 27.876],
  [88.135, 27.881],
  [88.201, 27.445],
  [88.105, 26.81],
  [87.287, 26.397],
  [86.705, 26.434],
  [86.011, 26.63],
  [85.251, 26.726],
  [84.675, 27.041],
  [84.091, 27.491],
  [83.304, 27.364],
  [82.719, 27.495],
  [81.909, 27.963],
  [81.242, 28.067],
  [80.651, 28.612],
  [80.058, 28.837],
  [80.148, 29.31],
  [80.058, 30.199],
];

function compactNpr(value: number): string {
  if (value >= 10_000_000) return `रु ${(value / 10_000_000).toFixed(2)}Cr`;
  if (value >= 100_000) return `रु ${(value / 100_000).toFixed(1)}L`;
  return formatNprInteger(value);
}

function tooltipNpr(value: number): string {
  if (value >= 1_000_000) return `₨${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
  return `₨${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value))}`;
}

function projectNepalCoordinate(longitude: number, latitude: number) {
  const x = ((longitude - MAP_BOUNDS.minLon) / (MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon)) * MAP_VIEWBOX.width;
  const y = ((MAP_BOUNDS.maxLat - latitude) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * MAP_VIEWBOX.height;
  return { x, y };
}

function outlinePathFromCoordinates(coords: Array<[number, number]>): string {
  return coords
    .map(([longitude, latitude], index) => {
      const point = projectNepalCoordinate(longitude, latitude);
      return `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    })
    .join(" ");
}

function Field({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200/80">{label}</span>
      <span className="flex min-w-0 items-center overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm ring-1 ring-white/70 dark:border-white/10 dark:bg-white/[0.06] dark:ring-white/5">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-black text-slate-950 outline-none dark:text-white"
        />
        {suffix ? <span className="shrink-0 px-3 text-xs font-black text-slate-500 dark:text-zinc-400">{suffix}</span> : null}
      </span>
    </label>
  );
}

function AnimatedMetric({
  label,
  value,
  format,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  format: (value: number) => string;
  hint: string;
  icon: LucideIcon;
}) {
  const display = useCountUpNumber(value, { durationMs: 1050 });

  return (
    <motion.div
      layout
      className="rounded-3xl border border-white/55 bg-white/76 p-4 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.55)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.07]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200/70">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">{format(display)}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-200">
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500 dark:text-zinc-400">{hint}</p>
    </motion.div>
  );
}

function DashboardPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-[2rem] border border-white/55 bg-white/76 p-4 shadow-[0_28px_90px_-45px_rgba(15,23,42,0.55)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.065] sm:p-5 lg:p-6 ${className}`}
    >
      {children}
    </motion.section>
  );
}

function PanelTitle({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-200">
          <Icon size={18} />
        </span>
        <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white sm:text-xl">{title}</h2>
      </div>
      <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600 dark:text-zinc-400">{subtitle}</p>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-full min-h-[240px] animate-pulse rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-100 to-emerald-50 dark:border-white/10 dark:from-white/[0.07] dark:to-emerald-400/[0.04]" />
  );
}

function NepalCountryOutline() {
  const outlinePath = outlinePathFromCoordinates(NEPAL_OUTLINE_COORDS);

  return (
    <svg className="h-full w-full drop-shadow-[0_26px_42px_rgba(6,78,59,0.28)] transition-transform duration-500 group-hover:scale-[1.035]" viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`} fill="none" aria-hidden>
      <path
        d={`${outlinePath} Z`}
        fill="url(#nepalRealMapGradient)"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="nepalRealMapGradient" x1="120" x2="860" y1="60" y2="360" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset="0.48" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function InteractiveNepalMap({
  cities,
  selectedId,
  comparisonIds,
  onComparisonToggle,
  onSelect,
  snapshots,
}: {
  cities: NepalCostLocation[];
  selectedId: NepalCostLocationId;
  comparisonIds: NepalCostLocationId[];
  onComparisonToggle: (id: NepalCostLocationId) => void;
  onSelect: (id: NepalCostLocationId) => void;
  snapshots: Map<NepalCostLocationId, ReturnType<typeof cityCostSnapshot>>;
}) {
  const markerCities = cities.filter((city) => city.latitude != null && city.longitude != null);
  const comparisonChoices = DEFAULT_COMPARISON_CITY_IDS.map((id) => cities.find((city) => city.id === id)).filter(
    (city): city is NepalCostLocation => city != null,
  );
  const selectedCity = cities.find((city) => city.id === selectedId) ?? cities[0];

  return (
    <div className="group relative min-h-[360px] overflow-hidden rounded-[2rem] border border-emerald-200/80 bg-[linear-gradient(135deg,#dff8ef_0%,#bdeee5_45%,#ecfdf5_100%)] p-3 shadow-inner dark:border-white/10 dark:bg-[linear-gradient(135deg,#04251d_0%,#06372d_48%,#071c18_100%)] sm:min-h-[450px] sm:p-5">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,118,110,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,118,110,0.08)_1px,transparent_1px)] bg-[size:44px_44px] dark:bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)]" />
      <div className="absolute left-4 top-4 z-20 rounded-2xl border border-white/60 bg-white/78 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-900 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.08] dark:text-emerald-100">
        Real Nepal SVG Map
      </div>
      <div className="absolute inset-x-3 top-[15%] h-[58%] sm:inset-x-8">
        <NepalCountryOutline />
      </div>
      {markerCities.map((city) => {
        const active = city.id === selectedId;
        const snapshot = snapshots.get(city.id);
        const point = projectNepalCoordinate(city.longitude ?? 0, city.latitude ?? 0);
        const left = 3 + (point.x / MAP_VIEWBOX.width) * 94;
        const top = 15 + (point.y / MAP_VIEWBOX.height) * 58;
        return (
          <motion.button
            key={city.id}
            type="button"
            onClick={() => onSelect(city.id)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="group/marker absolute z-20 -translate-x-1/2 -translate-y-1/2 text-left"
            style={{ left: `${left}%`, top: `${top}%` }}
            aria-label={`Select ${city.label}`}
          >
            <span
              className={`relative flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 shadow-lg backdrop-blur-xl transition sm:px-3 ${
                active
                  ? "border-amber-200 bg-amber-300 text-slate-950 shadow-[0_0_34px_rgba(251,191,36,0.95)]"
                  : "border-white/70 bg-white/84 text-emerald-950 hover:bg-white dark:border-white/20 dark:bg-white/14 dark:text-white dark:hover:bg-white/22"
              }`}
            >
              {active ? <span className="absolute inset-[-8px] animate-ping rounded-full border border-amber-300/70" /> : null}
              <span className={`relative h-2.5 w-2.5 rounded-full ${active ? "bg-slate-950" : "bg-emerald-500 dark:bg-emerald-300"}`} />
              <span className="text-[10px] font-black uppercase tracking-[0.12em] sm:text-xs">{city.shortLabel}</span>
            </span>
            {snapshot ? (
              <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-56 -translate-x-1/2 rounded-2xl border border-white/70 bg-white/95 p-3 text-slate-950 shadow-2xl backdrop-blur-xl group-hover/marker:block dark:border-white/10 dark:bg-slate-950/95 dark:text-white">
                <span className="block text-sm font-black">{city.label}</span>
                <span className="mt-2 block text-xs font-bold text-slate-600 dark:text-zinc-300">Monthly Cost: {tooltipNpr(snapshot.monthly)}</span>
                <span className="block text-xs font-bold text-slate-600 dark:text-zinc-300">Annual Cost: {tooltipNpr(snapshot.annual)}</span>
                <span className="block text-xs font-bold text-slate-600 dark:text-zinc-300">FIRE Corpus: {tooltipNpr(snapshot.fireCorpus)}</span>
              </span>
            ) : null}
          </motion.button>
        );
      })}
      <div className="absolute bottom-4 left-4 right-4 z-20 grid gap-3 rounded-3xl border border-white/70 bg-white/82 p-4 text-slate-950 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/72 dark:text-white lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-200/80">Selected City</p>
          <p className="mt-1 text-2xl font-black">{selectedCity?.label ?? "Nepal"}</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600 dark:text-zinc-300">{selectedCity?.lifestyleNote ?? "Choose a city to update costs."}</p>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">Compare Cities</p>
          <div className="flex flex-wrap gap-2">
            {comparisonChoices.map((city) => (
              <label key={city.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-emerald-200 bg-white/72 px-3 py-2 text-xs font-black text-emerald-950 shadow-sm dark:border-white/10 dark:bg-white/[0.08] dark:text-white">
                <input
                  type="checkbox"
                  checked={comparisonIds.includes(city.id)}
                  onChange={() => onComparisonToggle(city.id)}
                  className="h-3.5 w-3.5 accent-emerald-600"
                />
                {city.label}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LifestyleCard({
  id,
  selected,
  costs,
  onSelect,
}: {
  id: NepalLifestyleId;
  selected: boolean;
  costs: LifestyleCost;
  onSelect: (id: NepalLifestyleId) => void;
}) {
  const lifestyle = lifestyleById(id);
  const totalMonthly = monthlyCost(costs);

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(id)}
      layout
      whileHover={{ y: -7, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      className={`group flex h-full flex-col rounded-[1.8rem] border p-4 text-left shadow-[0_22px_70px_-42px_rgba(15,23,42,0.8)] transition sm:p-5 ${
        selected
          ? "border-emerald-400/70 bg-emerald-50/90 dark:border-emerald-300/35 dark:bg-emerald-400/[0.11]"
          : "border-white/55 bg-white/70 hover:border-emerald-300/70 dark:border-white/10 dark:bg-white/[0.055] dark:hover:border-emerald-300/25"
      }`}
    >
      <div className={`mb-4 h-1.5 w-24 rounded-full bg-gradient-to-r ${lifestyle.accent}`} />
      <h3 className="text-lg font-black text-slate-950 dark:text-white">{lifestyle.title}</h3>
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-zinc-400">{lifestyle.subtitle}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/75 p-3 dark:bg-white/[0.07]">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400">Monthly</p>
          <p className="mt-1 text-lg font-black text-emerald-800 dark:text-emerald-200">{compactNpr(totalMonthly)}</p>
        </div>
        <div className="rounded-2xl bg-white/75 p-3 dark:bg-white/[0.07]">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400">Annual</p>
          <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{compactNpr(totalMonthly * 12)}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        {(["housing", "food", "transport", "utilities", "healthcare"] as const).map((category) => (
          <div key={category} className="flex items-center justify-between rounded-2xl bg-white/58 px-3 py-2 dark:bg-white/[0.055]">
            <span className="font-bold text-slate-600 dark:text-zinc-300">{COST_CATEGORY_LABELS[category]}</span>
            <span className="font-black text-slate-950 dark:text-white">{compactNpr(costs[category])}</span>
          </div>
        ))}
      </div>
    </motion.button>
  );
}

function CityRankCard({
  rank,
  city,
  selected,
  onSelect,
}: {
  rank: number;
  city: ReturnType<typeof cityCostSnapshot> & { note: string };
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.985 }}
      className={`flex items-center gap-3 rounded-3xl border p-4 text-left transition ${
        selected
          ? "border-amber-300 bg-amber-50 text-slate-950 shadow-[0_18px_60px_-34px_rgba(245,158,11,0.8)] dark:border-amber-200/35 dark:bg-amber-300/[0.12] dark:text-white"
          : "border-slate-200 bg-white/70 text-slate-700 hover:border-emerald-200 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300"
      }`}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-sm font-black text-white">#{rank}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-black">{city.label}</span>
        <span className="mt-1 block text-xs font-semibold opacity-75">{city.note}</span>
      </span>
      <span className="text-right">
        <span className="block text-lg font-black">{city.valueIndex}</span>
        <span className="block text-[10px] font-black uppercase tracking-widest opacity-60">Index</span>
      </span>
    </motion.button>
  );
}

function AdminTextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm font-bold text-slate-950 outline-none focus:border-emerald-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
      />
    </label>
  );
}

function AdminNumberInput({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">{label}</span>
      <input
        type="number"
        value={value ?? ""}
        step={step}
        onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
        className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm font-bold text-slate-950 outline-none focus:border-emerald-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
      />
    </label>
  );
}

function ManageCitiesPanel({
  cities,
  selectedCityId,
  onClose,
  onSave,
}: {
  cities: NepalCostLocation[];
  selectedCityId: NepalCostLocationId;
  onClose: () => void;
  onSave: (cities: NepalCostLocation[]) => void;
}) {
  const [draftCities, setDraftCities] = useState(() => normalizeCityDatabase(cities));
  const [editingCityId, setEditingCityId] = useState<NepalCostLocationId>(() => selectedCityId);
  const [jsonText, setJsonText] = useState("");
  const editingCity = draftCities.find((city) => city.id === editingCityId) ?? draftCities[0];

  const patchCity = (id: NepalCostLocationId, patch: Partial<NepalCostLocation>) => {
    setDraftCities((current) => current.map((city) => (city.id === id ? { ...city, ...patch } : city)));
  };

  const patchCost = (id: NepalCostLocationId, category: keyof LifestyleCost, value: number) => {
    setDraftCities((current) =>
      current.map((city) =>
        city.id === id
          ? {
              ...city,
              costs: { ...city.costs, [category]: Math.max(0, Math.round(value || 0)) },
            }
          : city,
      ),
    );
  };

  const addCity = () => {
    const next = createBlankCity("Custom City");
    let id = next.id;
    if (draftCities.some((city) => city.id === id)) id = `${id}-${Date.now()}`;
    const city = { ...next, id };
    setDraftCities((current) => [...current, city]);
    setEditingCityId(city.id);
  };

  const deleteCity = (id: NepalCostLocationId) => {
    if (draftCities.length <= 1) return;
    const next = draftCities.filter((city) => city.id !== id);
    setDraftCities(next);
    if (editingCityId === id) setEditingCityId(next[0]?.id ?? "");
  };

  const importJson = () => {
    try {
      const imported = normalizeCityDatabase(JSON.parse(jsonText));
      setDraftCities(imported);
      setEditingCityId(imported[0]?.id ?? "");
    } catch {
      setJsonText("Invalid JSON. Paste an exported city database array and try again.");
    }
  };

  const exportJson = () => {
    const payload = JSON.stringify(normalizeCityDatabase(draftCities), null, 2);
    setJsonText(payload);
    if (typeof window === "undefined") return;
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fire-nepal-cost-cities.json";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const saveChanges = () => {
    onSave(normalizeCityDatabase(draftCities));
  };

  if (!editingCity) return null;

  return (
    <DashboardPanel>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <PanelTitle
          icon={Settings2}
          title="Admin Cost Editor"
          subtitle="Edit monthly city costs, add custom Nepal cities or districts, delete records, and import/export the database as JSON."
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={addCity} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-900/20">
            <Plus size={16} /> Add New City
          </button>
          <button type="button" onClick={saveChanges} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white dark:bg-white dark:text-slate-950">
            <Save size={16} /> Save Changes
          </button>
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-200">
            Close
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
          {draftCities.map((city) => (
            <button
              key={city.id}
              type="button"
              onClick={() => setEditingCityId(city.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition ${
                city.id === editingCity.id
                  ? "border-emerald-400 bg-emerald-50 text-emerald-950 dark:border-emerald-300/35 dark:bg-emerald-300/[0.12] dark:text-white"
                  : "border-slate-200 bg-white/64 text-slate-700 hover:border-emerald-200 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">{city.label}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{city.shortLabel}</span>
              </span>
              <span className="text-xs font-black">{compactNpr(monthlyCost(city.costs))}</span>
            </button>
          ))}
        </div>

        <div className="space-y-5">
          <div className="rounded-[1.6rem] border border-slate-200 bg-white/64 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-black text-slate-950 dark:text-white">Edit Existing City</p>
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Changes are staged until you press Save Changes.</p>
              </div>
              <button
                type="button"
                onClick={() => deleteCity(editingCity.id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"
              >
                <Trash2 size={15} /> Delete City
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <AdminTextInput
                label="City / District Name"
                value={editingCity.label}
                onChange={(value) => patchCity(editingCity.id, { label: value })}
              />
              <AdminTextInput label="Short Label" value={editingCity.shortLabel} onChange={(value) => patchCity(editingCity.id, { shortLabel: value.slice(0, 6).toUpperCase() })} />
              <AdminNumberInput label="Latitude" value={editingCity.latitude} step={0.0001} onChange={(value) => patchCity(editingCity.id, { latitude: value })} />
              <AdminNumberInput label="Longitude" value={editingCity.longitude} step={0.0001} onChange={(value) => patchCity(editingCity.id, { longitude: value })} />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <AdminNumberInput label="Healthcare Score" value={editingCity.healthcareScore} onChange={(value) => patchCity(editingCity.id, { healthcareScore: value ?? 70 })} />
              <AdminNumberInput label="Climate Score" value={editingCity.climateScore} onChange={(value) => patchCity(editingCity.id, { climateScore: value ?? 70 })} />
              <AdminNumberInput label="Connectivity Score" value={editingCity.connectivityScore} onChange={(value) => patchCity(editingCity.id, { connectivityScore: value ?? 70 })} />
              <AdminNumberInput label="Safety Score" value={editingCity.safetyScore} onChange={(value) => patchCity(editingCity.id, { safetyScore: value ?? 70 })} />
            </div>

            <label className="mt-4 flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">City Note</span>
              <textarea
                value={editingCity.lifestyleNote}
                onChange={(event) => patchCity(editingCity.id, { lifestyleNote: event.target.value })}
                rows={3}
                className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm font-bold text-slate-950 outline-none focus:border-emerald-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              />
            </label>
          </div>

          <div className="rounded-[1.6rem] border border-slate-200 bg-white/64 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-base font-black text-slate-950 dark:text-white">Monthly Cost Categories</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {COST_CATEGORY_FIELDS.map((category) => (
                <AdminNumberInput
                  key={category}
                  label={`${COST_CATEGORY_LABELS[category]} Cost`}
                  value={editingCity.costs[category]}
                  onChange={(value) => patchCost(editingCity.id, category, value ?? 0)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-slate-200 bg-white/64 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-3 flex flex-wrap gap-2">
              <button type="button" onClick={exportJson} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/[0.1] dark:text-emerald-100">
                <Download size={15} /> Export JSON
              </button>
              <button type="button" onClick={importJson} className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 dark:border-cyan-300/20 dark:bg-cyan-300/[0.1] dark:text-cyan-100">
                <Upload size={15} /> Import JSON
              </button>
            </div>
            <textarea
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              placeholder="Paste exported city database JSON here, or click Export JSON to generate it."
              rows={8}
              className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 font-mono text-xs text-slate-950 outline-none focus:border-emerald-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
            />
          </div>
        </div>
      </div>
    </DashboardPanel>
  );
}

export function NepalCostOfLivingDashboard() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const gradientId = useId().replace(/:/g, "");
  const [cities, setCities, citiesHydrated] = useLocalStorageJsonState<NepalCostLocation[]>({
    storageKey: NEPAL_COST_STORAGE_KEY,
    getDefault: () => DEFAULT_NEPAL_COST_CITIES,
    sanitize: normalizeCityDatabase,
  });
  const [chartsReady, setChartsReady] = useState(false);
  const [locationId, setLocationId] = useState<NepalCostLocationId>("kathmandu");
  const [lifestyleId, setLifestyleId] = useState<NepalLifestyleId>("city");
  const [inflationRate, setInflationRate] = useState(6);
  const [projectionYears, setProjectionYears] = useState(10);
  const [withdrawalRate, setWithdrawalRate] = useState(4);
  const [comparisonIds, setComparisonIds] = useState<NepalCostLocationId[]>(DEFAULT_COMPARISON_CITY_IDS);
  const [manageCitiesOpen, setManageCitiesOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setChartsReady(true), 420);
    return () => window.clearTimeout(timer);
  }, []);

  const location = locationById(locationId, cities);
  const lifestyle = lifestyleById(lifestyleId);
  const selectedCosts = useMemo(() => scaledLifestyleCost(lifestyle, location), [lifestyle, location]);
  const selectedMonthlyCost = monthlyCost(selectedCosts);
  const selectedAnnualCost = selectedMonthlyCost * 12;
  const liveFireCorpus = futureFireCorpus(selectedMonthlyCost, inflationRate, projectionYears, withdrawalRate / 100);
  const selectedRetirementScore = cityCostSnapshot(location, lifestyle, inflationRate).retirementScore;

  const lifestyleCosts = useMemo(
    () =>
      NEPAL_LIFESTYLE_TEMPLATES.map((template) => ({
        id: template.id,
        costs: scaledLifestyleCost(template, location),
      })),
    [location],
  );

  const allCitySnapshots = useMemo(
    () =>
      cities.map((city) => ({
        ...cityCostSnapshot(city, lifestyle, inflationRate),
        note: city.lifestyleNote,
      })),
    [cities, inflationRate, lifestyle],
  );

  const snapshotMap = useMemo(
    () => new Map(allCitySnapshots.map((snapshot) => [snapshot.id, snapshot])),
    [allCitySnapshots],
  );

  const rankedCities = useMemo(() => [...allCitySnapshots].sort((a, b) => b.valueIndex - a.valueIndex), [allCitySnapshots]);

  const corpusComparisonData = useMemo(
    () =>
      allCitySnapshots.map((city) => ({
        city: city.shortLabel,
        corpus: Math.round(city.fireCorpus),
        projectedCorpus: Math.round(city.corpus10Year),
      })),
    [allCitySnapshots],
  );

  const comparisonData = useMemo(
    () =>
      comparisonIds.map((id) => {
        const city = locationById(id, cities);
        const snapshot = cityCostSnapshot(city, lifestyle, inflationRate);
        return {
          city: city.label,
          monthly: snapshot.monthly,
          fireCorpus: snapshot.fireCorpus,
          score: snapshot.retirementScore,
        };
      }),
    [cities, comparisonIds, inflationRate, lifestyle],
  );

  const forecastData = useMemo(() => costForecastSeries(selectedMonthlyCost, inflationRate), [inflationRate, selectedMonthlyCost]);

  const breakdownData = useMemo(
    () =>
      Object.entries(selectedCosts).map(([key, value], index) => ({
        name: COST_CATEGORY_LABELS[key as keyof typeof COST_CATEGORY_LABELS],
        value,
        fill: chartColors[index % chartColors.length],
      })),
    [selectedCosts],
  );

  const selectedCityRanking = rankedCities.findIndex((city) => city.id === locationId) + 1;
  const fiveYearMonthly = forecastData[5]?.monthly ?? selectedMonthlyCost;
  const tenYearMonthly = forecastData[10]?.monthly ?? selectedMonthlyCost;

  const toggleComparisonCity = (id: NepalCostLocationId) => {
    setComparisonIds((current) => {
      if (current.includes(id)) {
        return current.length === 1 ? current : current.filter((cityId) => cityId !== id);
      }
      return [...current, id];
    });
  };

  const saveEditedCities = (nextCities: NepalCostLocation[]) => {
    const normalized = normalizeCityDatabase(nextCities);
    setCities(normalized);
    if (!normalized.some((city) => city.id === locationId)) {
      setLocationId(normalized[0]?.id ?? "kathmandu");
    }
    setComparisonIds((current) => {
      const availableIds = new Set(normalized.map((city) => city.id));
      const next = current.filter((id) => availableIds.has(id));
      return next.length ? next : DEFAULT_COMPARISON_CITY_IDS.filter((id) => availableIds.has(id));
    });
  };

  return (
    <WealthDashboardShell
      brand={{ tagline: "Cost Intelligence", iconGradient: "from-emerald-300 to-cyan-300" }}
      footerNote="Nepal Cost of Living Intelligence focuses on lifestyle costs, inflation-adjusted FIRE corpus, and city retirement fit estimates for Nepal."
    >
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }} className="space-y-5 sm:space-y-6">
        <section className="relative overflow-hidden rounded-[2.2rem] border border-white/60 bg-gradient-to-br from-emerald-950 via-emerald-800 to-slate-950 p-5 text-white shadow-[0_34px_120px_-50px_rgba(5,46,22,0.85)] sm:p-7 lg:p-9">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.22),transparent_26rem),radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.22),transparent_22rem)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] backdrop-blur-xl">
              <Sparkles size={15} />
              Nepal Cost Intelligence {citiesHydrated ? "· Editable" : ""}
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-[-0.055em] sm:text-5xl lg:text-6xl">Nepal Cost of Living Intelligence</h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-relaxed text-emerald-50/82 sm:text-lg">City-by-city lifestyle costs, retirement ranking, inflation forecasts, and FIRE corpus planning for Nepal.</p>
            <button
              type="button"
              onClick={() => setManageCitiesOpen((open) => !open)}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/12 px-4 py-3 text-sm font-black text-white shadow-lg backdrop-blur-xl transition hover:bg-white/20"
            >
              <Settings2 size={17} />
              Manage Cities
            </button>
          </div>
        </section>

        {manageCitiesOpen ? (
          <ManageCitiesPanel
            cities={cities}
            selectedCityId={locationId}
            onClose={() => setManageCitiesOpen(false)}
            onSave={saveEditedCities}
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AnimatedMetric label="Monthly Cost" value={selectedMonthlyCost} format={compactNpr} hint={`${location.label} · ${lifestyle.title}`} icon={Home} />
          <AnimatedMetric label="Annual Cost" value={selectedAnnualCost} format={compactNpr} hint="Current-year lifestyle spend" icon={BarChart3} />
          <AnimatedMetric label="FIRE Corpus" value={liveFireCorpus} format={compactNpr} hint={`${projectionYears}Y @ ${inflationRate}% inflation`} icon={Calculator} />
          <AnimatedMetric label="Retirement Score" value={selectedRetirementScore} format={(value) => `${Math.round(value)}/100`} hint={`Rank #${selectedCityRanking} for ${lifestyle.title}`} icon={ShieldCheck} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <DashboardPanel>
            <PanelTitle icon={MapPinned} title="Interactive Nepal Map" subtitle="Click a city on the map to update lifestyle costs, rankings, corpus charts, and forecasts instantly." />
            <InteractiveNepalMap
              cities={cities}
              selectedId={locationId}
              comparisonIds={comparisonIds}
              onComparisonToggle={toggleComparisonCity}
              onSelect={setLocationId}
              snapshots={snapshotMap}
            />
          </DashboardPanel>

          <DashboardPanel>
            <PanelTitle icon={Trophy} title="Best Cities to Retire in Nepal" subtitle="Ranking blends affordability, healthcare, climate, connectivity, and safety for the selected lifestyle mode." />
            <div className="space-y-3">
              {rankedCities.slice(0, 5).map((city, index) => (
                <CityRankCard key={city.id} rank={index + 1} city={city} selected={city.id === locationId} onSelect={() => setLocationId(city.id)} />
              ))}
            </div>
          </DashboardPanel>
        </div>

        <DashboardPanel>
          <PanelTitle icon={Home} title="Lifestyle Modes" subtitle="Choose a Nepal lifestyle baseline. The city map and every chart recalculate from this selection." />
          <div className="grid gap-4 md:grid-cols-3">
            {lifestyleCosts.map((item) => (
              <LifestyleCard key={item.id} id={item.id} selected={item.id === lifestyleId} costs={item.costs} onSelect={setLifestyleId} />
            ))}
          </div>
        </DashboardPanel>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <DashboardPanel>
            <PanelTitle icon={Calculator} title="Inflation Impact Simulator" subtitle="Change inflation, forecast horizon, and withdrawal rate to recalculate the future Nepal FIRE corpus live." />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Inflation Rate" value={inflationRate} min={0} max={18} step={0.25} suffix="%" onChange={setInflationRate} />
              <Field label="Forecast Horizon" value={projectionYears} min={1} max={30} step={1} suffix="years" onChange={setProjectionYears} />
              <Field label="Withdrawal Rate" value={withdrawalRate} min={2.5} max={6} step={0.1} suffix="%" onChange={setWithdrawalRate} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <AnimatedMetric label="Today Corpus" value={(selectedMonthlyCost * 12) / (withdrawalRate / 100)} format={compactNpr} hint="No inflation applied" icon={LineChart} />
              <AnimatedMetric label="Future Corpus" value={liveFireCorpus} format={compactNpr} hint={`${projectionYears}-year inflation impact`} icon={TrendingUp} />
              <AnimatedMetric label="10Y Monthly Cost" value={tenYearMonthly} format={compactNpr} hint="Projected lifestyle spend" icon={Crown} />
            </div>
          </DashboardPanel>

          <DashboardPanel>
            <PanelTitle icon={BarChart3} title="Cost Breakdown" subtitle="Category-level view of the selected city and lifestyle." />
            <div className="h-[310px] sm:h-[340px]">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={breakdownData} dataKey="value" nameKey="name" innerRadius="54%" outerRadius="82%" paddingAngle={3} isAnimationActive animationDuration={900}>
                      {breakdownData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => compactNpr(Number(value))} contentStyle={{ borderRadius: 18, border: "1px solid rgba(16,185,129,0.2)", background: light ? "rgba(255,255,255,0.96)" : "rgba(2,24,18,0.96)" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ChartSkeleton />
              )}
            </div>
          </DashboardPanel>
        </div>

        <DashboardPanel>
          <PanelTitle icon={BarChart3} title="FIRE Corpus Comparison for All Cities" subtitle="Compare current 25x corpus and 10-year inflation-adjusted corpus across Nepal locations." />
          <div className="h-[360px] min-w-0">
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={corpusComparisonData} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
                  <CartesianGrid stroke={light ? "#dbe7e1" : "rgba(255,255,255,0.08)"} strokeDasharray="4 8" vertical={false} />
                  <XAxis dataKey="city" tickLine={false} axisLine={false} tick={{ fill: light ? "#475569" : "#a1a1aa", fontSize: 11, fontWeight: 800 }} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={compactNpr} tick={{ fill: light ? "#475569" : "#a1a1aa", fontSize: 11, fontWeight: 700 }} width={74} />
                  <Tooltip formatter={(value) => compactNpr(Number(value))} contentStyle={{ borderRadius: 18, border: "1px solid rgba(16,185,129,0.2)", background: light ? "rgba(255,255,255,0.96)" : "rgba(2,24,18,0.96)" }} />
                  <Bar dataKey="corpus" name="Today Corpus" fill="#10b981" radius={[12, 12, 4, 4]} isAnimationActive animationDuration={950} />
                  <Bar dataKey="projectedCorpus" name="10Y Corpus" fill="#f59e0b" radius={[12, 12, 4, 4]} isAnimationActive animationDuration={1150} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartSkeleton />
            )}
          </div>
        </DashboardPanel>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <DashboardPanel>
            <PanelTitle icon={LineChart} title="5-Year and 10-Year Forecast" subtitle="Projected monthly cost, annual cost, and FIRE corpus using the selected inflation rate." />
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <AnimatedMetric label="5Y Monthly Cost" value={fiveYearMonthly} format={compactNpr} hint="Mid-range cost forecast" icon={TrendingUp} />
              <AnimatedMetric label="10Y Monthly Cost" value={tenYearMonthly} format={compactNpr} hint="Long-range cost forecast" icon={TrendingUp} />
            </div>
            <div className="h-[320px]">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastData}>
                    <defs>
                      <linearGradient id={`${gradientId}-forecast`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={light ? "#dbe7e1" : "rgba(255,255,255,0.08)"} strokeDasharray="4 8" />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: light ? "#475569" : "#a1a1aa", fontSize: 11, fontWeight: 800 }} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={compactNpr} tick={{ fill: light ? "#475569" : "#a1a1aa", fontSize: 11, fontWeight: 700 }} width={74} />
                    <Tooltip formatter={(value) => compactNpr(Number(value))} contentStyle={{ borderRadius: 18, border: "1px solid rgba(16,185,129,0.2)", background: light ? "rgba(255,255,255,0.96)" : "rgba(2,24,18,0.96)" }} />
                    <Area type="monotone" dataKey="monthly" name="Monthly Cost" stroke="#10b981" fill={`url(#${gradientId}-forecast)`} strokeWidth={3} isAnimationActive animationDuration={1000} />
                    <Line type="monotone" dataKey="corpus" name="FIRE Corpus" stroke="#f59e0b" strokeWidth={3} dot={false} isAnimationActive animationDuration={1200} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ChartSkeleton />
              )}
            </div>
          </DashboardPanel>

          <DashboardPanel>
            <PanelTitle icon={MapPinned} title="Location Comparison Mode" subtitle="Select Kathmandu, Pokhara, and Chitwan from the map checkboxes to compare one or multiple cities." />
            <div className="h-[320px]">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ReLineChart data={comparisonData}>
                    <CartesianGrid stroke={light ? "#dbe7e1" : "rgba(255,255,255,0.08)"} strokeDasharray="4 8" />
                    <XAxis dataKey="city" tickLine={false} axisLine={false} tick={{ fill: light ? "#475569" : "#a1a1aa", fontSize: 11, fontWeight: 800 }} />
                    <YAxis yAxisId="money" tickLine={false} axisLine={false} tickFormatter={compactNpr} tick={{ fill: light ? "#475569" : "#a1a1aa", fontSize: 11, fontWeight: 700 }} width={72} />
                    <YAxis yAxisId="score" orientation="right" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: light ? "#475569" : "#a1a1aa", fontSize: 11, fontWeight: 700 }} width={36} />
                    <Tooltip formatter={(value, name) => (name === "Retirement Score" ? `${Number(value).toFixed(0)}/100` : compactNpr(Number(value)))} contentStyle={{ borderRadius: 18, border: "1px solid rgba(16,185,129,0.2)", background: light ? "rgba(255,255,255,0.96)" : "rgba(2,24,18,0.96)" }} />
                    <Line yAxisId="money" type="monotone" dataKey="monthly" name="Monthly Cost" stroke="#10b981" strokeWidth={3} isAnimationActive animationDuration={900} />
                    <Line yAxisId="money" type="monotone" dataKey="fireCorpus" name="FIRE Corpus" stroke="#f59e0b" strokeWidth={3} isAnimationActive animationDuration={1050} />
                    <Line yAxisId="score" type="monotone" dataKey="score" name="Retirement Score" stroke="#22d3ee" strokeWidth={3} isAnimationActive animationDuration={1200} />
                  </ReLineChart>
                </ResponsiveContainer>
              ) : (
                <ChartSkeleton />
              )}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {comparisonData.map((city) => (
                <button
                  key={city.city}
                  type="button"
                  onClick={() => setLocationId(cities.find((item) => item.label === city.city)?.id ?? cities[0]?.id ?? "kathmandu")}
                  className="rounded-3xl border border-slate-200 bg-white/70 p-4 text-left transition hover:border-emerald-300 dark:border-white/10 dark:bg-white/[0.05]"
                >
                  <p className="text-sm font-black text-slate-950 dark:text-white">{city.city}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-zinc-400">{compactNpr(city.monthly)} / month</p>
                  <p className="mt-2 text-lg font-black text-emerald-700 dark:text-emerald-200">{city.score}/100</p>
                </button>
              ))}
            </div>
          </DashboardPanel>
        </div>
      </motion.div>
    </WealthDashboardShell>
  );
}
