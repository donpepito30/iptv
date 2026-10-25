/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { CatalogChannel } from './types.ts';
import { useHistory } from './useHistory.ts';

export interface AffinityStats {
  topCategories: string[];
  topCountries: string[];
}

/**
 * Computes top categories and countries from watch history and returns up to 12 affine channels for 'Para ti'.
 */
export function calculateRecommendations(
  channels: CatalogChannel[],
  historyIds: string[],
  maxResults = 12
): { recommended: CatalogChannel[]; stats: AffinityStats } {
  if (channels.length === 0) {
    return { recommended: [], stats: { topCategories: [], topCountries: [] } };
  }

  const channelMap = new Map<string, CatalogChannel>();
  for (const ch of channels) {
    channelMap.set(ch.id, ch);
  }

  const categoryCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();

  // Count frequencies from watch history
  for (const id of historyIds) {
    const ch = channelMap.get(id);
    if (!ch) continue;

    if (ch.primary_category) {
      categoryCounts.set(ch.primary_category, (categoryCounts.get(ch.primary_category) || 0) + 1);
    }
    if (ch.country) {
      countryCounts.set(ch.country, (countryCounts.get(ch.country) || 0) + 1);
    }
  }

  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  const topCountries = Array.from(countryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  const historySet = new Set(historyIds);

  // If user has no history yet, recommend 12 diverse high-quality channels with logos
  if (topCategories.length === 0 && topCountries.length === 0) {
    const curated = channels
      .filter((c) => c.logo && c.streams && c.streams.length > 0)
      .slice(0, maxResults);
    return {
      recommended: curated.length > 0 ? curated : channels.slice(0, maxResults),
      stats: { topCategories: [], topCountries: [] },
    };
  }

  const topCat1 = topCategories[0];
  const topCat2 = topCategories[1];
  const topCountry1 = topCountries[0];
  const topCountry2 = topCountries[1];

  // Score channels by affinity to the user's top categories and countries
  const scored: { channel: CatalogChannel; score: number }[] = [];

  for (const ch of channels) {
    // Skip if already in recent history so 'Para ti' discovers new affine channels
    if (historySet.has(ch.id)) continue;

    let score = 0;
    if (ch.primary_category && ch.primary_category === topCat1) score += 12;
    else if (ch.primary_category && ch.primary_category === topCat2) score += 6;

    if (ch.country && ch.country === topCountry1) score += 10;
    else if (ch.country && ch.country === topCountry2) score += 5;

    if (ch.best_quality === '1080p' || ch.best_quality === '4k') score += 3;
    if (ch.logo) score += 2;

    if (score > 0) {
      scored.push({ channel: ch, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  let recommended = scored.slice(0, maxResults).map((s) => s.channel);

  // Fill up to maxResults if affine list is small
  if (recommended.length < maxResults) {
    for (const ch of channels) {
      if (recommended.length >= maxResults) break;
      if (!historySet.has(ch.id) && !recommended.some((r) => r.id === ch.id)) {
        recommended.push(ch);
      }
    }
  }

  return {
    recommended: recommended.slice(0, maxResults),
    stats: { topCategories, topCountries },
  };
}

/**
 * Reactive hook returning 12 affine channels for 'Para ti' row.
 */
export function useRecommendations(channels: CatalogChannel[]) {
  const { history } = useHistory();

  return useMemo(() => {
    return calculateRecommendations(channels, history, 12);
  }, [channels, history]);
}
