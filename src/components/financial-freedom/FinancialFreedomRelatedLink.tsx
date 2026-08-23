import Link from "next/link";

/** Lightweight reverse-link strip toward the Financial Freedom Nepal hub. */
export function FinancialFreedomRelatedLink({
  anchor = "Financial Freedom Nepal",
  note = "Map savings, investing, and retirement tools into one independence plan.",
}: Readonly<{
  anchor?: string;
  note?: string;
}>) {
  return (
    <aside className="mt-8 rounded-2xl border border-emerald-100/90 bg-emerald-50/70 p-4 text-sm font-bold leading-relaxed text-emerald-950 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Continue planning</p>
      <p className="mt-2">
        <Link href="/financial-freedom-nepal" className="underline-offset-2 hover:underline">
          {anchor}
        </Link>
        {" — "}
        <span className="font-medium text-slate-600">{note}</span>
      </p>
    </aside>
  );
}
