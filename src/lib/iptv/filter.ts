/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelWithStream, FilterCriteria, Stream } from './types.ts';

/**
 * Derives a clean quality string like '1080p', '720p', 'HD' from stream metadata.
 */
export function getStreamQualityLabel(stream?: Stream | null): string {
  if (!stream) return 'SD';
  if (stream.quality) return stream.quality;
  if (stream.height) {
    if (stream.height >= 2160) return '4K';
    if (stream.height >= 1080) return '1080p';
    if (stream.height >= 720) return '720p';
    if (stream.height >= 480) return '480p';
    return `${stream.height}p`;
  }
  return 'HD';
}

/**
 * Pure search across channel name, network, country, and categories.
 */
export function matchesQuery(channel: ChannelWithStream, query: string): boolean {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  
  if (channel.name.toLowerCase().includes(q)) return true;
  if (channel.network && channel.network.toLowerCase().includes(q)) return true;
  if (channel.country.toLowerCase().includes(q)) return true;
  if (channel.countryName && channel.countryName.toLowerCase().includes(q)) return true;
  
  return channel.categories.some((cat) => cat.toLowerCase().includes(q));
}

/**
 * Pure filtering function without any React dependency.
 */
export function filterChannels(
  channels: ChannelWithStream[],
  criteria: FilterCriteria,
  favoriteIds: Set<string>
): ChannelWithStream[] {
  return channels.filter((ch) => {
    // Favorites only
    if (criteria.onlyFavorites && !favoriteIds.has(ch.id)) {
      return false;
    }

    // Logo filter
    if (criteria.onlyWithLogo && !ch.logo) {
      return false;
    }

    // Country filter
    if (criteria.country !== 'ALL' && ch.country !== criteria.country) {
      return false;
    }

    // Category filter
    if (criteria.category !== 'ALL' && !ch.categories.includes(criteria.category)) {
      return false;
    }

    // Language filter
    if (criteria.language !== 'ALL' && (!ch.languages || !ch.languages.includes(criteria.language))) {
      return false;
    }

    // Search query
    if (criteria.search && !matchesQuery(ch, criteria.search)) {
      return false;
    }

    return true;
  });
}

/**
 * Extracts unique countries with channel counts from a list of channels.
 */
export function extractUniqueCountries(
  channels: ChannelWithStream[]
): { code: string; name: string; flag?: string; count: number }[] {
  const map = new Map<string, { code: string; name: string; flag?: string; count: number }>();

  for (const ch of channels) {
    if (!ch.country) continue;
    const existing = map.get(ch.country);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(ch.country, {
        code: ch.country,
        name: ch.countryName || ch.country,
        flag: ch.countryFlag || getFallbackCountryFlag(ch.country),
        count: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Extracts unique categories with channel counts from a list of channels.
 */
export function extractUniqueCategories(
  channels: ChannelWithStream[]
): { id: string; name: string; count: number }[] {
  const map = new Map<string, number>();

  for (const ch of channels) {
    for (const cat of ch.categories) {
      const cleanCat = cat.trim().toLowerCase();
      if (!cleanCat) continue;
      map.set(cleanCat, (map.get(cleanCat) || 0) + 1);
    }
  }

  return Array.from(map.entries())
    .map(([id, count]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Returns emoji flag from 2-letter ISO code.
 */
export function getFallbackCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌐';
  }
}
