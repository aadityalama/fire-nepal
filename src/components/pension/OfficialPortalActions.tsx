"use client";

import { ShieldCheck } from "lucide-react";
import type { PensionInstitutionId } from "@/lib/pension-policy";
import { portalsForInstitution } from "@/lib/pension-policy";
import { ExternalCta, PcCopy, PcEyebrow, PcSurface, PcTitle } from "@/components/pension/PensionUi";
import { LogIn, WalletCards } from "lucide-react";

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
    <PcSurface className="p-4 sm:p-5" aria-label="Official government portals">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#2dd4bf]/30 bg-[#2dd4bf]/12 text-[#99f6e4]">
          <ShieldCheck size={18} />
        </span>
        <div className="min-w-0">
          <PcEyebrow>Official portals</PcEyebrow>
          <PcTitle as="h2">Pay & login securely</PcTitle>
          <PcCopy className="mt-1.5 text-xs">
            Actions open verified institutional sites. FireNepal never asks for portal passwords, OTPs, or PINs.
          </PcCopy>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {pay ? (
          <ExternalCta href={pay.href} variant="primary" icon={WalletCards}>
            Pay / Contribution
          </ExternalCta>
        ) : null}
        {login ? (
          <ExternalCta href={login.href} variant="secondary" icon={LogIn}>
            Official Login
          </ExternalCta>
        ) : null}
        {portal ? (
          <ExternalCta href={portal.href} variant="ghost">
            Official Portal
          </ExternalCta>
        ) : null}
      </div>
    </PcSurface>
  );
}
