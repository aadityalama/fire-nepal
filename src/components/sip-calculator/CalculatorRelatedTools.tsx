import Link from "next/link";

const LINKS: Array<{ href: string; label: string }> = [
  { href: "/financial-freedom-nepal", label: "Financial Freedom Nepal" },
  { href: "/sip-calculator", label: "SIP Calculator Nepal" },
  { href: "/swp-calculator", label: "SWP Calculator" },
  { href: "/lumpsum-calculator", label: "Lumpsum Calculator" },
  { href: "/learn/sip", label: "SIP Guides" },
];

/** Compact related-tools strip for public calculator pages (varied anchors via `highlight`). */
export function CalculatorRelatedTools({
  highlight = "/sip-calculator",
  lead = "Also explore",
}: Readonly<{
  highlight?: string;
  lead?: string;
}>) {
  return (
    <nav
      aria-label="Related calculators"
      className="mt-8 rounded-2xl border border-emerald-100 bg-white/70 p-4 text-sm font-bold text-slate-600 shadow-sm backdrop-blur"
    >
      <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">{lead}</p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {LINKS.filter((link) => link.href !== highlight).map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-emerald-800 underline-offset-2 hover:underline">
              {link.label}
            </Link>
          </li>
        ))}
        {highlight !== "/sip-calculator" ? (
          <li>
            <Link href="/sip-calculator" className="text-emerald-800 underline-offset-2 hover:underline">
              Calculate SIP returns
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
