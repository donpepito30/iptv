/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CatalogChannel } from './types.ts';

/**
 * Normalizes text: lowercase, trims, and strips diacritics / accents.
 */
export function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Checks if target contains query characters in order (fuzzy subsequence matching).
 */
export function isFuzzySubsequence(target: string, query: string): boolean {
  if (!query || !target) return false;
  if (query.length > target.length) return false;

  let queryIdx = 0;
  for (let i = 0; i < target.length; i++) {
    if (target[i] === query[queryIdx]) {
      queryIdx++;
      if (queryIdx === query.length) return true;
    }
  }
  return false;
}

/**
 * Evaluates a single target string against a normalized query according to the spec:
 * - Starts with query: +1000
 * - Contains query: +500
 * - Fuzzy match (subsequence): +50
 * - No match: 0
 */
export function scoreFieldMatch(target: string, query: string): number {
  if (!target || !query) return 0;
  const normTarget = normalizeSearchText(target);
  if (!normTarget) return 0;

  if (normTarget.startsWith(query)) {
    return 1000;
  }
  if (normTarget.includes(query)) {
    return 500;
  }
  if (isFuzzySubsequence(normTarget, query)) {
    return 50;
  }
  return 0;
}

/**
 * Computes search score for a channel across name, country, network, and alt_names.
 */
export function scoreChannelSearch(channel: CatalogChannel, query: string): number {
  const normQuery = normalizeSearchText(query);
  if (!normQuery) return 0;

  let maxScore = 0;

  // 1. Channel Name (highest relevance)
  const nameScore = scoreFieldMatch(channel.name, normQuery);
  if (nameScore > maxScore) maxScore = nameScore + 5; // slight priority for name match

  // 2. Country name and code
  if (channel.country_name) {
    const countryScore = scoreFieldMatch(channel.country_name, normQuery);
    if (countryScore > maxScore) maxScore = countryScore;
  }
  if (channel.country) {
    const codeScore = scoreFieldMatch(channel.country, normQuery);
    if (codeScore > maxScore) maxScore = codeScore;
  }

  // 3. Network / Broadcast group
  if (channel.network) {
    const netScore = scoreFieldMatch(channel.network, normQuery);
    if (netScore > maxScore) maxScore = netScore;
  }

  // 4. Alt names
  if (channel.alt_names && Array.isArray(channel.alt_names)) {
    for (const alt of channel.alt_names) {
      const altScore = scoreFieldMatch(alt, normQuery);
      if (altScore > maxScore) {
        maxScore = altScore;
        break;
      }
    }
  }

  return maxScore;
}

/**
 * Performs fuzzy search on catalog channels:
 * - Scores channels using prefix (+1000), contains (+500), fuzzy (+50)
 * - Returns at most 30 top matching channels
 */
export function fuzzySearchChannels(
  channels: CatalogChannel[],
  query: string,
  maxResults = 30
): CatalogChannel[] {
  const normQuery = normalizeSearchText(query);
  if (!normQuery) {
    return channels.slice(0, maxResults);
  }

  const scored: { channel: CatalogChannel; score: number }[] = [];

  for (const channel of channels) {
    const score = scoreChannelSearch(channel, normQuery);
    if (score > 0) {
      scored.push({ channel, score });
    }
  }

  // Sort descending by score, then alphabetically by channel name
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.channel.name.localeCompare(b.channel.name);
  });

  return scored.slice(0, maxResults).map((s) => s.channel);
}
