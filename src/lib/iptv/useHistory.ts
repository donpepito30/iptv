/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'iptv:history';
const MAX_HISTORY_ITEMS = 30;

function safeReadHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Support both raw string[] IDs and objects with .channelId / .id
    return parsed
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          return item.channelId || item.id || null;
        }
        return null;
      })
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .slice(0, MAX_HISTORY_ITEMS);
  } catch (error) {
    console.warn('[iptv:history] Failed to read history:', error);
    return [];
  }
}

function safeWriteHistory(items: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn('[iptv:history] Failed to write history:', error);
  }
}

class HistoryStore {
  private current: string[];
  private listeners = new Set<() => void>();

  constructor() {
    this.current = safeReadHistory();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) {
          this.current = safeReadHistory();
          this.notify();
        }
      });
    }
  }

  public getSnapshot = (): string[] => {
    return this.current;
  };

  public set = (updater: (prev: string[]) => string[]): void => {
    const next = updater(this.current);
    this.current = next;
    safeWriteHistory(next);
    this.notify();
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const historyStoreInstance = new HistoryStore();

/**
 * Hook for managing channel watch history persisted in 'iptv:history' (max 30 items without duplicates).
 */
export function useHistory() {
  const history = useSyncExternalStore(
    historyStoreInstance.subscribe,
    historyStoreInstance.getSnapshot
  );

  const addToHistory = useCallback((channelId: string) => {
    if (!channelId) return;
    historyStoreInstance.set((prev) => {
      const filtered = prev.filter((id) => id !== channelId);
      return [channelId, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    });
  }, []);

  const removeFromHistory = useCallback((channelId: string) => {
    historyStoreInstance.set((prev) => prev.filter((id) => id !== channelId));
  }, []);

  const clearHistory = useCallback(() => {
    historyStoreInstance.set(() => []);
  }, []);

  return { history, addToHistory, removeFromHistory, clearHistory };
}
