"use client";

import { BadgeCheck, Crown, Gem, ShieldAlert, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import {
  computeMembershipExpiryStatus,
  formatMemberCardDate,
  tierDisplayName,
  type PublicMemberVerification,
} from "@/lib/member-card-profile";
import type { FireMembershipTier } from "@/lib/fire-membership";

type MemberVerificationClientProps = {
  fireNepalId: string;
  verification: PublicMemberVerification;
};

function tierIcon(plan: FireMembershipTier | null | undefined) {
  if (plan === "elite") return Crown;
  if (plan === "premium") return Gem;
  return Sparkles;
}

export function MemberVerificationClient({ fireNepalId, verification }: MemberVerificationClientProps) {
  const found = verification.found;
  const expiryState = computeMembershipExpiryStatus(verification.membershipExpiry ?? null);
  const status = verification.status ?? expiryState.status;
  const TierIcon = tierIcon(verification.membershipPlan);
  const verified = found && expiryState.isActive;
  const expiring = found && status === "expiring_soon";
  const expired = found && status === "expired";

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300/80">FIRE Nepal Verification</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Membership Verification</h1>
          <p className="mt-2 font-mono text-sm text-zinc-400">{fireNepalId}</p>
        </div>

        <section className="overflow-hidden rounded-[28px] border-2 border-amber-300/50 bg-gradient-to-br from-[#071912] via-[#050505] to-[#020807] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:p-8">
          {!found ? (
            <div className="text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-red-400/40 bg-red-500/15 text-red-200">
                <ShieldAlert size={28} />
              </div>
              <h2 className="mt-5 text-2xl font-black text-red-100">Member Not Found</h2>
              <p className="mt-2 text-sm font-semibold text-zinc-400">
                This FIRE Nepal ID could not be verified. Please check the ID and try again.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center text-center">
                <div className="relative h-28 w-28 overflow-hidden rounded-full border-[3px] border-amber-300/70 bg-emerald-900/30">
                  {verification.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={verification.avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-emerald-200">
                      <UserRound size={42} />
                    </div>
                  )}
                </div>
                <h2 className="mt-5 text-2xl font-black uppercase tracking-wide">{verification.fullName}</h2>
                <p className="mt-1 font-mono text-sm text-emerald-200/80">{verification.fireNepalId}</p>
              </div>

              <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-black/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Membership</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-black text-white">
                    <TierIcon size={15} />
                    {tierDisplayName(verification.membershipPlan ?? "free")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Expiry Date</span>
                  <span className="text-sm font-black text-white">{formatMemberCardDate(verification.membershipExpiry ?? null)}</span>
                </div>
              </div>

              {verified ? (
                <div className="mt-6 rounded-2xl border border-emerald-400/35 bg-emerald-500/15 px-4 py-4 text-center">
                  <p className="inline-flex items-center gap-2 text-lg font-black text-emerald-100">
                    <BadgeCheck size={20} />
                    Verified Member
                  </p>
                </div>
              ) : null}

              {expiring ? (
                <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-500/15 px-4 py-4 text-center">
                  <p className="inline-flex items-center gap-2 text-lg font-black text-amber-50">
                    <ShieldCheck size={20} />
                    Verified Member — Expiring Soon
                  </p>
                </div>
              ) : null}

              {expired ? (
                <div className="mt-6 rounded-2xl border border-red-400/45 bg-red-500/15 px-4 py-4 text-center">
                  <p className="inline-flex items-center gap-2 text-lg font-black text-red-100">
                    <ShieldAlert size={20} />
                    Expired Membership
                  </p>
                </div>
              ) : null}
            </>
          )}
        </section>

        <p className="mt-6 text-center text-sm font-semibold text-zinc-500">
          <Link href="/" className="text-emerald-300 hover:text-emerald-200">
            Return to FIRE Nepal
          </Link>
        </p>
      </div>
    </main>
  );
}
