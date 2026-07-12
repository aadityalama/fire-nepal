"use client";

import { useCallback, useEffect, useState } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import type { PremiumMemberProfileFields } from "@/lib/fire-premium-profile";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { getCurrentUserProfile, saveCurrentUserProfile } from "@/services/user-profile-supabase";

export const CURRENT_USER_PROFILE_UPDATED_EVENT = "fn-current-user-profile-updated";

export function useCurrentUserProfile(): {
  profile: PremiumMemberProfileFields | null;
  loading: boolean;
  reloadProfile: () => Promise<PremiumMemberProfileFields | null>;
  saveProfile: (fields: PremiumMemberProfileFields) => Promise<PremiumMemberProfileFields>;
} {
  const { user } = useProductAuth();
  const [profile, setProfile] = useState<PremiumMemberProfileFields | null>(null);
  const [loading, setLoading] = useState(true);

  const reloadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const next = await getCurrentUserProfile(getSupabaseBrowserClient(), user.id);
      setProfile(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveProfile = useCallback(
    async (fields: PremiumMemberProfileFields) => {
      if (!user) throw new Error("Sign in to save your profile.");
      const next = await saveCurrentUserProfile(getSupabaseBrowserClient(), user.id, fields);
      setProfile(next);
      window.dispatchEvent(new CustomEvent(CURRENT_USER_PROFILE_UPDATED_EVENT, { detail: next }));
      return next;
    },
    [user],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const next = await getCurrentUserProfile(getSupabaseBrowserClient(), user.id);
        if (!cancelled) setProfile(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<PremiumMemberProfileFields>).detail;
      if (detail) setProfile(detail);
      else void reloadProfile();
    };
    window.addEventListener(CURRENT_USER_PROFILE_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(CURRENT_USER_PROFILE_UPDATED_EVENT, onUpdated);
  }, [reloadProfile]);

  return { profile, loading, reloadProfile, saveProfile };
}
