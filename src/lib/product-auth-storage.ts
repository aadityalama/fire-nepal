/** Mock auth persistence (STEP 6A) — replace with real backend later. */

export const PRODUCT_AUTH_STORAGE_KEY = "fire-nepal-product-auth-v1";

export type ProductAuthUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  /** Data URL or HTTPS URL; large blobs should stay server-side in production. */
  avatarUrl?: string | null;
  emailVerified?: boolean;
};

export type ProductAuthSession = {
  version: 1;
  user: ProductAuthUser;
  /** Placeholder for future JWT / refresh token */
  accessToken: "mock";
};

type SaveProductAuthSessionOptions = {
  persistent?: boolean;
};

function safeParse(raw: string | null): ProductAuthSession | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as ProductAuthSession;
    if (v?.version !== 1 || !v.user?.email || !v.user?.id) return null;
    return v;
  } catch {
    return null;
  }
}

export function loadProductAuthSession(): ProductAuthSession | null {
  if (typeof window === "undefined") return null;
  return (
    safeParse(window.localStorage.getItem(PRODUCT_AUTH_STORAGE_KEY)) ??
    safeParse(window.sessionStorage.getItem(PRODUCT_AUTH_STORAGE_KEY))
  );
}

export function saveProductAuthSession(session: ProductAuthSession, options: SaveProductAuthSessionOptions = {}): void {
  if (typeof window === "undefined") return;
  const persistent = options.persistent !== false;
  try {
    const target = persistent ? window.localStorage : window.sessionStorage;
    const other = persistent ? window.sessionStorage : window.localStorage;
    target.setItem(PRODUCT_AUTH_STORAGE_KEY, JSON.stringify(session));
    other.removeItem(PRODUCT_AUTH_STORAGE_KEY);
  } catch {
    /* quota */
  }
}

export function clearProductAuthSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PRODUCT_AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(PRODUCT_AUTH_STORAGE_KEY);
  } catch {
    /* */
  }
}

export function createMockUser(name: string, email: string): ProductAuthUser {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `u_${Math.random().toString(36).slice(2, 12)}`;
  return {
    id,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
}
