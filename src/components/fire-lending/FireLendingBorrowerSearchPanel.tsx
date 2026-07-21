"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, UserRoundSearch, Users } from "lucide-react";
import { FireLendingBorrowerMemberCard } from "@/components/fire-lending/FireLendingBorrowerMemberCard";
import {
  LendingAvatar,
  LendingEmptyState,
  LendingInput,
  LendingSecondaryButton,
  LendingSkeletonCard,
  LendingStatusPill,
} from "@/components/fire-lending/FireLendingUiPrimitives";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { useBorrowerMemberSearch } from "@/hooks/useBorrowerMemberSearch";
import type { BorrowerMemberProfile } from "@/lib/fire-lending/borrower-member";

type Props = {
  connectedMember: BorrowerMemberProfile | null;
  onConnect: (member: BorrowerMemberProfile) => void;
  onDisconnect: () => void;
  locked: boolean;
};

export function FireLendingBorrowerSearchPanel({ connectedMember, onConnect, onDisconnect, locked }: Props) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { query, setQuery, members, loading, searched, error, clear } = useBorrowerMemberSearch(!locked);
  const [listFilter, setListFilter] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    const f = listFilter.trim().toLowerCase();
    if (!f) return members;
    return members.filter(
      (m) => m.fullName.toLowerCase().includes(f) || m.fireNepalId.toLowerCase().includes(f),
    );
  }, [members, listFilter]);

  const previewMember = useMemo(() => {
    if (connectedMember) return connectedMember;
    if (members.length === 1) return members[0];
    if (previewId) return members.find((m) => m.id === previewId) ?? null;
    return null;
  }, [connectedMember, members, previewId]);

  const showEmpty = searched && !loading && members.length === 0 && !connectedMember;
  const showMultiList = !connectedMember && members.length > 1;

  return (
    <div className="space-y-3">
      {!locked ? (
        <LendingInput
          label="FIRE Nepal ID or name"
          value={query}
          onChange={(v) => {
            setQuery(v);
            setPreviewId(null);
            setListFilter("");
          }}
          placeholder="Search FN-YYYY-###### or member name…"
        />
      ) : (
        <div
          className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
            light ? "border-emerald-200 bg-emerald-50/80 text-emerald-900" : "border-emerald-400/25 bg-emerald-500/10 text-lime-100"
          }`}
        >
          Searching locked · connected to {connectedMember?.fireNepalId}
        </div>
      )}

      {error ? (
        <p className={`text-xs font-bold ${light ? "text-rose-700" : "text-rose-300"}`} role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <LendingSkeletonCard className="h-40" /> : null}

      {showEmpty ? (
        <LendingEmptyState
          icon={UserRoundSearch}
          title="No FIRE Nepal member found."
          message="Invite them to join FIRE Nepal, or try another FIRE ID / name."
        />
      ) : null}

      {showEmpty ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/signup"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-2.5 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20 sm:flex-none"
          >
            Invite Member
          </Link>
          <LendingSecondaryButton
            onClick={() => {
              clear();
              setPreviewId(null);
              setListFilter("");
            }}
          >
            Search Again
          </LendingSecondaryButton>
        </div>
      ) : null}

      {showMultiList ? (
        <div
          className={`rounded-[1.25rem] border p-3 ${
            light ? "border-emerald-200/70 bg-white/80" : "border-emerald-400/15 bg-black/20"
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            <Users size={16} className={light ? "text-emerald-700" : "text-lime-300"} />
            <p className={`text-xs font-black uppercase tracking-wide ${light ? "text-slate-700" : "text-emerald-100"}`}>
              {members.length} members matched
            </p>
          </div>
          <label className="relative mb-2 block">
            <Search
              size={14}
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${light ? "text-slate-400" : "text-emerald-300/50"}`}
            />
            <input
              value={listFilter}
              onChange={(e) => setListFilter(e.target.value)}
              placeholder="Filter results…"
              className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm font-semibold outline-none focus:ring-2 ${
                light
                  ? "border-emerald-200/80 bg-white text-slate-900 focus:border-emerald-400 focus:ring-emerald-400/25"
                  : "border-emerald-400/20 bg-black/30 text-white focus:border-emerald-400/50 focus:ring-emerald-400/20"
              }`}
            />
          </label>
          <ul className="max-h-56 space-y-1.5 overflow-y-auto overscroll-contain">
            {filteredMembers.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => setPreviewId(member.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    previewId === member.id
                      ? light
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-emerald-400/40 bg-emerald-500/15"
                      : light
                        ? "border-emerald-200/60 bg-white/80 hover:border-emerald-300"
                        : "border-emerald-400/10 bg-black/20 hover:border-emerald-400/25"
                  }`}
                >
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <LendingAvatar name={member.fullName} size={40} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-bold ${light ? "text-slate-900" : "text-emerald-50"}`}>
                      {member.fullName}
                    </p>
                    <p className={`truncate text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                      {member.fireNepalId} · Trust {member.trustScore} · {member.country}
                    </p>
                  </div>
                  <LendingStatusPill status={member.verified ? "verified" : "unverified"} />
                </button>
              </li>
            ))}
            {filteredMembers.length === 0 ? (
              <li className={`px-2 py-4 text-center text-xs font-semibold ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                No matches in this list.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {previewMember && !loading ? (
        <FireLendingBorrowerMemberCard
          member={previewMember}
          connected={Boolean(connectedMember && connectedMember.id === previewMember.id)}
          onConnect={
            locked
              ? undefined
              : () => {
                  onConnect(previewMember);
                }
          }
        />
      ) : null}

      {locked && connectedMember ? (
        <LendingSecondaryButton onClick={onDisconnect}>Change borrower</LendingSecondaryButton>
      ) : null}

      {!locked && !loading && !searched && query.trim().length < 2 ? (
        <p className={`text-center text-xs font-semibold ${light ? "text-slate-500" : "text-emerald-200/55"}`}>
          Type at least 2 characters to search FIRE Nepal members in real time.
        </p>
      ) : null}
    </div>
  );
}
