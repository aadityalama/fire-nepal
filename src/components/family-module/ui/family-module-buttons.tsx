"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Light = boolean;

function base(light: Light, extra: string) {
  return `inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition duration-200 active:scale-[0.98] disabled:opacity-50 sm:text-sm ${extra}`;
}

export function familyPrimaryButtonClass(light: Light) {
  return light
    ? base(light, "bg-gradient-to-r from-emerald-600 to-lime-500 text-white shadow-md hover:brightness-105")
    : base(light, "bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/20 hover:brightness-110");
}

export function familyGhostButtonClass(light: Light) {
  return light
    ? base(light, "border border-emerald-200/90 bg-white/90 text-emerald-900 hover:bg-emerald-50")
    : base(light, "border border-emerald-400/25 bg-white/[0.06] text-emerald-100 hover:bg-white/10");
}

export function familyDangerButtonClass(light: Light) {
  return light
    ? base(light, "border border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100")
    : base(light, "border border-rose-500/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20");
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { light: boolean; children: ReactNode };

export function FamilyBtnPrimary({ light, className = "", ...rest }: BtnProps) {
  return <button type="button" className={`${familyPrimaryButtonClass(light)} ${className}`} {...rest} />;
}

export function FamilyBtnGhost({ light, className = "", ...rest }: BtnProps) {
  return <button type="button" className={`${familyGhostButtonClass(light)} ${className}`} {...rest} />;
}

export function FamilyBtnDanger({ light, className = "", ...rest }: BtnProps) {
  return <button type="button" className={`${familyDangerButtonClass(light)} ${className}`} {...rest} />;
}
