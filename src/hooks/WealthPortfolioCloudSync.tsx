"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { appToast } from "@/lib/toast";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadWealthPortfolioFromSupabase, saveWealthPortfolioToSupabase } from "@/services/portfolio-supabase";
import { defaultWealthState, portfolioStorageKey } from "@/components/portfolio/storage";

/** Debounce cloud writes so typing does not trigger constant sync work; pairs with stale-save / echo guards below. */
const CLOUD_SAVE_DEBOUNCE_MS = 900;

function portfolioErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") return error.message;
  return "Portfolio cloud sync failed.";
}

function cachePortfolioLocally(userId: string, state: WealthPortfolioStateV2) {
  try {
    window.localStorage.setItem(portfolioStorageKey(userId), JSON.stringify(state));
  } catch {
    /* quota */
  }
}

type Props = {
  hydrated: boolean;
  state: WealthPortfolioStateV2;
  setState: Dispatch<SetStateAction<WealthPortfolioStateV2>>;
  onCloudReady?: (ready: boolean) => void;
};

/**
 * When Supabase is configured and the user is signed in, loads the portfolio from Postgres,
 * debounces saves after edits, and listens for `portfolio_extensions` changes for multi-tab refresh.
 * localStorage is written only after successful cloud load/save (optional offline cache).
 */
export function WealthPortfolioCloudSync({ hydrated, state, setState, onCloudReady }: Props) {
  const { user } = useProductAuth();
  const needRemote = isSupabaseConfigured() && Boolean(user?.id);
  const [remoteLoaded, setRemoteLoaded] = useState(!needRemote);
  const lastSavedRef = useRef<string>("");
  const stateRef = useRef(state);

  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!hydrated || !isSupabaseConfigured() || !user?.id) {
      setRemoteLoaded(!needRemote);
      onCloudReady?.(!needRemote);
      return;
    }
    let cancelled = false;
    onCloudReady?.(false);
    void (async () => {
      try {
        const client = getSupabaseBrowserClient();
        const remote = await loadWealthPortfolioFromSupabase(client, user.id);
        if (cancelled) return;
        if (remote) {
          setState(remote);
          lastSavedRef.current = JSON.stringify(remote);
          cachePortfolioLocally(user.id, remote);
        } else {
          // Empty cloud must replace any prior in-memory / localStorage state.
          const empty = defaultWealthState();
          setState(empty);
          lastSavedRef.current = JSON.stringify(empty);
          cachePortfolioLocally(user.id, empty);
        }
      } catch (e) {
        console.error(e);
        // Never keep browser-local data as truth after login.
        const empty = defaultWealthState();
        setState(empty);
        lastSavedRef.current = JSON.stringify(empty);
        try {
          window.localStorage.removeItem(portfolioStorageKey(user.id));
        } catch {
          /* ignore */
        }
        appToast.error("Could not load portfolio from cloud.", {
          id: "portfolio-cloud-load",
        });
      } finally {
        if (!cancelled) {
          setRemoteLoaded(true);
          onCloudReady?.(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, user?.id, setState, needRemote, onCloudReady]);

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

        const toSave = stateRef.current;
        const snapshot = JSON.stringify(toSave);
        if (snapshot === lastSavedRef.current) return;

        const ok = await saveWealthPortfolioToSupabase(client, user.id, toSave);
        if (ok) {
          if (JSON.stringify(stateRef.current) === snapshot) {
            lastSavedRef.current = snapshot;
            cachePortfolioLocally(user.id, toSave);
            appToast.success("Portfolio synced to cloud.", { id: "portfolio-cloud-save", duration: 2200 });
          }
        } else {
          appToast.error("Portfolio cloud sync failed. Changes were not saved to Supabase.", {
            id: "portfolio-cloud-save-error",
          });
        }
      } catch (error) {
        console.error("Portfolio save failed:", error);
        appToast.error(portfolioErrorMessage(error), { id: "portfolio-cloud-save-error" });
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
            if (local !== lastSavedRef.current) return;
            setState(remote);
            lastSavedRef.current = incoming;
            cachePortfolioLocally(uid, remote);
            appToast.info("Portfolio updated from another session.", {
              id: "portfolio-cloud-remote",
              duration: 3200,
            });
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
