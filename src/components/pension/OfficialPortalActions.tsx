"use client";

import { ExternalLink, ShieldCheck } from "lucide-react";
import type { OfficialPortalLink, PensionInstitutionId } from "@/lib/pension-policy";
import { portalsForInstitution } from "@/lib/pension-policy";

/**
 * Secure external actions only — never collect government passwords/OTPs/PINs.
 */
export function OfficialPortalActions({
  institution,
  light,
}: {
  institution: PensionInstitutionId;
  light?: boolean;
}) {
  const links = portalsForInstitution(institution);
  const pay = links.find((l) => l.label === "Pay / Contribution");
  const login = links.find((l) => l.label === "Official Login");
  const portal = links.find((l) => l.label === "Official Portal");

  return (
    <section
      className={`wealth-glass p-4 sm:p-5 ${light ? "ring-1 ring-slate-900/[0.04]" : ""}`}
      aria-label="Official government portals"
    >
      <div className="mb-3 flex items-start gap-2">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-teal-600 dark:text-teal-300" />
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Official portals</h2>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600 dark:text-zinc-400">
            Pay and login happen only on verified government / institutional websites. FireNepal never asks for portal
            passwords, OTPs, or PINs.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {pay ? <PortalButton link={pay} primary /> : null}
        {login ? <PortalButton link={login} /> : null}
        {portal ? <PortalButton link={portal} subtle /> : null}
      </div>
    </section>
  );
}

function PortalButton({
  link,
  primary,
  subtle,
}: {
  link: OfficialPortalLink;
  primary?: boolean;
  subtle?: boolean;
}) {
  const label =
    link.label === "Official Login"
      ? "Official Login ↗"
      : link.label === "Pay / Contribution"
        ? "Pay / Contribution ↗"
        : "Official Portal ↗";

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      title={link.description}
      className={`inline-flex min-h-[44px] touch-manipulation items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-black transition active:scale-95 ${
        primary
          ? "border border-teal-500/40 bg-teal-500/15 text-teal-950 hover:bg-teal-500/25 dark:text-teal-50"
          : subtle
            ? "border border-white/10 bg-white/[0.04] text-slate-700 hover:border-teal-400/30 dark:text-zinc-200"
            : "border border-emerald-400/30 bg-emerald-500/10 text-emerald-950 hover:bg-emerald-500/20 dark:text-emerald-50"
      }`}
    >
      {label}
      <ExternalLink size={13} aria-hidden />
    </a>
  );
}
