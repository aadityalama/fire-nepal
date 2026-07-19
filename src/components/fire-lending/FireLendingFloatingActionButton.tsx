"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  FileSignature,
  HandCoins,
  Plus,
  QrCode,
  UserPlus,
  Wallet,
  X,
  ArrowDownLeft,
} from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";

const ACTIONS = [
  { href: "/fire-lending/new", label: "New Loan", icon: HandCoins },
  { href: "/fire-lending/new?mode=request", label: "Loan Request", icon: ArrowDownLeft },
  { href: "/fire-lending/new", label: "Create Agreement", icon: FileSignature },
  { href: "/fire-lending/payments/new", label: "Record Payment", icon: Wallet },
  { href: "/fire-lending/new?method=qr", label: "Scan QR", icon: QrCode },
  { href: "/fire-lending/borrowers", label: "Invite Borrower", icon: UserPlus },
  { href: "/fire-lending/analytics", label: "Analytics", icon: BarChart3 },
];

export function LendingSpeedDial() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="fixed bottom-24 right-4 z-30 flex flex-col items-end gap-2 lg:bottom-8 lg:right-8">
      {open ? (
        <ul className="mb-1 flex flex-col items-end gap-2">
          {ACTIONS.map((action, idx) => (
            <li key={action.label} className="animate-fade-up" style={{ animationDelay: `${idx * 35}ms` }}>
              <Link
                href={action.href}
                onClick={() => setOpen(false)}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black shadow-lg backdrop-blur-xl transition hover:scale-[1.03] active:scale-95 ${
                  light
                    ? "border-emerald-200/80 bg-white/95 text-slate-800"
                    : "border-emerald-400/25 bg-[#04140f]/95 text-emerald-50"
                }`}
              >
                <action.icon size={16} className={light ? "text-emerald-600" : "text-lime-300"} />
                {action.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-lime-400 text-emerald-950 shadow-xl shadow-emerald-500/35 transition hover:scale-105 active:scale-95"
      >
        {open ? <X size={24} strokeWidth={2.5} /> : <Plus size={26} strokeWidth={2.5} />}
      </button>
    </div>
  );
}

/** @deprecated Prefer LendingSpeedDial — kept for list page compatibility */
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
