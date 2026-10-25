/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useSyncExternalStore } from 'react';
import {
  customChannelsStore,
  favoritesStore,
  historyStore,
  lastChannelStore,
  settingsStore,
} from './storage.ts';
import { ChannelWithStream, UserSettings, WatchHistoryItem } from './types.ts';

/**
 * Reactive hook for user settings persisted to localStorage
 */
export function useSettings(): [
  UserSettings,
  (updater: Partial<UserSettings> | ((prev: UserSettings) => UserSettings)) => void,
] {
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);

  const updateSettings = useCallback(
    (updater: Partial<UserSettings> | ((prev: UserSettings) => UserSettings)) => {
      settingsStore.set((prev) => {
        if (typeof updater === 'function') {
          return updater(prev);
        }
        return { ...prev, ...updater };
      });
    },
    []
  );

  return [settings, updateSettings];
}

/**
 * Reactive hook for favorite channels
 */
export function useFavorites() {
  const favorites = useSyncExternalStore(favoritesStore.subscribe, favoritesStore.getSnapshot);

  const isFavorite = useCallback(
    (channelId: string) => favorites.includes(channelId),
    [favorites]
  );

  const toggleFavorite = useCallback((channelId: string) => {
    favoritesStore.set((prev) => {
      if (prev.includes(channelId)) {
        return prev.filter((id) => id !== channelId);
      }
      return [...prev, channelId];
    });
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}

/**
 * Reactive hook for watch history
 */
export function useWatchHistory() {
  const history = useSyncExternalStore(historyStore.subscribe, historyStore.getSnapshot);

  const addToHistory = useCallback((channel: ChannelWithStream) => {
    historyStore.set((prev) => {
      const filtered = prev.filter((item) => item.channelId !== channel.id);
      const newItem: WatchHistoryItem = {
        channelId: channel.id,
        channelName: channel.name,
        logo: channel.logo,
        countryFlag: channel.countryFlag,
        watchedAt: Date.now(),
      };
      return [newItem, ...filtered].slice(0, 30); // Keep last 30 channels
    });
  }, []);

  const clearHistory = useCallback(() => {
    historyStore.set([]);
  }, []);

  return { history, addToHistory, clearHistory };
}

/**
 * Reactive hook for custom channels added by user
 */
export function useCustomChannels() {
  const customChannels = useSyncExternalStore(
    customChannelsStore.subscribe,
    customChannelsStore.getSnapshot
  );

  const addCustomChannel = useCallback((channel: ChannelWithStream) => {
    customChannelsStore.set((prev) => [channel, ...prev]);
  }, []);

  const removeCustomChannel = useCallback((channelId: string) => {
    customChannelsStore.set((prev) => prev.filter((c) => c.id !== channelId));
  }, []);

  return { customChannels, addCustomChannel, removeCustomChannel };
}

/**
 * Reactive hook for the last active channel
 */
export function useLastChannel(): [string | null, (id: string) => void] {
  const lastChannel = useSyncExternalStore(
    lastChannelStore.subscribe,
    lastChannelStore.getSnapshot
  );

  const setLastChannel = useCallback((id: string) => {
    lastChannelStore.set(id);
  }, []);

  return [lastChannel, setLastChannel];
}
