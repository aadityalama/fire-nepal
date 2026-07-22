"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  clearProductAuthSession,
  loadProductAuthSession,
  saveProductAuthSession,
  type ProductAuthUser,
} from "@/lib/product-auth-storage";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import {
  getSupabaseAuthRememberMe,
  getSupabaseBrowserClient,
  setSupabaseAuthRememberMe,
} from "@/lib/supabase/browser-client";
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

type LoginResult = { ok: true } | { ok: false; error: string };

const ProductAuthContext = createContext<ProductAuthContextValue | null>(null);
const LOGIN_TIMEOUT_MS = 12_000;

function mapSupabaseUser(u: User): ProductAuthUser {
  const meta = u.user_metadata as Record<string, unknown> | undefined;
  const avatarUrl =
    typeof meta?.avatar_url === "string"
      ? meta.avatar_url
      : typeof meta?.avatarUrl === "string"
        ? meta.avatarUrl
        : null;
  return {
    id: u.id,
    email: (u.email ?? "").toLowerCase(),
    name: "",
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

class AuthRequestTimeoutError extends Error {
  constructor() {
    super("Authentication request timed out.");
    this.name = "AuthRequestTimeoutError";
  }
}

function withAuthTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new AuthRequestTimeoutError()), LOGIN_TIMEOUT_MS);
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeout));
  });
}

function mapAuthError(error: unknown): string {
  const code = typeof (error as { code?: unknown })?.code === "string" ? (error as { code: string }).code : "";
  const status = typeof (error as { status?: unknown })?.status === "number" ? (error as { status: number }).status : 0;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const lower = message.toLowerCase();

  if (
    code === "email_not_confirmed" ||
    lower.includes("email not confirmed") ||
    lower.includes("email address is not confirmed")
  ) {
    return "Email not verified. Please confirm your email, then try signing in again.";
  }
  if (
    code === "invalid_credentials" ||
    lower.includes("invalid login credentials") ||
    lower.includes("invalid email or password")
  ) {
    return "Invalid email or password. Double-check and try again.";
  }
  if (
    error instanceof AuthRequestTimeoutError ||
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    (typeof navigator !== "undefined" && navigator.onLine === false)
  ) {
    return "Network connection issue. Check your internet connection and try again.";
  }
  if (status >= 500 || lower.includes("server") || lower.includes("service unavailable")) {
    return "Server unavailable. Please try again in a moment.";
  }
  return message || "Sign-in failed. Please try again.";
}

export function ProductAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ProductAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const loginInFlightRef = useRef<Promise<LoginResult> | null>(null);
  const authMode: "supabase" | "legacy" = isSupabaseConfigured() ? "supabase" : "legacy";

  const refreshSession = useCallback(async () => {
    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabaseBrowserClient();
        const { data, error } = await sb.auth.getSession();
        if (error) throw error;
        const u = data.session?.user ? mapSupabaseUser(data.session.user) : null;
        setUser(u);
        if (u) {
          saveProductAuthSession(
            { version: 1, user: u, accessToken: "mock" },
            { persistent: getSupabaseAuthRememberMe() },
          );
        } else clearProductAuthSession();
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
          const { data, error } = await sb.auth.getSession();
          if (cancelled) return;
          if (error) throw error;
          const u = data.session?.user ? mapSupabaseUser(data.session.user) : null;
          setUser(u);
          if (u) {
            saveProductAuthSession(
              { version: 1, user: u, accessToken: "mock" },
              { persistent: getSupabaseAuthRememberMe() },
            );
          } else clearProductAuthSession();
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
        if (u) {
          saveProductAuthSession(
            { version: 1, user: u, accessToken: "mock" },
            { persistent: getSupabaseAuthRememberMe() },
          );
        } else clearProductAuthSession();
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

  const login = useCallback(async (email: string, password: string, rememberMe = true): Promise<LoginResult> => {
    if (loginInFlightRef.current) return loginInFlightRef.current;

    const loginRequest = (async (): Promise<LoginResult> => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed.includes("@")) return { ok: false, error: "Enter a valid email address." };
      if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };

      if (isSupabaseConfigured()) {
        try {
          console.log("[auth] Auth request started", { email: trimmed, rememberMe, mode: "supabase" });
          setSupabaseAuthRememberMe(rememberMe);
          const sb = getSupabaseBrowserClient();
          const { data, error } = await withAuthTimeout(sb.auth.signInWithPassword({ email: trimmed, password }));
          console.log("[auth] Auth response", {
            hasUser: Boolean(data.user),
            hasSession: Boolean(data.session),
            error: error ? { code: (error as { code?: string }).code, status: error.status, message: error.message } : null,
          });
          if (error) {
            console.error("[auth] Authentication error", error);
            return { ok: false, error: mapAuthError(error) };
          }
          let session: Session | null = data.session;
          if (!session) {
            const current = await sb.auth.getSession();
            if (current.error) throw current.error;
            session = current.data.session;
          }
          if (!session) {
            const refreshed = await sb.auth.refreshSession();
            if (refreshed.error) throw refreshed.error;
            session = refreshed.data.session;
          }
          const authUser = session?.user ?? data.user;
          if (!authUser || !session) {
            console.error("[auth] Authentication error", "Supabase did not create a session.");
            return { ok: false, error: "Sign-in succeeded but no session was created. Please try again." };
          }
          console.log("[auth] Session created", { userId: authUser.id, expiresAt: session.expires_at ?? null });
          const pu = mapSupabaseUser(authUser);
          setUser(pu);
          setLoading(false);
          saveProductAuthSession({ version: 1, user: pu, accessToken: "mock" }, { persistent: rememberMe });
          return { ok: true };
        } catch (e) {
          console.error("[auth] Authentication error", e);
          return { ok: false, error: mapAuthError(e) };
        }
      }

      try {
        console.log("[auth] Auth request started", { email: trimmed, rememberMe, mode: "legacy" });
        const r = await withAuthTimeout(
          fetch("/api/auth/login", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: trimmed, password, rememberMe }),
          }),
        );
        const j = (await r.json().catch(() => ({}))) as { user?: ProductAuthUser; error?: string };
        console.log("[auth] Auth response", { status: r.status, hasUser: Boolean(j.user), error: j.error ?? null });
        if (!r.ok) {
          console.error("[auth] Authentication error", j.error ?? r.statusText);
          return { ok: false, error: j.error ?? "Sign-in failed." };
        }
        if (!j.user) {
          console.error("[auth] Authentication error", "Invalid server response.");
          return { ok: false, error: "Invalid server response." };
        }
        console.log("[auth] Session created", { userId: j.user.id, mode: "legacy" });
        setUser(j.user);
        setLoading(false);
        saveProductAuthSession({ version: 1, user: j.user, accessToken: "mock" }, { persistent: rememberMe });
        return { ok: true };
      } catch (e) {
        console.error("[auth] Authentication error", e);
        return { ok: false, error: mapAuthError(e) };
      }
    })();

    loginInFlightRef.current = loginRequest;
    try {
      return await loginRequest;
    } finally {
      if (loginInFlightRef.current === loginRequest) loginInFlightRef.current = null;
    }
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
        if (data.user) {
          const origin = getPublicSiteOrigin() || (typeof window !== "undefined" ? window.location.origin : "");
          if (origin) {
            void fetch(`${origin}/api/admin-notifications/new-user`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: data.user.id }),
            }).catch((e) => console.error("[auth] admin new-user notify:", e));
          }
        }
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
            full_name: name.trim(),
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
        const avatarFromMeta =
          typeof meta?.avatar_url === "string"
            ? meta.avatar_url
            : typeof meta?.avatarUrl === "string"
              ? meta.avatarUrl
              : null;
        const profileRes = await upsertUserProfileFields(sb, data.user.id, {
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
