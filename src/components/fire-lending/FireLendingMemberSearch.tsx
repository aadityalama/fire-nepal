"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { BadgeCheck, Loader2, Search, UserRound } from "lucide-react";
import { LendingAvatar } from "@/components/fire-lending/FireLendingUiPrimitives";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { isP2PSearchQueryReady, normalizeP2PSearchQuery } from "@/lib/fire-lending/p2p-member-profile";
import type { P2PMemberSearchHit, P2PMemberSearchResponse } from "@/lib/fire-lending/p2p-member-types";

const DEBOUNCE_MS = 320;

type FireLendingMemberSearchProps = {
  value: string;
  onQueryChange: (query: string) => void;
  onSelectMember?: (hit: P2PMemberSearchHit) => void;
  selectedFireNepalId?: string;
  /** Optional local/demo hits merged after remote results (same FIRE ID wins for remote). */
  localHits?: P2PMemberSearchHit[];
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
};

export function FireLendingMemberSearch({
  value,
  onQueryChange,
  onSelectMember,
  selectedFireNepalId,
  localHits = [],
  label = "Borrower / lender search",
  placeholder = "Search FIRE Nepal ID or member name...",
  autoFocus,
}: FireLendingMemberSearchProps) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const listId = useId();
  const [loading, setLoading] = useState(false);
  const [remoteHits, setRemoteHits] = useState<P2PMemberSearchHit[]>([]);
  const [matchState, setMatchState] = useState<P2PMemberSearchResponse["matchState"]>("empty_query");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    const q = normalizeP2PSearchQuery(value);
    if (!isP2PSearchQueryReady(q)) {
      abortRef.current?.abort();
      setRemoteHits([]);
      setLoading(false);
      setError(null);
      setMatchState("empty_query");
      return;
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const seq = ++requestSeq.current;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/fire-lending/members/search?q=${encodeURIComponent(q)}&limit=8`, {
          signal: controller.signal,
          credentials: "same-origin",
        });
        if (seq !== requestSeq.current) return;
        if (res.status === 429) {
          setError("Too many searches — wait a moment and try again.");
          setRemoteHits([]);
          setMatchState("no_results");
          return;
        }
        if (!res.ok) {
          setError(res.status === 401 ? "Sign in to search members." : "Search unavailable right now.");
          setRemoteHits([]);
          setMatchState("no_results");
          return;
        }
        const data = (await res.json()) as P2PMemberSearchResponse;
        if (seq !== requestSeq.current) return;
        setRemoteHits(data.matches ?? []);
        setMatchState(data.matchState);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        if (seq !== requestSeq.current) return;
        setError("Search unavailable right now.");
        setRemoteHits([]);
        setMatchState("no_results");
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value]);

  const remoteIds = new Set(remoteHits.map((h) => h.fireNepalId.toUpperCase()));
  const qReady = isP2PSearchQueryReady(value);
  const localFiltered = qReady
    ? localHits.filter((h) => {
        const q = normalizeP2PSearchQuery(value).toLowerCase();
        return (
          !remoteIds.has(h.fireNepalId.toUpperCase()) &&
          (h.displayName.toLowerCase().includes(q) ||
            h.fireNepalId.toLowerCase().includes(q) ||
            h.fireNepalId.replace(/[^a-z0-9]/gi, "").includes(q.replace(/[^a-z0-9]/gi, "")))
        );
      })
    : [];
  const hits = [...remoteHits, ...localFiltered];
  const effectiveState =
    !qReady
      ? "empty_query"
      : loading && hits.length === 0
        ? matchState
        : hits.length === 0
          ? "no_results"
          : hits.length === 1
            ? "single"
            : "multiple";

  return (
    <div className="space-y-2">
      <label className="block">
        <span className={`mb-1 flex items-center gap-1.5 text-xs font-bold ${light ? "text-slate-700" : "text-emerald-200/80"}`}>
          <Search size={12} />
          {label}
        </span>
        <div className="relative">
          <input
            type="search"
            value={value}
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            role="combobox"
            aria-expanded={qReady}
            aria-controls={listId}
            aria-autocomplete="list"
            placeholder={placeholder}
            onChange={(e) => onQueryChange(e.target.value)}
            className={`w-full rounded-xl border py-2.5 pl-3 pr-10 text-sm font-semibold outline-none transition focus:ring-2 ${
              light
                ? "border-emerald-200/80 bg-white text-slate-900 focus:border-emerald-400 focus:ring-emerald-400/25"
                : "border-emerald-400/20 bg-black/30 text-white focus:border-emerald-400/50 focus:ring-emerald-400/20"
            }`}
          />
          <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${light ? "text-slate-400" : "text-emerald-200/50"}`}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <UserRound size={16} />}
          </span>
        </div>
      </label>

          {error && hits.length === 0 ? (
        <p role="alert" className="text-[11px] font-semibold text-rose-400">
          {error}
        </p>
      ) : null}

      {qReady ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Matching verified members"
          className={`overflow-hidden rounded-2xl border ${
            light ? "border-emerald-200/70 bg-white/95" : "border-emerald-400/15 bg-black/30"
          }`}
        >
          {loading && hits.length === 0 ? (
            <div className={`flex items-center gap-2 px-3 py-4 text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/70"}`}>
              <Loader2 size={16} className="animate-spin" />
              Searching verified members…
            </div>
          ) : null}

          {!loading && effectiveState === "no_results" ? (
            <div className={`px-3 py-4 text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/70"}`}>
              {error
                ? error
                : `No verified members match “${normalizeP2PSearchQuery(value)}”.`}
            </div>
          ) : null}

          {hits.length > 0 ? (
            <ul className="divide-y divide-emerald-500/10">
              {effectiveState === "multiple" ? (
                <li className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${light ? "bg-emerald-50 text-emerald-800" : "bg-emerald-500/10 text-lime-200/80"}`}>
                  {hits.length} matching members
                </li>
              ) : null}
              {hits.map((hit) => {
                const selected = selectedFireNepalId?.toUpperCase() === hit.fireNepalId.toUpperCase();
                return (
                  <li key={hit.fireNepalId} role="option" aria-selected={selected}>
                    <FireLendingMemberPreviewCard
                      hit={hit}
                      selected={selected}
                      onSelect={() => onSelectMember?.(hit)}
                    />
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className={`text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/45"}`}>
          Type a FIRE Nepal ID or member name (at least 2 characters).
        </p>
      )}
    </div>
  );
}

export function FireLendingMemberPreviewCard({
  hit,
  selected,
  onSelect,
}: {
  hit: P2PMemberSearchHit;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const profileHref = `/fire-lending/members/${encodeURIComponent(hit.fireNepalId)}`;

  return (
    <div
      className={`animate-fade-up px-3 py-3 transition ${
        selected
          ? light
            ? "bg-emerald-50"
            : "bg-emerald-500/15"
          : light
            ? "hover:bg-emerald-50/70"
            : "hover:bg-emerald-500/10"
      }`}
    >
      <button type="button" onClick={onSelect} className="flex w-full items-start gap-3 text-left">
        {hit.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hit.avatarUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-emerald-400/30"
          />
        ) : (
          <LendingAvatar name={hit.displayName} size={44} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className={`truncate text-sm font-black uppercase tracking-wide ${light ? "text-slate-900" : "text-emerald-50"}`}>
              {hit.displayName}
            </p>
            {hit.verificationStatus === "verified" ? (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                  light ? "bg-emerald-100 text-emerald-800" : "bg-emerald-500/20 text-lime-200"
                }`}
              >
                <BadgeCheck size={11} />
                Verified
              </span>
            ) : null}
          </div>
          <p className={`mt-0.5 text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
            FIRE Nepal ID: {hit.fireNepalId}
          </p>
          <p className={`mt-1 text-[12px] font-bold ${light ? "text-slate-700" : "text-emerald-100"}`}>
            Trust Score: {hit.trustScore}/100
          </p>
          <p className={`text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/55"}`}>
            Completed Loans: {hit.completedLoans} · On-time: {hit.onTimeRepaymentPct}%
          </p>
        </div>
      </button>
      <div className="mt-2 pl-14">
        <Link
          href={profileHref}
          className={`inline-flex items-center gap-1 text-xs font-black transition hover:underline ${
            light ? "text-emerald-700" : "text-lime-300"
          }`}
        >
          View Lending Profile →
        </Link>
      </div>
    </div>
  );
}
