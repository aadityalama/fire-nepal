"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useHomepageLanguage } from "@/contexts/HomepageLanguageContext";
import { supportedLanguages } from "@/lib/i18n/homepage-translations";
import type { LanguageCode } from "@/lib/i18n/homepage-translations";

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { language, setLanguage, copy } = useHomepageLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLanguage = supportedLanguages.find((item) => item.code === language) ?? supportedLanguages[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const chooseLanguage = (nextLanguage: LanguageCode) => {
    setLanguage(nextLanguage);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative z-[250] ${className}`}>
      <button
        type="button"
        aria-label={copy.languageSelector.ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`group inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] shadow-[0_10px_28px_rgba(0,122,61,0.1)] backdrop-blur-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-200/70 sm:px-3.5 ${
          open
            ? "border-emerald-300 bg-emerald-50/95 text-emerald-950 shadow-[0_18px_42px_rgba(16,185,129,0.24),0_0_0_6px_rgba(16,185,129,0.08)]"
            : "border-emerald-200/80 bg-white/82 text-emerald-900 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/90 hover:text-emerald-950 hover:shadow-[0_18px_40px_rgba(16,185,129,0.22),0_0_0_6px_rgba(16,185,129,0.08)]"
        }`}
      >
        <Globe2 size={14} className="shrink-0 text-emerald-600 transition group-hover:scale-110 group-hover:text-emerald-500" aria-hidden />
        <span className="hidden sm:inline">{activeLanguage.shortLabel}</span>
        <span className="sm:hidden">{activeLanguage.shortLabel}</span>
        <ChevronDown size={13} className={`shrink-0 transition duration-300 ${open ? "rotate-180 text-emerald-700" : "text-emerald-600"}`} aria-hidden />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 8, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, scale: 0.97, filter: "blur(6px)" }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full z-[300] w-[min(78vw,15.5rem)] overflow-hidden rounded-[1.25rem] border border-white/70 bg-white/90 p-2 shadow-[0_28px_80px_rgba(4,47,35,0.24)] ring-1 ring-emerald-900/5 backdrop-blur-2xl"
          >
            <div className="px-3 pb-2 pt-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">{copy.languageSelector.eyebrow}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">{copy.languageSelector.saved}</p>
            </div>
            <div role="listbox" aria-label={copy.languageSelector.currentLanguage} className="space-y-1">
              {supportedLanguages.map((item) => {
                const selected = item.code === language;

                return (
                  <button
                    key={item.code}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => chooseLanguage(item.code)}
                    className={`group/item flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-emerald-100 ${
                      selected
                        ? "bg-emerald-700 text-white shadow-[0_14px_30px_rgba(0,122,61,0.22)]"
                        : "text-emerald-950 hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-[0_12px_28px_rgba(16,185,129,0.14)]"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-black">{item.label}</span>
                      <span className={`mt-0.5 block text-xs font-bold ${selected ? "text-emerald-50/80" : "text-slate-500"}`}>
                        {item.nativeLabel}
                      </span>
                    </span>
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black transition ${
                        selected ? "bg-white text-emerald-700" : "bg-emerald-50 text-emerald-700 group-hover/item:bg-white"
                      }`}
                    >
                      {selected ? <Check size={15} aria-hidden /> : item.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
