/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CURATED_CHANNELS } from './curated.ts';
import { getFallbackCountryFlag, getStreamQualityLabel } from './filter.ts';
import { getCachedCatalogFromDB, saveCatalogToDB } from './indexed-catalog.ts';
import {
  BlocklistItem,
  Category,
  Channel,
  ChannelWithStream,
  Country,
  Stream,
} from './types.ts';

const BASE_API = 'https://iptv-org.github.io/api';
const TIMEOUT_MS = 12000;

let inMemoryChannelsCache: ChannelWithStream[] | null = null;
let inMemoryCountriesCache: Country[] | null = null;
let inMemoryCategoriesCache: Category[] | null = null;

async function fetchWithTimeout<T>(url: string, timeoutMs = TIMEOUT_MS): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status} on ${url}`);
    }
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`[iptv-api] Error fetching ${url}:`, error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Loads countries metadata from iptv-org API
 */
export async function fetchCountries(): Promise<Country[]> {
  if (inMemoryCountriesCache) return inMemoryCountriesCache;
  const data = await fetchWithTimeout<Country[]>(`${BASE_API}/countries.json`);
  if (data && Array.isArray(data)) {
    inMemoryCountriesCache = data;
    return data;
  }
  return [];
}

/**
 * Loads categories metadata from iptv-org API
 */
export async function fetchCategories(): Promise<Category[]> {
  if (inMemoryCategoriesCache) return inMemoryCategoriesCache;
  const data = await fetchWithTimeout<Category[]>(`${BASE_API}/categories.json`);
  if (data && Array.isArray(data)) {
    inMemoryCategoriesCache = data;
    return data;
  }
  return [];
}

/**
 * Loads blocklist from iptv-org API
 */
export async function fetchBlocklist(): Promise<Set<string>> {
  const data = await fetchWithTimeout<BlocklistItem[]>(`${BASE_API}/blocklist.json`);
  const blocked = new Set<string>();
  if (data && Array.isArray(data)) {
    for (const item of data) {
      if (item.channel) blocked.add(item.channel);
    }
  }
  return blocked;
}

/**
 * Fetches and merges full iptv-org catalog: channels + streams + countries
 */
export async function fetchFullCatalog(
  onProgress?: (msg: string) => void
): Promise<{ channels: ChannelWithStream[]; isFallback: boolean }> {
  if (inMemoryChannelsCache) {
    return { channels: inMemoryChannelsCache, isFallback: false };
  }

  // 1. Check local IndexedDB cache for instant boot
  const dbCached = await getCachedCatalogFromDB();
  if (dbCached && dbCached.length > 0) {
    inMemoryChannelsCache = dbCached;
    return { channels: dbCached, isFallback: false };
  }

  try {
    onProgress?.('Cargando países y filtros...');
    const [countries, blocklist] = await Promise.all([
      fetchCountries(),
      fetchBlocklist(),
    ]);

    const countryMap = new Map<string, Country>();
    for (const c of countries) {
      countryMap.set(c.code, c);
    }

    onProgress?.('Cargando transmisiones activas...');
    const streamsData = await fetchWithTimeout<Stream[]>(`${BASE_API}/streams.json`);

    onProgress?.('Cargando lista de canales...');
    const channelsData = await fetchWithTimeout<Channel[]>(`${BASE_API}/channels.json`);

    if (!streamsData || !channelsData) {
      console.warn('[iptv-api] Remote data incomplete, using verified curated catalog');
      return { channels: CURATED_CHANNELS, isFallback: true };
    }

    // Map streams by channel ID (grouping multiple qualities/streams)
    const streamsByChannel = new Map<string, Stream[]>();
    for (const stream of streamsData) {
      if (!stream.channel || !stream.url) continue;
      // Skip dead or flagged streams
      if (stream.status === 'error' || stream.status === 'timeout' || stream.status === 'blocked') {
        continue;
      }
      const list = streamsByChannel.get(stream.channel) || [];
      list.push(stream);
      streamsByChannel.set(stream.channel, list);
    }

    // Merge channels that have at least one stream and are not blocked
    const merged: ChannelWithStream[] = [];
    const seenIds = new Set<string>();

    // Put curated channels first to ensure top reliability
    for (const curated of CURATED_CHANNELS) {
      merged.push(curated);
      seenIds.add(curated.id);
    }

    for (const channel of channelsData) {
      if (!channel.id || seenIds.has(channel.id)) continue;
      if (channel.is_nsfw) continue; // Default safe family friendly
      if (blocklist.has(channel.id)) continue;

      const streams = streamsByChannel.get(channel.id);
      if (!streams || streams.length === 0) continue;

      const country = countryMap.get(channel.country);
      const primary = streams[0];

      merged.push({
        id: channel.id,
        name: channel.name,
        network: channel.network,
        country: channel.country,
        countryName: country?.name || channel.country,
        countryFlag: country?.flag || getFallbackCountryFlag(channel.country),
        categories: Array.isArray(channel.categories) ? channel.categories : [],
        languages: Array.isArray(channel.languages) ? channel.languages : [],
        logo: channel.logo || null,
        website: channel.website || null,
        streams,
        primaryStreamUrl: primary.url,
        qualityLabel: getStreamQualityLabel(primary),
      });

      seenIds.add(channel.id);
    }

    inMemoryChannelsCache = merged;
    saveCatalogToDB(merged).catch(() => {});
    return { channels: merged, isFallback: false };
  } catch (error) {
    console.error('[iptv-api] Error assembling catalog:', error);
    return { channels: CURATED_CHANNELS, isFallback: true };
  }
}
