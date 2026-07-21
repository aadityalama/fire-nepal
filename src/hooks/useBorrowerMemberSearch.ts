"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BorrowerMemberProfile } from "@/lib/fire-lending/borrower-member";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const DEBOUNCE_MS = 400;

type SearchState = {
  query: string;
  members: BorrowerMemberProfile[];
  loading: boolean;
  searched: boolean;
  error: string | null;
};

/**
 * Debounced FIRE Nepal member search (300–500ms) against public.user_profiles.
 * Re-runs when Supabase realtime reports user_profiles changes.
 */
export function useBorrowerMemberSearch(enabled: boolean) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({
    query: "",
    members: [],
    loading: false,
    searched: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const queryRef = useRef(query);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const runSearch = useCallback(async (raw: string) => {
    const q = raw.trim();
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();

    if (q.length < 2) {
      setState({ query: q, members: [], loading: false, searched: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, query: q, loading: true, error: null }));
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/fire-lending/borrower-search?q=${encodeURIComponent(q)}&limit=12`, {
        method: "GET",
        credentials: "same-origin",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      const body = (await res.json().catch(() => ({}))) as {
        members?: BorrowerMemberProfile[];
        error?: string;
      };
      if (requestId !== requestIdRef.current) return;
      if (!res.ok) {
        setState({
          query: q,
          members: [],
          loading: false,
          searched: true,
          error: body.error || "Search failed",
        });
        return;
      }
      setState({
        query: q,
        members: body.members ?? [],
        loading: false,
        searched: true,
        error: null,
      });
    } catch (err) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      setState({
        query: q,
        members: [],
        loading: false,
        searched: true,
        error: err instanceof Error ? err.message : "Search failed",
      });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const q = query.trim();
    // Debounce all state updates (including clear) so we never sync-setState in the effect body.
    const delay = q.length < 2 ? 0 : DEBOUNCE_MS;
    const t = window.setTimeout(() => {
      void runSearch(q);
    }, delay);
    return () => window.clearTimeout(t);
  }, [query, enabled, runSearch]);

  // Realtime: refresh the current debounced query when user_profiles rows change.
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) return;
    let channel: ReturnType<ReturnType<typeof getSupabaseBrowserClient>["channel"]> | null = null;
    try {
      const client = getSupabaseBrowserClient();
      channel = client
        .channel(`borrower-search-${Math.random().toString(36).slice(2, 8)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_profiles" },
          () => {
            const q = queryRef.current.trim();
            if (q.length >= 2) void runSearch(q);
          },
        )
        .subscribe();
    } catch {
      /* Supabase optional in local demo */
    }
    return () => {
      if (channel) {
        try {
          void getSupabaseBrowserClient().removeChannel(channel);
        } catch {
          /* ignore */
        }
      }
    };
  }, [enabled, runSearch]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const pendingQuery = query.trim();
  const searching =
    state.loading || (enabled && pendingQuery.length >= 2 && pendingQuery !== state.query);

  return {
    query,
    setQuery,
    members: state.members,
    loading: searching,
    searched: state.searched,
    error: state.error,
    refresh: () => void runSearch(query),
    clear: () => {
      setQuery("");
      setState({ query: "", members: [], loading: false, searched: false, error: null });
    },
  };
}
