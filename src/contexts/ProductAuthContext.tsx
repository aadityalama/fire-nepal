"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  clearProductAuthSession,
  loadProductAuthSession,
  saveProductAuthSession,
  type ProductAuthUser,
} from "@/lib/product-auth-storage";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { upsertUserProfileFields } from "@/services/user-profile-supabase";

export type SignupOptions = {
  confirmPassword: string;
  avatarUrl?: string | null;
};

type ProductAuthContextValue = {
  user: ProductAuthUser | null;
  loading: boolean;
  /** Supabase session only: true if `public.admin_users` contains this user. Always false for legacy auth. */
  isAdmin: boolean;
  authMode: "supabase" | "legacy";
  refreshSession: () => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ ok: boolean; error?: string }>;
  signup: (
    name: string,
    email: string,
    password: string,
    opts: SignupOptions,
  ) => Promise<
    | { ok: true; needsVerification: true; email: string; expiresAt: number; devCode?: string }
    | { ok: true; needsVerification?: false }
    | { ok: false; error: string }
  >;
  verifyEmail: (email: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  resendVerification: (
    email: string,
  ) => Promise<{ ok: boolean; error?: string; expiresAt?: number; devCode?: string }>;
  logout: () => Promise<void>;
};

const ProductAuthContext = createContext<ProductAuthContextValue | null>(null);

function mapSupabaseUser(u: User): ProductAuthUser {
  const meta = u.user_metadata as Record<string, unknown> | undefined;
  const name =
    (typeof meta?.name === "string" && meta.name) ||
    (typeof meta?.full_name === "string" && meta.full_name) ||
    u.email?.split("@")[0] ||
    "Member";
  const avatarUrl =
    typeof meta?.avatar_url === "string"
      ? meta.avatar_url
      : typeof meta?.avatarUrl === "string"
        ? meta.avatarUrl
        : null;
  return {
    id: u.id,
    email: (u.email ?? "").toLowerCase(),
    name,
    createdAt: u.created_at,
    avatarUrl,
    emailVerified: Boolean(u.email_confirmed_at),
  };
}

async function fetchSessionUser(): Promise<ProductAuthUser | null> {
  const r = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
  if (!r.ok) return null;
  const j = (await r.json()) as { user?: ProductAuthUser | null };
  return j.user ?? null;
}

async function syncLegacySession(): Promise<ProductAuthUser | null> {
  const legacy = loadProductAuthSession();
  if (!legacy?.user) return null;
  const r = await fetch("/api/auth/sync", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session: legacy }),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { user?: ProductAuthUser };
  return j.user ?? null;
}

export function ProductAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ProductAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const authMode: "supabase" | "legacy" = isSupabaseConfigured() ? "supabase" : "legacy";

  const refreshSession = useCallback(async () => {
    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabaseBrowserClient();
        const { data, error } = await sb.auth.getUser();
        if (error) throw error;
        const u = data.user ? mapSupabaseUser(data.user) : null;
        setUser(u);
        if (u) saveProductAuthSession({ version: 1, user: u, accessToken: "mock" });
        else clearProductAuthSession();
      } catch {
        setUser(null);
        clearProductAuthSession();
      }
      return;
    }
    let u = await fetchSessionUser();
    if (!u) u = await syncLegacySession();
    if (u) {
      setUser(u);
      saveProductAuthSession({ version: 1, user: u, accessToken: "mock" });
    } else {
      setUser(null);
      clearProductAuthSession();
    }
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      let cancelled = false;
      const sb = getSupabaseBrowserClient();
      void (async () => {
        try {
          const { data, error } = await sb.auth.getUser();
          if (cancelled) return;
          if (error) throw error;
          const u = data.user ? mapSupabaseUser(data.user) : null;
          setUser(u);
          if (u) saveProductAuthSession({ version: 1, user: u, accessToken: "mock" });
          else clearProductAuthSession();
        } catch {
          if (!cancelled) {
            setUser(null);
            clearProductAuthSession();
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      const {
        data: { subscription },
      } = sb.auth.onAuthStateChange((_event, session) => {
        const u = session?.user ? mapSupabaseUser(session.user) : null;
        setUser(u);
        if (u) saveProductAuthSession({ version: 1, user: u, accessToken: "mock" });
        else clearProductAuthSession();
      });
      return () => {
        cancelled = true;
        subscription.unsubscribe();
      };
    }

    let cancelled = false;
    void (async () => {
      await refreshSession();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isSupabaseConfigured() || !user) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      if (!cancelled) setIsAdmin(false);
      try {
        const r = await fetch("/api/auth/admin-status", { credentials: "include", cache: "no-store" });
        const j = (await r.json().catch(() => ({}))) as { isAdmin?: boolean };
        if (!cancelled) setIsAdmin(Boolean(j.isAdmin));
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) return { ok: false as const, error: "Enter a valid email address." };
    if (password.length < 6) return { ok: false as const, error: "Password must be at least 6 characters." };

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabaseBrowserClient();
        const { data, error } = await sb.auth.signInWithPassword({ email: trimmed, password });
        if (error) {
          const msg = (error.message ?? "").toLowerCase();
          const code = (error as { code?: string }).code;
          if (
            code === "email_not_confirmed" ||
            msg.includes("email not confirmed") ||
            msg.includes("email address is not confirmed")
          ) {
            return {
              ok: false as const,
              error:
                "Confirm your email before signing in. Open the verification link Supabase sent you, or enter the code on the verify-email page, then try again.",
            };
          }
          return { ok: false as const, error: error.message };
        }
        if (!data.user) return { ok: false as const, error: "Sign-in failed." };
        const pu = mapSupabaseUser(data.user);
        setUser(pu);
        saveProductAuthSession({ version: 1, user: pu, accessToken: "mock" });
        void rememberMe;
        return { ok: true as const };
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Sign-in failed." };
      }
    }

    const r = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed, password, rememberMe }),
    });
    const j = (await r.json().catch(() => ({}))) as { user?: ProductAuthUser; error?: string };
    if (!r.ok) {
      return { ok: false as const, error: j.error ?? "Sign-in failed." };
    }
    if (!j.user) {
      return { ok: false as const, error: "Invalid server response." };
    }
    setUser(j.user);
    saveProductAuthSession({ version: 1, user: j.user, accessToken: "mock" });
    return { ok: true as const };
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string, opts: SignupOptions) => {
    if (name.trim().length < 2) return { ok: false as const, error: "Enter your full name." };
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) return { ok: false as const, error: "Enter a valid email address." };
    if (password.length < 6) return { ok: false as const, error: "Use at least 6 characters for your password." };
    if (opts.confirmPassword !== password) {
      return { ok: false as const, error: "Passwords do not match." };
    }

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabaseBrowserClient();
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const { data, error } = await sb.auth.signUp({
          email: trimmed,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback`,
            data: {
              name: name.trim(),
              avatar_url: opts.avatarUrl ?? undefined,
            },
          },
        });
        if (error) return { ok: false as const, error: error.message };
        if (data.user && !data.session) {
          return {
            ok: true as const,
            needsVerification: true as const,
            email: trimmed,
            expiresAt: Date.now() + 1000 * 60 * 60,
          };
        }
        if (data.session && data.user) {
          const pu = mapSupabaseUser(data.user);
          setUser(pu);
          saveProductAuthSession({ version: 1, user: pu, accessToken: "mock" });
          const profileRes = await upsertUserProfileFields(sb, data.user.id, {
            display_name: name.trim(),
            avatar_url: opts.avatarUrl ?? null,
          });
          if (profileRes.error) {
            console.error("[auth] user_profiles upsert after signup:", profileRes.error);
          }
          return { ok: true as const };
        }
        return { ok: false as const, error: "Sign-up could not be completed." };
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Sign-up failed." };
      }
    }

    const r = await fetch("/api/auth/signup", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: trimmed,
        password,
        confirmPassword: opts.confirmPassword,
        avatarUrl: opts.avatarUrl ?? null,
      }),
    });
    const j = (await r.json().catch(() => ({}))) as {
      needsVerification?: boolean;
      email?: string;
      expiresAt?: number;
      devCode?: string;
      error?: string;
    };
    if (!r.ok) {
      return { ok: false as const, error: j.error ?? "Sign-up failed." };
    }
    if (j.needsVerification && j.email && typeof j.expiresAt === "number") {
      return {
        ok: true as const,
        needsVerification: true as const,
        email: j.email,
        expiresAt: j.expiresAt,
        devCode: j.devCode,
      };
    }
    return { ok: true as const };
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    const trimmed = email.trim().toLowerCase();
    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabaseBrowserClient();
        const { data, error } = await sb.auth.verifyOtp({
          email: trimmed,
          token: code.replace(/\D/g, ""),
          type: "signup",
        });
        if (error) return { ok: false as const, error: error.message };
        if (!data.user) return { ok: false as const, error: "Verification failed." };
        const pu = mapSupabaseUser(data.user);
        setUser(pu);
        saveProductAuthSession({ version: 1, user: pu, accessToken: "mock" });
        const meta = data.user.user_metadata as Record<string, unknown> | undefined;
        const displayName = typeof meta?.name === "string" ? meta.name : pu.name;
        const avatarFromMeta =
          typeof meta?.avatar_url === "string"
            ? meta.avatar_url
            : typeof meta?.avatarUrl === "string"
              ? meta.avatarUrl
              : null;
        const profileRes = await upsertUserProfileFields(sb, data.user.id, {
          display_name: displayName,
          avatar_url: avatarFromMeta ?? pu.avatarUrl,
        });
        if (profileRes.error) {
          console.error("[auth] user_profiles upsert after verify:", profileRes.error);
        }
        return { ok: true as const };
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Verification failed." };
      }
    }

    const r = await fetch("/api/auth/verify-email", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed, code }),
    });
    const j = (await r.json().catch(() => ({}))) as { user?: ProductAuthUser; error?: string };
    if (!r.ok) {
      return { ok: false as const, error: j.error ?? "Verification failed." };
    }
    if (!j.user) {
      return { ok: false as const, error: "Invalid server response." };
    }
    setUser(j.user);
    saveProductAuthSession({ version: 1, user: j.user, accessToken: "mock" });
    return { ok: true as const };
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabaseBrowserClient();
        const origin = getPublicSiteOrigin();
        const { error } = await sb.auth.resend({
          type: "signup",
          email: trimmed,
          options: { emailRedirectTo: `${origin}/auth/callback` },
        });
        if (error) return { ok: false as const, error: error.message };
        return {
          ok: true as const,
          expiresAt: Date.now() + 1000 * 60 * 60,
        };
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Could not resend." };
      }
    }

    const r = await fetch("/api/auth/resend-verification", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; expiresAt?: number; devCode?: string; error?: string };
    if (!r.ok) {
      return { ok: false as const, error: j.error ?? "Could not resend code." };
    }
    return {
      ok: true as const,
      expiresAt: j.expiresAt,
      devCode: j.devCode,
    };
  }, []);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabaseBrowserClient();
        await sb.auth.signOut();
      } catch {
        /* ignore */
      }
    }
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    clearProductAuthSession();
    setUser(null);
    setIsAdmin(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin,
      authMode,
      refreshSession,
      login,
      signup,
      verifyEmail,
      resendVerification,
      logout,
    }),
    [user, loading, isAdmin, authMode, refreshSession, login, signup, verifyEmail, resendVerification, logout],
  );

  return <ProductAuthContext.Provider value={value}>{children}</ProductAuthContext.Provider>;
}

export function useProductAuth(): ProductAuthContextValue {
  const ctx = useContext(ProductAuthContext);
  if (!ctx) {
    throw new Error("useProductAuth must be used within ProductAuthProvider");
  }
  return ctx;
}
