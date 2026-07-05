import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase-database";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/config";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;
let authShouldPersist = true;

const AUTH_PERSISTENCE_KEY = "fire-nepal-supabase-remember-me";

type BrowserAuthStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function resolvePersistentPreference(): boolean {
  if (typeof window === "undefined") return true;
  const local = window.localStorage.getItem(AUTH_PERSISTENCE_KEY);
  if (local === "true") return true;
  if (local === "false") return false;
  const session = window.sessionStorage.getItem(AUTH_PERSISTENCE_KEY);
  if (session === "false") return false;
  return true;
}

function selectedStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return authShouldPersist ? window.localStorage : window.sessionStorage;
}

function createAuthStorage(): BrowserAuthStorage {
  return {
    getItem(key) {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    },
    setItem(key, value) {
      const target = selectedStorage();
      if (!target || typeof window === "undefined") return;
      const other = authShouldPersist ? window.sessionStorage : window.localStorage;
      target.setItem(key, value);
      other.removeItem(key);
    },
    removeItem(key) {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    },
  };
}

export function setSupabaseAuthRememberMe(rememberMe: boolean): void {
  authShouldPersist = rememberMe;
  if (typeof window === "undefined") return;
  try {
    if (rememberMe) {
      window.localStorage.setItem(AUTH_PERSISTENCE_KEY, "true");
      window.sessionStorage.removeItem(AUTH_PERSISTENCE_KEY);
    } else {
      window.localStorage.removeItem(AUTH_PERSISTENCE_KEY);
      window.sessionStorage.setItem(AUTH_PERSISTENCE_KEY, "false");
    }
  } catch {
    /* storage can be unavailable in private browsing */
  }
}

export function getSupabaseAuthRememberMe(): boolean {
  authShouldPersist = resolvePersistentPreference();
  return authShouldPersist;
}

/** Singleton browser client (Auth + Realtime + Postgres). */
export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).");
  }
  if (!browserClient) {
    authShouldPersist = resolvePersistentPreference();
    browserClient = createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storage: createAuthStorage(),
      },
    });
  }
  return browserClient;
}
