"use client";

import { Calculator, Home, LayoutDashboard, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { useProductAuth } from "@/contexts/ProductAuthContext";

export function ProductHomeMobileDock() {
  const { user } = useProductAuth();
  const hubHref = user ? "/hub" : "/login?next=%2Fhub";

  const items: { label: string; href: string; icon: typeof Home }[] = [
    { label: "Home", href: "#home", icon: Home },
    { label: "Hub", href: hubHref, icon: LayoutDashboard },
    { label: "FIRE", href: "#calculator", icon: Calculator },
    { label: "AI", href: "#learn", icon: Sparkles },
    { label: "Reviews", href: "#community", icon: Star },
  ];

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50 rounded-[1.4rem] border border-white/60 bg-white/75 p-2 shadow-[0_18px_55px_rgba(0,63,47,0.18)] backdrop-blur-[18px] [-webkit-backdrop-filter:blur(18px)] sm:hidden">
      <div className="grid grid-cols-5 gap-0.5 text-[10px] font-black text-slate-500">
        {items.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex flex-col items-center gap-1 rounded-2xl px-1 py-2 transition hover:bg-emerald-50 hover:text-emerald-700"
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
