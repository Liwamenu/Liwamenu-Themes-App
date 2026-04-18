import type { StateStorage } from 'zustand/middleware';

/**
 * Creates a localStorage-backed StateStorage that auto-evicts entries
 * older than `ttlMs`. The persisted JSON is wrapped with a `__savedAt`
 * timestamp on each write and validated on each read.
 */
export function createTTLStorage(ttlMs: number): StateStorage {
  return {
    getItem: (name: string): string | null => {
      try {
        const raw = localStorage.getItem(name);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const savedAt: number | undefined = parsed?.__savedAt;
        if (typeof savedAt === 'number' && Date.now() - savedAt > ttlMs) {
          localStorage.removeItem(name);
          return null;
        }
        return raw;
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: string): void => {
      try {
        const parsed = JSON.parse(value);
        parsed.__savedAt = Date.now();
        localStorage.setItem(name, JSON.stringify(parsed));
      } catch {
        localStorage.setItem(name, value);
      }
    },
    removeItem: (name: string): void => {
      localStorage.removeItem(name);
    },
  };
}

export const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/**
 * Starts a periodic timer that removes the given localStorage key
 * if its persisted `__savedAt` timestamp is older than `ttlMs`.
 * Returns a cleanup function.
 */
export function startTTLEvictionTimer(
  storageKey: string,
  ttlMs: number,
  intervalMs: number = 60_000,
  onEvict?: () => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const id = window.setInterval(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const savedAt: number | undefined = parsed?.__savedAt;
      if (typeof savedAt === 'number' && Date.now() - savedAt > ttlMs) {
        localStorage.removeItem(storageKey);
        onEvict?.();
      }
    } catch {
      /* noop */
    }
  }, intervalMs);
  return () => window.clearInterval(id);
}
