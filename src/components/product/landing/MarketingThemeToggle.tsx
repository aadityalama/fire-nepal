"use client";

import { Moon, Sun } from "lucide-react";
import { useMarketingTheme } from "@/contexts/MarketingThemeContext";

export function MarketingThemeToggle() {
  const { scheme, setSchemeMode } = useMarketingTheme();

  return (
    <div
      className="inline-flex items-center rounded-full border border-emerald-200/70 bg-white/80 p-0.5 shadow-sm backdrop-blur-md dark:border-emerald-500/25 dark:bg-slate-900/70"
      role="group"
      aria-label="Homepage appearance"
    >
      <button
        type="button"
        onClick={() => setSchemeMode("light")}
        className={`grid h-9 w-9 place-items-center rounded-full transition duration-200 ease-out ${
          scheme === "light"
            ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/25"
            : "text-slate-500 hover:text-emerald-800 dark:text-slate-400 dark:hover:text-emerald-200"
        }`}
        aria-pressed={scheme === "light"}
        aria-label="Light mode"
      >
        <Sun size={17} strokeWidth={2.25} />
      </button>
      <button
        type="button"
        onClick={() => setSchemeMode("dark")}
        className={`grid h-9 w-9 place-items-center rounded-full transition duration-200 ease-out ${
          scheme === "dark"
            ? "bg-emerald-700 text-white shadow-md shadow-emerald-950/40"
            : "text-slate-500 hover:text-emerald-800 dark:text-slate-400 dark:hover:text-emerald-200"
        }`}
        aria-pressed={scheme === "dark"}
        aria-label="Dark mode"
      >
        <Moon size={16} strokeWidth={2.25} />
      </button>
    </div>
  );
}
