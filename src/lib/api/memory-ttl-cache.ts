type Entry<T> = { value: T; expiresAt: number };

/**
 * Process-local TTL cache for server route handlers (not shared across instances).
 */
export function createMemoryTtlCache() {
  const store = new Map<string, Entry<unknown>>();

  return {
    get<T>(key: string): T | undefined {
      const row = store.get(key) as Entry<T> | undefined;
      if (!row) return undefined;
      if (Date.now() > row.expiresAt) {
        store.delete(key);
        return undefined;
      }
      return row.value;
    },
    set<T>(key: string, value: T, ttlMs: number) {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
  };
}
