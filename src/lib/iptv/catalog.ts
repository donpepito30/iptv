/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { resolveChannelCategories } from './categories.ts';
import { getFallbackCountryFlag } from './filter.ts';
import { loadCatalogFromIndexedDb, saveCatalogToIndexedDb } from './indexed-db.ts';
import {
  Category,
  CatalogChannel,
  CatalogResult,
  CatalogStream,
  Country,
  RawChannel,
  RawLogo,
  RawStream,
  Region,
} from './types.ts';

const BASE_API = 'https://iptv-org.github.io/api';

/**
 * Returns numerical quality rank for ordering streams:
 * 4k (1), 1080p (2), 720p (3), 576p (4), 480p (5), 360p (6), others, without quality at end (999).
 */
export function getQualityRank(quality?: string | null): number {
  if (!quality) return 999;
  const q = quality.toLowerCase().trim();
  if (q.includes('4k') || q.includes('2160')) return 1;
  if (q.includes('1080')) return 2;
  if (q.includes('720')) return 3;
  if (q.includes('576')) return 4;
  if (q.includes('480')) return 5;
  if (q.includes('360')) return 6;
  if (q.includes('240')) return 7;
  return 500;
}

/**
 * In-memory module cache for the assembled catalog.
 */
let catalogModuleCache: CatalogResult | null = null;

export function getCachedCatalog(): CatalogResult | null {
  return catalogModuleCache;
}

export function setCachedCatalog(result: CatalogResult | null): void {
  catalogModuleCache = result;
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al descargar ${url}`);
  }
  return (await res.json()) as T;
}

/**
 * Downloads datasets from iptv-org (including 35,000+ logos),
 * caches in IndexedDB with 24h TTL, and resolves categories & quality.
 */
export async function buildCatalog(options?: {
  onProgress?: (msg: string) => void;
  signal?: AbortSignal;
  forceRefresh?: boolean;
}): Promise<CatalogResult> {
  if (!options?.forceRefresh) {
    if (catalogModuleCache) return catalogModuleCache;
    const dbCached = await loadCatalogFromIndexedDb();
    if (dbCached && dbCached.channels.length > 0) {
      catalogModuleCache = dbCached;
      return dbCached;
    }
  }

  options?.onProgress?.('Descargando catálogo y logos de iptv-org...');

  // Download all 7 JSON datasets in parallel
  const [channelsRaw, streamsRaw, countriesRaw, categoriesRaw, regionsRaw, blocklistRaw, logosRaw] =
    await Promise.all([
      fetchJson<RawChannel[]>(`${BASE_API}/channels.json`, options?.signal),
      fetchJson<RawStream[]>(`${BASE_API}/streams.json`, options?.signal),
      fetchJson<Country[]>(`${BASE_API}/countries.json`, options?.signal),
      fetchJson<Category[]>(`${BASE_API}/categories.json`, options?.signal),
      fetchJson<Region[]>(`${BASE_API}/regions.json`, options?.signal),
      fetchJson<unknown[]>(`${BASE_API}/blocklist.json`, options?.signal),
      fetchJson<RawLogo[]>(`${BASE_API}/logos.json`, options?.signal).catch(() => []),
    ]);

  options?.onProgress?.('Indexando metadatos y logos oficiales...');

  // Build logo map (channelId -> logoUrl, preferring SVG)
  const logoMap = new Map<string, string>();
  if (Array.isArray(logosRaw)) {
    for (const l of logosRaw) {
      if (l && l.channel && l.url) {
        if (!logoMap.has(l.channel) || l.format === 'SVG') {
          logoMap.set(l.channel, l.url);
        }
      }
    }
  }

  // Build blocklist lookup set
  const blocklistSet = new Set<string>();
  if (Array.isArray(blocklistRaw)) {
    for (const item of blocklistRaw) {
      if (typeof item === 'string') {
        blocklistSet.add(item);
      } else if (item && typeof item === 'object') {
        const obj = item as { channel?: string; stream?: string };
        if (obj.channel) blocklistSet.add(obj.channel);
        if (obj.stream) blocklistSet.add(obj.stream);
      }
    }
  }

  // Build country and region lookup maps
  const countryMap = new Map<string, Country>();
  if (Array.isArray(countriesRaw)) {
    for (const country of countriesRaw) {
      if (country.code) countryMap.set(country.code.toUpperCase(), country);
    }
  }

  const countryToRegionMap = new Map<string, string>();
  if (Array.isArray(regionsRaw)) {
    for (const region of regionsRaw) {
      if (Array.isArray(region.countries)) {
        for (const countryCode of region.countries) {
          countryToRegionMap.set(countryCode.toUpperCase(), region.name);
        }
      }
    }
  }

  // Map streams by channel and sort by quality
  const streamsByChannel = new Map<string, CatalogStream[]>();
  const rawStreamsMap = new Map<string, RawStream[]>();
  let totalStreamsCount = 0;

  if (Array.isArray(streamsRaw)) {
    for (const raw of streamsRaw) {
      if (!raw || !raw.channel || !raw.url) continue;
      if (blocklistSet.has(raw.url)) continue;
      if (raw.status === 'error' || raw.status === 'timeout' || raw.status === 'blocked') continue;

      const rawList = rawStreamsMap.get(raw.channel) || [];
      rawList.push(raw);
      rawStreamsMap.set(raw.channel, rawList);

      const quality = raw.quality || (raw.height ? (raw.height >= 2160 ? '4K' : `${raw.height}p`) : null);
      const catalogStream: CatalogStream = {
        url: raw.url,
        quality,
        title: raw.title || null,
        referrer: raw.referrer || raw.http_referrer || null,
        user_agent: raw.user_agent || null,
      };

      const list = streamsByChannel.get(raw.channel) || [];
      list.push(catalogStream);
      streamsByChannel.set(raw.channel, list);
    }
  }

  for (const streams of streamsByChannel.values()) {
    streams.sort((a, b) => getQualityRank(a.quality) - getQualityRank(b.quality));
    totalStreamsCount += streams.length;
  }

  options?.onProgress?.('Construyendo catálogo final de canales...');

  const catalogChannels: CatalogChannel[] = [];
  if (Array.isArray(channelsRaw)) {
    for (const ch of channelsRaw) {
      if (!ch || !ch.id) continue;
      if (ch.is_nsfw === true) continue;
      if (ch.closed !== null && ch.closed !== undefined && ch.closed !== '') continue;
      if (ch.replaced_by !== null && ch.replaced_by !== undefined && ch.replaced_by !== '') continue;
      if (blocklistSet.has(ch.id)) continue;

      const streams = streamsByChannel.get(ch.id);
      if (!streams || streams.length === 0) continue;

      const upperCountry = (ch.country || '').toUpperCase();
      const countryObj = countryMap.get(upperCountry);
      const country_name = countryObj?.name || ch.country || 'Desconocido';
      const country_flag = countryObj?.flag || getFallbackCountryFlag(upperCountry);
      const region = countryToRegionMap.get(upperCountry) || null;

      const categories = Array.isArray(ch.categories) ? ch.categories : [];
      const best_quality = streams[0]?.quality || null;
      const channelRawStreams = rawStreamsMap.get(ch.id) || [];
      const { primary_category, secondary_categories, subcategory } = resolveChannelCategories(ch, channelRawStreams);

      // Attach official logo from logos.json or fallback
      const resolvedLogo = ch.logo || logoMap.get(ch.id) || null;

      catalogChannels.push({
        id: ch.id,
        name: ch.name || ch.id,
        alt_names: Array.isArray(ch.alt_names) ? ch.alt_names : [],
        network: ch.network || null,
        country: ch.country,
        country_name,
        country_flag,
        countryName: country_name,
        countryFlag: country_flag,
        region,
        categories,
        streams,
        best_quality,
        primary_category,
        secondary_categories,
        subcategory,
        logo: resolvedLogo,
        website: ch.website || null,
        primaryStreamUrl: streams[0]?.url,
        qualityLabel: best_quality || 'HD',
      });
    }
  }

  const result: CatalogResult = {
    channels: catalogChannels,
    countries: countriesRaw || [],
    categories: categoriesRaw || [],
    regions: regionsRaw || [],
    total_channels: catalogChannels.length,
    total_streams: totalStreamsCount,
  };

  catalogModuleCache = result;
  saveCatalogToIndexedDb(result).catch(() => {});
  return result;
}
