"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

export function FireBizFloatingActionButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-50 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/30 transition active:scale-95 lg:bottom-8"
      aria-label={label}
    >
      <Plus size={24} strokeWidth={2.5} />
    </Link>
  );
}
