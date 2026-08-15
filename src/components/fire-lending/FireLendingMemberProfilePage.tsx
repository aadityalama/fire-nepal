"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Handshake,
  Loader2,
  Shield,
  Sparkles,
} from "lucide-react";
import { LendingCompactHeader, LendingMobileScreen } from "@/components/fire-lending/FireLendingMobileScreens";
import {
  LendingAvatar,
  LendingGlassCard,
  LendingPrimaryLink,
  LendingStatusPill,
} from "@/components/fire-lending/FireLendingUiPrimitives";
import { useFireLending } from "@/contexts/FireLendingContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import {
  buildP2PLendingProfile,
  emptyLendingMetrics,
  extractPublicLendingMetricsFromStore,
  type P2PProfileSourceRow,
} from "@/lib/fire-lending/p2p-member-profile";
import type { P2PLendingProfile } from "@/lib/fire-lending/p2p-member-types";

function formatMemberSince(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function localPartyToProfile(
  party: {
    fireNepalId: string;
    name: string;
    photoUrl?: string;
    verified: boolean;
    identityVerified: boolean;
    onTimePayments: number;
    latePayments: number;
    loansCompleted: number;
    rolePreference: "lender" | "borrower" | "both";
  },
  store: unknown,
): P2PLendingProfile {
  const row: P2PProfileSourceRow = {
    id: "local",
    fire_nepal_id: party.fireNepalId,
    full_name: party.name,
    display_name: party.name,
    avatar_url: party.photoUrl ?? null,
    membership_plan: party.verified ? "elite" : "free",
    membership_start: null,
    membership_expiry: party.verified ? null : "2000-01-01",
    membership_suspended_at: null,
    membership_archived_at: null,
    country_of_work: null,
    preferred_currency: "NPR",
    created_at: null,
  };
  const fromStore = extractPublicLendingMetricsFromStore(store, party.identityVerified);
  const metrics = {
    ...emptyLendingMetrics(party.identityVerified),
    onTimePayments: party.onTimePayments,
    latePayments: party.latePayments,
    loansCompleted: party.loansCompleted,
    identityVerified: party.identityVerified,
    activeLoanCount: fromStore.activeLoanCount,
    currentLoanStatus: fromStore.currentLoanStatus,
    rolePreference: party.rolePreference,
  };
  return buildP2PLendingProfile(row, metrics);
}

export function FireLendingMemberProfilePage() {
  const params = useParams<{ fireNepalId: string }>();
  const fireNepalId = decodeURIComponent(params.fireNepalId ?? "").trim().toUpperCase();
  const { store } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<P2PLendingProfile | null>(null);

  const localParty = useMemo(
    () => store.parties.find((p) => p.fireNepalId.trim().toUpperCase() === fireNepalId) ?? null,
    [fireNepalId, store.parties],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const applyLocalFallback = () => {
      if (!localParty) return false;
      setProfile(localPartyToProfile(localParty, store));
      setError(null);
      return true;
    };

    fetch(`/api/fire-lending/members/${encodeURIComponent(fireNepalId)}`, { credentials: "same-origin" })
      .then(async (res) => {
        const data = (await res.json()) as { ok: boolean; profile?: P2PLendingProfile; error?: string };
        if (cancelled) return;
        if (!res.ok || !data.ok || !data.profile) {
          if (!applyLocalFallback()) {
            setError(data.error ?? "Member lending profile unavailable.");
            setProfile(null);
          }
          return;
        }
        setProfile(data.profile);
      })
      .catch(() => {
        if (cancelled) return;
        if (!applyLocalFallback()) {
          setError("Could not load lending profile.");
          setProfile(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Intentionally key off FIRE ID + local party id; store snapshot read at request time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fireNepalId, localParty?.id]);

  return (
    <LendingMobileScreen>
      <LendingCompactHeader
        eyebrow="Lending Profile"
        title={profile?.displayName ?? fireNepalId}
        subtitle="P2P decision-ready information only — private contact & finance data stay hidden."
      />

      <Link
        href="/fire-lending/borrowers"
        className={`mb-1 inline-flex items-center gap-1.5 text-xs font-bold ${light ? "text-emerald-700" : "text-lime-300"}`}
      >
        <ArrowLeft size={14} />
        Back to borrowers
      </Link>

      {loading ? (
        <LendingGlassCard title="Loading profile" icon={Loader2}>
          <div className={`flex items-center gap-2 text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/70"}`}>
            <Loader2 size={16} className="animate-spin" />
            Fetching authorized lending profile…
          </div>
        </LendingGlassCard>
      ) : null}

      {!loading && error ? (
        <LendingGlassCard title="Unavailable" icon={Shield}>
          <p className={`text-sm font-semibold ${light ? "text-slate-700" : "text-emerald-100"}`}>{error}</p>
          <p className={`mt-2 text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/50"}`}>
            Only verified members with a public FIRE Nepal ID appear in P2P discovery.
          </p>
        </LendingGlassCard>
      ) : null}

      {!loading && profile ? (
        <>
          <LendingGlassCard title="Member overview" subtitle="Verified identity for peer lending" icon={BadgeCheck} elite>
            <div className="flex items-start gap-3">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-amber-400/40"
                />
              ) : (
                <LendingAvatar name={profile.displayName} size={64} />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={`text-lg font-black ${light ? "text-slate-900" : "text-emerald-50"}`}>
                    {profile.displayName}
                  </h3>
                  {profile.verificationStatus === "verified" ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                        light ? "bg-emerald-100 text-emerald-800" : "bg-emerald-500/20 text-lime-200"
                      }`}
                    >
                      <BadgeCheck size={12} />
                      Verified
                    </span>
                  ) : (
                    <LendingStatusPill status="unverified" />
                  )}
                </div>
                <p className={`mt-1 text-sm font-bold ${light ? "text-slate-600" : "text-emerald-200/70"}`}>
                  FIRE Nepal ID: {profile.fireNepalId}
                </p>
                <p className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/50"}`}>
                  <CalendarDays size={12} />
                  Member since {formatMemberSince(profile.memberSince)}
                </p>
              </div>
            </div>
          </LendingGlassCard>

          <LendingGlassCard title="Trust Score" subtitle={`${profile.trustLabel} · from verified repayment engine`} icon={Sparkles} elite>
            <p className={`text-4xl font-black tabular-nums ${light ? "text-amber-700" : "text-amber-300"}`}>
              {profile.trustScore}
              <span className={`ml-1 text-base font-bold ${light ? "text-slate-500" : "text-emerald-200/50"}`}>/100</span>
            </p>
            <ul className="mt-3 space-y-2">
              {profile.trustBreakdown.map((factor) => (
                <li
                  key={factor.key}
                  className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2 ${
                    light ? "border-emerald-100 bg-white/80" : "border-emerald-400/10 bg-black/20"
                  }`}
                >
                  <div>
                    <p className={`text-xs font-black ${light ? "text-slate-800" : "text-emerald-50"}`}>{factor.label}</p>
                    <p className={`text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/55"}`}>
                      {factor.detail}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-black tabular-nums ${
                      factor.points < 0 ? "text-rose-400" : light ? "text-emerald-700" : "text-lime-300"
                    }`}
                  >
                    {factor.points > 0 ? `+${factor.points}` : factor.points}
                  </span>
                </li>
              ))}
            </ul>
          </LendingGlassCard>

          <LendingGlassCard title="Lending performance" icon={Handshake}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Active loans" value={String(profile.activeLoanCount)} light={light} />
              <Metric label="Completed" value={String(profile.completedLoans)} light={light} />
              <Metric label="On-time" value={`${profile.onTimeRepaymentPct}%`} light={light} />
              <Metric label="Status" value={profile.currentLoanStatus.replace(/_/g, " ")} light={light} />
            </div>
            <p className={`mt-3 text-sm font-semibold ${light ? "text-slate-700" : "text-emerald-100"}`}>
              {profile.repaymentPerformance}
            </p>
            <p className={`mt-1 text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/55"}`}>
              {profile.lendingHistorySummary}
            </p>
          </LendingGlassCard>

          <LendingGlassCard title="Public lending profile" icon={Shield}>
            <dl className={`grid gap-2 text-sm ${light ? "text-slate-700" : "text-emerald-100"}`}>
              <Row label="Membership" value={profile.publicLendingInfo.membershipPlan ?? "—"} />
              <Row label="Country of work" value={profile.publicLendingInfo.countryOfWork ?? "—"} />
              <Row label="Preferred currency" value={profile.publicLendingInfo.preferredCurrency ?? "—"} />
              <Row label="Role preference" value={profile.publicLendingInfo.rolePreference ?? "—"} />
            </dl>
            <p className={`mt-3 text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/45"}`}>
              Phone, email, bank details, government IDs, and private financial records are never shared in P2P discovery.
            </p>
          </LendingGlassCard>

          <div className="flex flex-wrap gap-2">
            <LendingPrimaryLink href={`/fire-lending/new?fireId=${encodeURIComponent(profile.fireNepalId)}`}>
              Start loan with member
            </LendingPrimaryLink>
          </div>
        </>
      ) : null}
    </LendingMobileScreen>
  );
}

function Metric({ label, value, light }: { label: string; value: string; light: boolean }) {
  return (
    <div className={`rounded-xl border px-2.5 py-2 ${light ? "border-emerald-100 bg-white" : "border-emerald-400/10 bg-black/20"}`}>
      <p className={`text-[10px] font-black uppercase tracking-wide ${light ? "text-slate-500" : "text-emerald-200/50"}`}>
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-black capitalize tabular-nums ${light ? "text-slate-900" : "text-emerald-50"}`}>
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-emerald-500/10 pb-1.5 last:border-0">
      <dt className="text-[11px] font-bold opacity-70">{label}</dt>
      <dd className="text-right text-xs font-black capitalize">{value}</dd>
    </div>
  );
}
