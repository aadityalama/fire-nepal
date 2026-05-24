"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadWealthPortfolioFromSupabase, saveWealthPortfolioToSupabase } from "@/services/portfolio-supabase";
import { toast } from "sonner";

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
        const ok = await saveWealthPortfolioToSupabase(client, user.id, state);
        if (ok) {
          lastSavedRef.current = serialized;
          toast.success("Portfolio synced to cloud", { id: "portfolio-cloud-save", duration: 2200 });
        } else {
          toast.error("Portfolio cloud sync failed.");
        }
      } catch (e) {
        console.error(e);
        toast.error("Portfolio cloud sync failed.");
      }
    }, 900);

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
            if (incoming === JSON.stringify(stateRef.current)) return;
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
