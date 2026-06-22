"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useFireTheme } from "@/contexts/FireThemeContext";

type FireBizFormShellProps = {
  title: string;
  backHref: string;
  children: ReactNode;
  onDelete?: () => void;
  deleteLabel?: string;
};

export function FireBizFormShell({ title, backHref, children, onDelete, deleteLabel }: FireBizFormShellProps) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <div
      className={`fixed inset-0 z-[65] flex flex-col overflow-hidden lg:relative lg:inset-auto lg:z-auto lg:overflow-visible ${
        light ? "bg-slate-100" : "bg-[#020807]"
      }`}
    >
      <header
        className={`flex shrink-0 items-center gap-3 border-b px-4 py-3 ${
          light ? "border-emerald-200/70 bg-white/95" : "border-emerald-400/10 bg-[#020807]/95"
        }`}
      >
        <Link
          href={backHref}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition active:scale-95 ${
            light ? "text-slate-700 hover:bg-emerald-50" : "text-emerald-200 hover:bg-emerald-500/10"
          }`}
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className={`min-w-0 flex-1 truncate text-base font-black ${light ? "text-slate-900" : "text-white"}`}>
          {title}
        </h1>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-rose-400 transition hover:bg-rose-500/10 active:scale-95"
            aria-label={deleteLabel ?? "Delete"}
          >
            <Trash2 size={18} />
          </button>
        ) : null}
      </header>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-24 lg:pb-6">{children}</div>
    </div>
  );
}
