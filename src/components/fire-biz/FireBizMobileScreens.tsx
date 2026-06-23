"use client";

import { Filter, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useFireTheme } from "@/contexts/FireThemeContext";

export function FireBizCompactHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <header
      className={`relative overflow-hidden rounded-[1.35rem] border px-4 py-3.5 backdrop-blur-xl sm:rounded-[1.5rem] sm:px-5 sm:py-4 ${
        light
          ? "border-emerald-200/70 bg-white/90 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.12)]"
          : "border-emerald-400/12 bg-emerald-950/35 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
      }`}
      style={{ minHeight: 140, maxHeight: 160 }}
    >
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${
          light ? "bg-emerald-400/20" : "bg-emerald-500/15"
        }`}
        aria-hidden
      />
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">{eyebrow}</p>
      <h1 className={`mt-1 text-lg font-black leading-tight sm:text-xl ${light ? "text-slate-900" : "text-emerald-50"}`}>
        {title}
      </h1>
      {subtitle ? (
        <p className={`mt-1 line-clamp-2 text-[11px] font-semibold leading-snug sm:text-xs ${light ? "text-slate-600" : "text-emerald-200/65"}`}>
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

export function FireBizMobileTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <div
      className={`flex gap-1 overflow-x-auto rounded-2xl border p-1 backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        light ? "border-emerald-200/70 bg-white/80" : "border-emerald-400/12 bg-black/25"
      }`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`shrink-0 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wide transition sm:text-[11px] ${
              isActive
                ? light
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950 shadow-sm"
                : light
                  ? "text-slate-600 hover:bg-emerald-50"
                  : "text-emerald-200/70 hover:bg-white/[0.04]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function FireBizSearchFilterBar({
  search,
  onSearchChange,
  filterLabel,
  filterOptions,
  filterValue,
  onFilterChange,
  placeholder,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  filterLabel: string;
  filterOptions: { value: string; label: string }[];
  filterValue: string;
  onFilterChange: (v: string) => void;
  placeholder: string;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <div className="flex gap-2">
      <label className="relative min-w-0 flex-1">
        <Search
          size={16}
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${light ? "text-slate-400" : "text-emerald-200/50"}`}
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm font-semibold outline-none focus:ring-2 ${
            light
              ? "border-emerald-200/80 bg-white text-slate-900 focus:border-emerald-400 focus:ring-emerald-400/25"
              : "border-emerald-400/20 bg-black/30 text-white focus:border-emerald-400/50 focus:ring-emerald-400/20"
          }`}
        />
      </label>
      <label className="relative shrink-0">
        <Filter
          size={16}
          className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${light ? "text-slate-400" : "text-emerald-200/50"}`}
          aria-hidden
        />
        <select
          value={filterValue}
          onChange={(e) => onFilterChange(e.target.value)}
          aria-label={filterLabel}
          className={`appearance-none rounded-xl border py-2.5 pl-8 pr-7 text-[11px] font-bold outline-none ${
            light ? "border-emerald-200/80 bg-white text-slate-800" : "border-emerald-400/20 bg-black/30 text-white"
          }`}
        >
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

type TimelineItem = {
  id: string;
  label: string;
  sublabel: string;
  amount: number;
  date: string;
  type: string;
  href?: string;
  typeColor?: "emerald" | "teal" | "amber" | "rose";
};

const TYPE_BADGE: Record<string, string> = {
  sale: "bg-emerald-500/20 text-emerald-300",
  purchase: "bg-teal-500/20 text-teal-300",
  expense: "bg-rose-500/20 text-rose-300",
  payment: "bg-amber-500/20 text-amber-300",
};

export function FireBizTimelineList({
  items,
  emptyMessage,
  formatAmount,
}: {
  items: TimelineItem[];
  emptyMessage: string;
  formatAmount: (n: number) => string;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  if (items.length === 0) {
    return (
      <p
        className={`rounded-xl border border-dashed px-4 py-8 text-center text-sm font-semibold ${
          light ? "border-emerald-200/80 text-slate-600" : "border-emerald-400/20 text-emerald-200/60"
        }`}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="relative space-y-0">
      <div
        className={`absolute bottom-2 left-[11px] top-2 w-px ${light ? "bg-emerald-200/80" : "bg-emerald-400/20"}`}
        aria-hidden
      />
      {items.map((item) => {
        const content = (
          <>
            <div
              className={`absolute left-0 top-4 z-10 h-[9px] w-[9px] rounded-full ring-2 ${
                light ? "bg-emerald-500 ring-white" : "bg-lime-400 ring-[#04140f]"
              }`}
              aria-hidden
            />
            <div className="min-w-0 flex-1 pl-1">
              <div className="flex items-start justify-between gap-2">
                <p className={`truncate text-sm font-bold ${light ? "text-slate-900" : "text-emerald-50"}`}>{item.label}</p>
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase ${
                    TYPE_BADGE[item.type] ?? (light ? "bg-slate-100 text-slate-600" : "bg-white/10 text-emerald-200/70")
                  }`}
                >
                  {item.type}
                </span>
              </div>
              <p className={`mt-0.5 text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/55"}`}>
                {item.sublabel}
              </p>
            </div>
            <p className={`shrink-0 text-sm font-black tabular-nums ${light ? "text-emerald-700" : "text-lime-300"}`}>
              {formatAmount(item.amount)}
            </p>
          </>
        );

        const rowCls = `relative flex items-center gap-3 rounded-xl border px-3 py-2.5 pl-6 transition ${
          light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
        } ${item.href ? "active:scale-[0.99]" : ""}`;

        return (
          <li key={item.id} className="relative pb-2">
            {item.href ? (
              <Link href={item.href} className={rowCls}>
                {content}
              </Link>
            ) : (
              <div className={rowCls}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

type FabAction = { label: string; href: string; icon?: LucideIcon };

export function FireBizFabMenu({ actions, label }: { actions: FabAction[]; label: string }) {
  const [open, setOpen] = useState(false);
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      ) : null}
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-50 flex flex-col items-end gap-2 lg:bottom-8">
        {open
          ? actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => setOpen(false)}
                className={`flex min-h-[44px] items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-black shadow-lg transition active:scale-95 ${
                  light
                    ? "border-emerald-200/80 bg-white text-emerald-900"
                    : "border-emerald-400/20 bg-[#04140f]/95 text-emerald-50"
                }`}
              >
                {action.icon ? <action.icon size={18} /> : null}
                {action.label}
              </Link>
            ))
          : null}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/30 transition active:scale-95"
          aria-label={label}
          aria-expanded={open}
        >
          {open ? <X size={24} strokeWidth={2.5} /> : <Plus size={24} strokeWidth={2.5} />}
        </button>
      </div>
    </>
  );
}

export function FireBizSectionLink({
  label,
  description,
  href,
  icon: Icon,
  value,
}: {
  label: string;
  description?: string;
  href: string;
  icon: LucideIcon;
  value?: string;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <Link
      href={href}
      className={`flex min-h-[72px] items-center gap-3 rounded-2xl border px-3.5 py-3 transition active:scale-[0.98] ${
        light
          ? "border-emerald-200/70 bg-white/90 hover:border-emerald-400/40"
          : "border-emerald-400/15 bg-white/[0.04] hover:border-emerald-400/30"
      }`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
          light ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/20 text-lime-300"
        }`}
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className={`block text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>{label}</span>
        {description ? (
          <span className={`mt-0.5 block text-[11px] font-semibold ${light ? "text-slate-600" : "text-emerald-200/65"}`}>
            {description}
          </span>
        ) : null}
      </span>
      {value ? (
        <span className={`shrink-0 text-sm font-black tabular-nums ${light ? "text-emerald-700" : "text-lime-300"}`}>
          {value}
        </span>
      ) : null}
    </Link>
  );
}

export function FireBizRankList({
  title,
  items,
  emptyMessage,
  formatAmount,
}: {
  title: string;
  items: { name: string; amount: number }[];
  emptyMessage: string;
  formatAmount: (n: number) => string;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <div>
      <h3 className={`mb-2 text-[11px] font-black uppercase tracking-[0.14em] ${light ? "text-slate-600" : "text-emerald-400/80"}`}>
        {title}
      </h3>
      {items.length === 0 ? (
        <p className={`text-xs font-semibold ${light ? "text-slate-500" : "text-emerald-200/55"}`}>{emptyMessage}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li
              key={item.name}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[10px] font-black ${
                    light ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/20 text-lime-300"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`truncate text-sm font-bold ${light ? "text-slate-900" : "text-emerald-50"}`}>{item.name}</span>
              </span>
              <span className={`shrink-0 text-sm font-black tabular-nums ${light ? "text-emerald-700" : "text-lime-300"}`}>
                {formatAmount(item.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FireBizMobileScreen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`space-y-3.5 pb-4 lg:space-y-5 ${className ?? ""}`}>{children}</div>;
}
