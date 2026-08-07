"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
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

type SearchAction =
  | { type: "reset" }
  | { type: "clear_short"; query: string }
  | { type: "start"; query: string }
  | { type: "success"; query: string; members: BorrowerMemberProfile[] }
  | { type: "failure"; query: string; error: string };

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case "reset":
      return { query: "", members: [], loading: false, searched: false, error: null };
    case "clear_short":
      return { query: action.query, members: [], loading: false, searched: false, error: null };
    case "start":
      return { ...state, query: action.query, loading: true, error: null };
    case "success":
      return {
        query: action.query,
        members: action.members,
        loading: false,
        searched: true,
        error: null,
      };
    case "failure":
      return {
        query: action.query,
        members: [],
        loading: false,
        searched: true,
        error: action.error,
      };
    default:
      return state;
  }
}

/**
 * Debounced FIRE Nepal member search (300–500ms) against public.user_profiles.
 * Re-runs when Supabase realtime reports user_profiles changes.
 */
export function useBorrowerMemberSearch(enabled: boolean) {
  const [query, setQuery] = useState("");
  const [state, dispatch] = useReducer(searchReducer, {
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
      dispatch({ type: "clear_short", query: q });
      return;
    }

    dispatch({ type: "start", query: q });
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
        dispatch({
          type: "failure",
          query: q,
          error: body.error || "Search failed",
        });
        return;
      }
      dispatch({ type: "success", query: q, members: body.members ?? [] });
    } catch (err) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      dispatch({
        type: "failure",
        query: q,
        error: err instanceof Error ? err.message : "Search failed",
      });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const q = query.trim();
    const delay = q.length < 2 ? 0 : DEBOUNCE_MS;
    const t = window.setTimeout(() => {
      void runSearch(q);
    }, delay);
    return () => window.clearTimeout(t);
  }, [query, enabled, runSearch]);

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

  return useMemo(
    () => ({
      query,
      setQuery,
      members: state.members,
      loading: searching,
      searched: state.searched,
      error: state.error,
      refresh: () => void runSearch(query),
      clear: () => {
        setQuery("");
        dispatch({ type: "reset" });
      },
    }),
    [query, state.members, searching, state.searched, state.error, runSearch],
  );
}
