"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadWealthPortfolioFromSupabase, saveWealthPortfolioToSupabase } from "@/services/portfolio-supabase";
import { defaultWealthState } from "@/components/portfolio/storage";
import { toast } from "sonner";

/** Debounce cloud writes so typing does not trigger constant sync work; pairs with stale-save / echo guards below. */
const CLOUD_SAVE_DEBOUNCE_MS = 1000;

function portfolioErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") return error.message;
  return "Portfolio cloud sync failed.";
}

type Props = {
  hydrated: boolean;
  state: WealthPortfolioStateV2;
  setState: Dispatch<SetStateAction<WealthPortfolioStateV2>>;
};

/**
 * When Supabase is configured and the user is signed in, loads the portfolio from Postgres,
 * debounces saves after edits, and listens for `portfolio_extensions` changes for multi-tab refresh.
 */
export function WealthPortfolioCloudSync({ hydrated, state, setState }: Props) {
  const { user } = useProductAuth();
  const needRemote = isSupabaseConfigured() && Boolean(user?.id);
  const [remoteLoaded, setRemoteLoaded] = useState(!needRemote);
  const lastSavedRef = useRef<string>("");
  const stateRef = useRef(state);

  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!hydrated || !isSupabaseConfigured() || !user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const client = getSupabaseBrowserClient();
        const remote = await loadWealthPortfolioFromSupabase(client, user.id);
        if (cancelled) return;
        if (remote) {
          setState(remote);
          lastSavedRef.current = JSON.stringify(remote);
        } else {
          // Critical: empty cloud must replace any prior in-memory / localStorage state from another account
          // on the same browser; previously we only called setState when remote was non-null.
          const empty = defaultWealthState();
          setState(empty);
          lastSavedRef.current = JSON.stringify(empty);
        }
      } catch (e) {
        console.error(e);
        toast.error("Could not load portfolio from cloud.");
      } finally {
        if (!cancelled) setRemoteLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, user?.id, setState]);

  useEffect(() => {
    if (!hydrated || !remoteLoaded || !isSupabaseConfigured() || !user?.id) return;
    const serialized = JSON.stringify(state);
    if (serialized === lastSavedRef.current) return;

    const t = window.setTimeout(async () => {
      try {
        const client = getSupabaseBrowserClient();
        const { data: authData, error: authError } = await client.auth.getUser();
        if (authError) throw authError;
        if (!authData.user?.id) throw new Error("No authenticated Supabase user found. Please sign in again.");
        if (authData.user.id !== user.id) {
          throw new Error("Authenticated user changed before portfolio save. Please refresh and try again.");
        }

        // Always persist the latest snapshot (avoids stale closure if the timer was scheduled on an older render).
        const toSave = stateRef.current;
        const snapshot = JSON.stringify(toSave);
        if (snapshot === lastSavedRef.current) return;

        const ok = await saveWealthPortfolioToSupabase(client, user.id, toSave);
        if (ok) {
          // If the user kept typing while the request was in flight, do not mark as saved or toast — a new debounced save will run.
          if (JSON.stringify(stateRef.current) === snapshot) {
            lastSavedRef.current = snapshot;
            toast.success("Portfolio synced to cloud", { id: "portfolio-cloud-save", duration: 2200 });
          }
        } else {
          toast.error("Portfolio cloud sync failed.");
        }
      } catch (error) {
        console.error("Portfolio save failed:", error);
        toast.error(portfolioErrorMessage(error));
      }
    }, CLOUD_SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(t);
  }, [state, hydrated, remoteLoaded, user?.id]);

  useEffect(() => {
    if (!hydrated || !remoteLoaded || !isSupabaseConfigured() || !user?.id) return;
    const client = getSupabaseBrowserClient();
    const uid = user.id;
    const channel = client
      .channel(`portfolio-extensions-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "portfolio_extensions", filter: `user_id=eq.${uid}` },
        async () => {
          try {
            const remote = await loadWealthPortfolioFromSupabase(client, uid);
            if (!remote) return;
            const incoming = JSON.stringify(remote);
            const local = JSON.stringify(stateRef.current);
            if (incoming === local) return;
            // Do not replace in-memory state while there are edits not yet reflected in `lastSavedRef`
            // (avoids postgres echo / slow saves wiping text the user is still typing).
            if (local !== lastSavedRef.current) return;
            setState(remote);
            lastSavedRef.current = incoming;
            toast.message("Portfolio updated from another session.", { duration: 3200 });
          } catch {
            /* ignore */
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [hydrated, remoteLoaded, user?.id, setState]);

  return null;
}
