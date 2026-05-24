"use client";

import { BarChart3, BadgeCheck, Brain, ChevronDown, Gem, LayoutDashboard, Lock, LogOut, Settings, Shield, UserRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";

type UserMenuDropdownProps = {
  /** dark = hub shell; light = marketing chrome */
  variant?: "light" | "dark";
};

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  return `${p[0]![0] ?? ""}${p[p.length - 1]![0] ?? ""}`.toUpperCase();
}

export function UserMenuDropdown({ variant = "light" }: UserMenuDropdownProps) {
  const { user, logout } = useProductAuth();
  const [open, setOpen] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setImgBroken(false);
  }, [user?.avatarUrl]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, close]);

  if (!user) return null;

  const btn =
    variant === "dark"
      ? "border-emerald-400/25 bg-white/[0.06] text-emerald-50 hover:border-emerald-300/40 hover:bg-white/10"
      : "border-emerald-100/80 bg-white/80 text-emerald-950 hover:bg-white";

  const panel =
    variant === "dark"
      ? "border-emerald-400/20 bg-[#061912]/95 text-emerald-50 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      : "border-emerald-100/80 bg-white/95 text-emerald-950 shadow-[0_24px_50px_rgba(0,63,47,0.15)] backdrop-blur-xl";

  const subMuted = variant === "dark" ? "text-white/55" : "text-zinc-500";
  const borderMuted = variant === "dark" ? "border-white/10" : "border-emerald-100/80";
  const hoverRow = variant === "dark" ? "hover:bg-white/10" : "hover:bg-emerald-50";

  const showAvatar =
    typeof user.avatarUrl === "string" &&
    user.avatarUrl.length > 0 &&
    (user.avatarUrl.startsWith("data:") || user.avatarUrl.startsWith("http")) &&
    !imgBroken;

  const verified = user.emailVerified === true;

  const avatarInner = showAvatar ? (
    <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-emerald-400/30">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={user.avatarUrl!}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setImgBroken(true)}
      />
    </span>
  ) : (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500/30 to-lime-400/25 text-[10px] font-black text-emerald-100 ring-1 ring-emerald-400/35">
      {initials(user.name)}
    </span>
  );

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-2 py-1.5 text-xs font-black transition sm:text-sm ${btn}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="relative shrink-0">
          {avatarInner}
          {verified ? (
            <span
              className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border border-emerald-950 bg-emerald-400 text-emerald-950 shadow"
              title="Verified"
            >
              <BadgeCheck size={10} strokeWidth={3} aria-hidden />
            </span>
          ) : null}
        </span>
        <Lock size={12} className="hidden shrink-0 text-emerald-500/80 sm:block" aria-hidden />
        <span className="max-w-[100px] truncate sm:max-w-[140px]">{user.name}</span>
        <span className="hidden text-[9px] font-black uppercase tracking-wider text-emerald-600/90 sm:inline lg:hidden">
          Secure
        </span>
        <ChevronDown size={14} className={`shrink-0 opacity-70 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div
          role="menu"
          className={`absolute right-0 z-[100] mt-2 min-w-[228px] overflow-hidden rounded-2xl border py-2 ${panel}`}
        >
          <div className={`border-b px-4 py-3 ${borderMuted}`}>
            <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${variant === "dark" ? "text-white/45" : "text-zinc-400"}`}>
              Signed in
            </p>
            <p className="mt-0.5 truncate text-sm font-bold">{user.name}</p>
            <p className={`truncate text-xs font-medium ${subMuted}`}>{user.email}</p>
          </div>
          <Link
            href="/dashboard/profile"
            role="menuitem"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition ${hoverRow}`}
            onClick={close}
          >
            <UserRound size={16} />
            My profile
          </Link>
          <Link
            href="/dashboard"
            role="menuitem"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition ${hoverRow}`}
            onClick={close}
          >
            <BarChart3 size={16} />
            Dashboard
          </Link>
          <Link
            href="/dashboard/ai-coach"
            role="menuitem"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition ${hoverRow}`}
            onClick={close}
          >
            <Brain size={16} />
            AI Coach
          </Link>
          <Link
            href="/dashboard/security"
            role="menuitem"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition ${hoverRow}`}
            onClick={close}
          >
            <Shield size={16} />
            Security
          </Link>
          <Link
            href="/dashboard/membership"
            role="menuitem"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition ${hoverRow}`}
            onClick={close}
          >
            <Gem size={16} />
            Membership
          </Link>
          <Link
            href="/dashboard/settings"
            role="menuitem"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition ${hoverRow}`}
            onClick={close}
          >
            <Settings size={16} />
            Settings
          </Link>
          <Link
            href="/hub"
            role="menuitem"
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-emerald-300/90 transition ${hoverRow}`}
            onClick={close}
          >
            <LayoutDashboard size={14} />
            Product hub →
          </Link>
          <button
            type="button"
            role="menuitem"
            className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-rose-200 transition hover:bg-rose-500/15 ${variant === "light" ? "hover:bg-rose-50" : ""}`}
            onClick={() => {
              close();
              void logout();
            }}
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
