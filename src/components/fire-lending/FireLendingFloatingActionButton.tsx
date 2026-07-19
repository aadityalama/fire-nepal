"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export function LendingFloatingActionButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="fixed bottom-24 right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-lime-400 text-emerald-950 shadow-xl shadow-emerald-500/30 transition hover:scale-105 active:scale-95 lg:bottom-8 lg:right-8"
    >
      <Plus size={26} strokeWidth={2.5} />
    </Link>
  );
}
