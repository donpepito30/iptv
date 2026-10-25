/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useMemo, useState } from 'react';
import { getQualityRank } from './catalog.ts';
import { normalizeText } from './categories.ts';
import { CatalogChannel } from './types.ts';

export interface ChannelFilterState {
  search: string;
  country: string; // 'ALL' or country ISO code (e.g. 'ES')
  region: string; // 'ALL' or region name (e.g. 'Europe')
  category: string; // 'ALL' or category id (e.g. 'news', 'sports')
  minQuality: string; // 'ALL' | '1080p' | '720p' | '480p'
  onlyFavorites: boolean;
  onlyLive: boolean; // Flag for live-only toggle
}

export const DEFAULT_FILTER_STATE: ChannelFilterState = {
  search: '',
  country: 'ALL',
  region: 'ALL',
  category: 'ALL',
  minQuality: 'ALL',
  onlyFavorites: false,
  onlyLive: false,
};

/**
 * Pure search matcher across name, alt_names, country, country_name, and region.
 */
export function channelMatchesSearch(channel: CatalogChannel, query: string): boolean {
  if (!query) return true;
  const normQuery = normalizeText(query);
  if (!normQuery) return true;

  if (normalizeText(channel.name).includes(normQuery)) return true;

  if (Array.isArray(channel.alt_names)) {
    for (const alt of channel.alt_names) {
      if (normalizeText(alt).includes(normQuery)) return true;
    }
  }

  if (normalizeText(channel.country).includes(normQuery)) return true;
  if (channel.country_name && normalizeText(channel.country_name).includes(normQuery)) return true;
  if (channel.region && normalizeText(channel.region).includes(normQuery)) return true;
  if (channel.primary_category && normalizeText(channel.primary_category).includes(normQuery)) return true;
  if (channel.subcategory && normalizeText(channel.subcategory).includes(normQuery)) return true;

  return false;
}

/**
 * Compares stream quality against a minimum requested threshold.
 */
export function matchesMinQuality(channelBestQuality: string | null | undefined, minQuality: string): boolean {
  if (minQuality === 'ALL') return true;
  if (!channelBestQuality) return false;

  const targetRank = getQualityRank(minQuality);
  const channelRank = getQualityRank(channelBestQuality);

  // Lower rank value means higher quality (e.g. 4K=1, 1080p=2, 720p=3)
  return channelRank <= targetRank;
}

/**
 * Pure filtering function for CatalogChannel arrays.
 */
export function filterCatalogChannels(
  channels: CatalogChannel[],
  filter: ChannelFilterState,
  favoriteIds?: Set<string>
): CatalogChannel[] {
  return channels.filter((channel) => {
    // 1. Favorites filter
    if (filter.onlyFavorites && favoriteIds && !favoriteIds.has(channel.id)) {
      return false;
    }

    // 2. Country filter
    if (filter.country !== 'ALL' && channel.country.toUpperCase() !== filter.country.toUpperCase()) {
      return false;
    }

    // 3. Region filter
    if (filter.region !== 'ALL' && channel.region !== filter.region) {
      return false;
    }

    // 4. Category filter
    if (filter.category !== 'ALL') {
      const matchPrimary = channel.primary_category === filter.category;
      const matchSecondary = channel.secondary_categories?.includes(filter.category);
      const matchRaw = channel.categories?.includes(filter.category);
      if (!matchPrimary && !matchSecondary && !matchRaw) {
        return false;
      }
    }

    // 5. Minimum Quality filter
    if (filter.minQuality !== 'ALL' && !matchesMinQuality(channel.best_quality, filter.minQuality)) {
      return false;
    }

    // 6. Search query filter
    if (filter.search && !channelMatchesSearch(channel, filter.search)) {
      return false;
    }

    return true;
  });
}

/**
 * React hook exposing filterState, setFilter, resetFilters, and memoized filtered channels.
 */
export function useChannelFilters(
  channels: CatalogChannel[],
  favoriteIds?: Set<string>,
  initialFilter?: Partial<ChannelFilterState>
) {
  const [filterState, setFilterState] = useState<ChannelFilterState>({
    ...DEFAULT_FILTER_STATE,
    ...initialFilter,
  });

  const setFilter = useCallback(
    (updater: Partial<ChannelFilterState> | ((prev: ChannelFilterState) => ChannelFilterState)) => {
      setFilterState((prev) => {
        if (typeof updater === 'function') {
          return updater(prev);
        }
        return { ...prev, ...updater };
      });
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilterState(DEFAULT_FILTER_STATE);
  }, []);

  const filtered = useMemo(() => {
    return filterCatalogChannels(channels, filterState, favoriteIds);
  }, [channels, filterState, favoriteIds]);

  return {
    filterState,
    setFilter,
    resetFilters,
    filtered,
  };
}
