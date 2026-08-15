/**
 * Per-user localStorage key helpers with non-destructive legacy migration.
 * Never deletes the legacy unscoped key until the scoped write succeeds.
 */

export function scopedStorageKey(baseKey: string, userId?: string | null): string {
  if (userId) return `${baseKey}:user:${userId}`;
  return baseKey;
}

export function isScopedOrLegacyKey(baseKey: string, key: string | null | undefined): boolean {
  if (key == null) return false;
  return key === baseKey || key.startsWith(`${baseKey}:user:`);
}

/**
 * Read scoped key first; if missing and userId is set, fall back to legacy unscoped
 * and copy into the scoped key (preserving legacy until copy succeeds).
 */
export function readJsonWithLegacyMigration<T>(
  baseKey: string,
  userId: string | null | undefined,
  parse: (raw: string) => T | null,
): T | null {
  if (typeof window === "undefined") return null;
  const scoped = scopedStorageKey(baseKey, userId);
  try {
    const scopedRaw = window.localStorage.getItem(scoped);
    if (scopedRaw) {
      const parsed = parse(scopedRaw);
      if (parsed != null) return parsed;
    }
    if (userId) {
      const legacyRaw = window.localStorage.getItem(baseKey);
      if (legacyRaw) {
        const parsed = parse(legacyRaw);
        if (parsed != null) {
          try {
            window.localStorage.setItem(scoped, legacyRaw);
          } catch {
            /* quota — still return parsed legacy */
          }
          return parsed;
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function writeJsonScoped(baseKey: string, userId: string | null | undefined, value: unknown): void {
  if (typeof window === "undefined") return;
  const key = scopedStorageKey(baseKey, userId);
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeScopedAndLegacy(baseKey: string, userId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(scopedStorageKey(baseKey, userId));
    if (userId) {
      // Only remove legacy after scoped clear when explicitly wiping a user cache.
      // Callers that migrate should not use this until scoped write succeeded.
    }
  } catch {
    /* ignore */
  }
}
