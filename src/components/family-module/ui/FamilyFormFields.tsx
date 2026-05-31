"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { familyMutedText } from "@/components/family-module/FamilyUiPrimitives";

export function FamilyFieldLabel({ light, children }: { light: boolean; children: ReactNode }) {
  return <label className={`mb-1 block text-[11px] font-black uppercase tracking-wide ${familyMutedText(light)}`}>{children}</label>;
}

export function FamilyInput({
  light,
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { light: boolean }) {
  return (
    <input
      className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-emerald-500/40 ${
        light
          ? "border-emerald-200/80 bg-white text-slate-900 placeholder:text-slate-400"
          : "border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
      } ${className}`}
      {...rest}
    />
  );
}

export function FamilyTextarea({
  light,
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { light: boolean }) {
  return (
    <textarea
      className={`min-h-[100px] w-full resize-y rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-emerald-500/40 ${
        light
          ? "border-emerald-200/80 bg-white text-slate-900 placeholder:text-slate-400"
          : "border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
      } ${className}`}
      {...rest}
    />
  );
}

export function FamilySelect({
  light,
  className = "",
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { light: boolean; children: ReactNode }) {
  return (
    <select
      className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-emerald-500/40 ${
        light
          ? "border-emerald-200/80 bg-white text-slate-900"
          : "border-white/10 bg-black/30 text-white"
      } ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}
