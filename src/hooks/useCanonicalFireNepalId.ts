"use client";

import { useEffect, useState } from "react";
import type { ProductAuthUser } from "@/lib/product-auth-storage";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchCanonicalFireNepalId } from "@/services/user-profile-supabase";

export function useCanonicalFireNepalId(user: ProductAuthUser | null): {
  fireNepalId: string | null;
  loading: boolean;
} {
  const [fireNepalId, setFireNepalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setFireNepalId(null);
      if (!user || !isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const id = await fetchCanonicalFireNepalId(getSupabaseBrowserClient(), user.id);
        if (!cancelled) setFireNepalId(id);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { fireNepalId, loading };
}
