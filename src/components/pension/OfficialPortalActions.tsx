"use client";

import { ExternalLink, LogIn, ShieldCheck, WalletCards } from "lucide-react";
import type { OfficialPortalLink, PensionInstitutionId } from "@/lib/pension-policy";
import { portalsForInstitution } from "@/lib/pension-policy";
import {
  PensionBody,
  PensionGlassPanel,
  PensionHeading,
  PensionSectionLabel,
} from "@/components/pension/PensionUi";

/**
 * Secure external actions only — never collect government passwords/OTPs/PINs.
 */
export function OfficialPortalActions({
  institution,
}: {
  institution: PensionInstitutionId;
  light?: boolean;
}) {
  const links = portalsForInstitution(institution);
  const pay = links.find((l) => l.label === "Pay / Contribution");
  const login = links.find((l) => l.label === "Official Login");
  const portal = links.find((l) => l.label === "Official Portal");

  return (
    <PensionGlassPanel className="p-4 sm:p-5" aria-label="Official government portals">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-200">
          <ShieldCheck size={18} />
        </span>
        <div className="min-w-0">
          <PensionSectionLabel>Verified actions</PensionSectionLabel>
          <PensionHeading>Official portals</PensionHeading>
          <PensionBody className="mt-1.5 text-xs sm:text-sm">
            Pay and login happen only on verified government / institutional websites. FireNepal never asks for portal
            passwords, OTPs, or PINs.
          </PensionBody>
        </div>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {pay ? <PortalButton link={pay} primary icon={WalletCards} /> : null}
        {login ? <PortalButton link={login} icon={LogIn} /> : null}
        {portal ? <PortalButton link={portal} subtle icon={ExternalLink} /> : null}
      </div>
    </PensionGlassPanel>
  );
}

function PortalButton({
  link,
  primary,
  subtle,
  icon: Icon,
}: {
  link: OfficialPortalLink;
  primary?: boolean;
  subtle?: boolean;
  icon: typeof ExternalLink;
}) {
  const label =
    link.label === "Official Login"
      ? "Official Login"
      : link.label === "Pay / Contribution"
        ? "Pay / Contribution"
        : "Official Portal";

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      title={link.description}
      className={`inline-flex min-h-[48px] touch-manipulation items-center gap-2 rounded-full px-4 py-2.5 text-xs font-black transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/45 sm:text-[13px] ${
        primary
          ? "border border-teal-400/45 bg-gradient-to-r from-teal-500/30 via-emerald-500/22 to-lime-400/15 text-teal-950 shadow-[0_14px_36px_-18px_rgba(45,212,191,0.5)] hover:from-teal-500/40 hover:via-emerald-500/30 hover:to-lime-400/22 dark:text-teal-50"
          : subtle
            ? "border border-white/10 bg-white/[0.04] text-slate-700 hover:border-teal-400/30 hover:bg-white/[0.07] dark:text-zinc-200"
            : "border border-emerald-400/35 bg-emerald-500/12 text-emerald-950 hover:bg-emerald-500/20 dark:text-emerald-50"
      }`}
    >
      <Icon size={15} aria-hidden className="opacity-90" />
      {label}
      <ExternalLink size={13} aria-hidden className="opacity-70" />
    </a>
  );
}
