/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelWithStream, UserSettings, WatchHistoryItem } from './types.ts';

const STORAGE_KEYS = {
  FAVORITES: 'iptv:favorites',
  HISTORY: 'iptv_hub_history_v1',
  SETTINGS: 'iptv_hub_settings_v1',
  CUSTOM_CHANNELS: 'iptv_hub_custom_channels_v1',
  LAST_CHANNEL: 'iptv_hub_last_channel_v1',
} as const;

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  language: 'es',
  volume: 0.8,
  muted: false,
  theaterMode: false,
  autoplayNext: true,
  lowLatency: true,
};

/**
 * Safe local storage reader
 */
export function safeGetStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[iptv-storage] Failed reading ${key}:`, error);
    return fallback;
  }
}

/**
 * Safe local storage writer
 */
export function safeSetStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[iptv-storage] Failed writing ${key}:`, error);
  }
}

/**
 * Generic External Store implementation compatible with React useSyncExternalStore
 */
export class ExternalStore<T> {
  private key: string;
  private current: T;
  private listeners = new Set<() => void>();

  constructor(key: string, defaultValue: T) {
    this.key = key;
    this.current = safeGetStorage<T>(key, defaultValue);

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === this.key && event.newValue) {
          try {
            this.current = JSON.parse(event.newValue);
            this.notify();
          } catch {
            // Ignore parse errors from other tabs
          }
        }
      });
    }
  }

  public getSnapshot = (): T => {
    return this.current;
  };

  public set = (updater: T | ((prev: T) => T)): void => {
    const next = typeof updater === 'function' ? (updater as (prev: T) => T)(this.current) : updater;
    this.current = next;
    safeSetStorage(this.key, next);
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

// Global store singletons for synchronization across components
export const favoritesStore = new ExternalStore<string[]>(STORAGE_KEYS.FAVORITES, [
  'rtve-24h',
  'euronews-es',
  'dw-espanol',
]);

export const historyStore = new ExternalStore<WatchHistoryItem[]>(STORAGE_KEYS.HISTORY, []);

export const settingsStore = new ExternalStore<UserSettings>(
  STORAGE_KEYS.SETTINGS,
  DEFAULT_SETTINGS
);

export const customChannelsStore = new ExternalStore<ChannelWithStream[]>(
  STORAGE_KEYS.CUSTOM_CHANNELS,
  []
);

export const lastChannelStore = new ExternalStore<string | null>(STORAGE_KEYS.LAST_CHANNEL, 'rtve-24h');
