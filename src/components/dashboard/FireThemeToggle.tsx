"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FireThemeMode } from "@/contexts/FireThemeContext";
import { useFireTheme } from "@/contexts/FireThemeContext";

const OPTIONS: { id: FireThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Laptop },
];

type FireThemeToggleProps = {
  /** Sidebar: compact vertical stack. Header: horizontal pill */
  variant?: "sidebar" | "header";
  /** When sidebar is collapsed, icon-only trigger */
  collapsed?: boolean;
};

export function FireThemeToggle({ variant = "sidebar", collapsed = false }: FireThemeToggleProps) {
  const { mode, setMode, resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const t = window.setTimeout(() => document.addEventListener("mousedown", onDown, true), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDown, true);
    };
  }, [open]);

  const pick = useCallback(
    (m: FireThemeMode) => {
      setMode(m);
      setOpen(false);
    },
    [setMode],
  );

  const ActiveIcon = mode === "light" ? Sun : mode === "dark" ? Moon : Laptop;

  if (variant === "header") {
    return (
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition lg:h-9 lg:w-9 ${
            light
              ? "border-slate-200/90 bg-white/90 text-slate-800 shadow-sm hover:bg-slate-50"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
          }`}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Theme: change appearance"
        >
          <ActiveIcon size={18} strokeWidth={2.25} />
        </button>
        {open ? (
          <ul
            role="listbox"
            className={`absolute right-0 z-50 mt-2 min-w-[10.5rem] rounded-xl border py-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl ${
              light
                ? "border-slate-200/90 bg-white/95 text-slate-900"
                : "border-emerald-500/15 bg-[#04140f]/95 text-emerald-50"
            }`}
          >
            {OPTIONS.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={mode === opt.id}
                  onClick={() => pick(opt.id)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold transition ${
                    mode === opt.id
                      ? light
                        ? "bg-emerald-100 text-emerald-950"
                        : "bg-emerald-500/20 text-emerald-50"
                      : light
                        ? "text-slate-700 hover:bg-slate-100"
                        : "text-emerald-100/80 hover:bg-white/10"
                  }`}
                >
                  <opt.icon size={15} />
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
          light
            ? "border-slate-200/90 bg-white/90 text-slate-800 shadow-sm hover:bg-slate-50"
            : "border-white/10 text-emerald-100/85 hover:bg-white/[0.07] hover:text-white"
        } ${collapsed ? "justify-center px-2" : ""}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Theme: change appearance"
        title={collapsed ? "Theme" : undefined}
      >
        <ActiveIcon size={18} className="shrink-0 opacity-90" />
        {!collapsed ? <span className="truncate">Appearance</span> : null}
      </button>
      {open ? (
        <ul
          role="listbox"
          className={`absolute bottom-full left-0 z-50 mb-2 min-w-[11rem] rounded-xl border py-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl ${
            light
              ? "border-slate-200/90 bg-white/95 text-slate-900"
              : "border-emerald-500/15 bg-[#04140f]/95 text-emerald-50"
          } ${collapsed ? "left-1/2 min-w-[10rem] -translate-x-1/2" : ""}`}
        >
          {OPTIONS.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                role="option"
                aria-selected={mode === opt.id}
                onClick={() => pick(opt.id)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold transition ${
                  mode === opt.id
                    ? light
                      ? "bg-emerald-100 text-emerald-950"
                      : "bg-emerald-500/20 text-emerald-50"
                    : light
                      ? "text-slate-700 hover:bg-slate-100"
                      : "text-emerald-100/80 hover:bg-white/10"
                }`}
              >
                <opt.icon size={15} />
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
