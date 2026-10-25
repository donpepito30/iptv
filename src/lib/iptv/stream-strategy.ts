/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CatalogStream } from './types.ts';

export const MAX_STREAMS_PER_CHANNEL = 5;

export type StreamEngineMethod = 'hls' | 'dash' | 'native';

/**
 * Health ranking: live (1) -> degraded (2) -> unknown (3) -> geo (4) -> dead (5).
 */
export function getHealthRank(status?: string | null): number {
  if (!status) return 3;
  const s = status.toLowerCase().trim();
  if (s === 'live' || s === 'online' || s === 'working') return 1;
  if (s === 'degraded' || s === 'slow') return 2;
  if (s === 'unknown') return 3;
  if (s === 'geo' || s === 'restricted') return 4;
  if (s === 'dead' || s === 'blocked' || s === 'error' || s === 'timeout') return 5;
  return 3;
}

/**
 * Pure function to order streams by health: live -> degraded -> unknown -> geo -> dead.
 */
export function orderStreamsByHealth(streams: CatalogStream[]): CatalogStream[] {
  const copy = [...streams];
  return copy.sort((a, b) => {
    const rankA = getHealthRank(a.status);
    const rankB = getHealthRank(b.status);
    return rankA - rankB;
  });
}

/**
 * Checks if a stream URL would trigger browser Mixed Content blocking on HTTPS.
 */
export function isMixedContent(url?: string | null): boolean {
  if (!url) return false;
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'https:' && url.toLowerCase().startsWith('http://');
}

/**
 * Filters out mixed content HTTP streams on HTTPS and caps at MAX_STREAMS_PER_CHANNEL.
 */
export function filterAndPrepareStreams(streams: CatalogStream[]): {
  usable: CatalogStream[];
  discardedMixedContentCount: number;
} {
  const ordered = orderStreamsByHealth(streams);

  const usable: CatalogStream[] = [];
  let discardedMixedContentCount = 0;

  for (const s of ordered) {
    if (isMixedContent(s.url)) {
      discardedMixedContentCount += 1;
      continue;
    }
    usable.push(s);
    if (usable.length >= MAX_STREAMS_PER_CHANNEL) break;
  }

  return { usable, discardedMixedContentCount };
}

/**
 * Retrieves the successfully remembered playback engine method for a stream URL.
 */
export function getSavedStreamMethod(url: string): StreamEngineMethod | null {
  if (typeof window === 'undefined' || !url) return null;
  try {
    const raw = window.localStorage.getItem(`iptv:stream-method:${url}`);
    if (raw === 'hls' || raw === 'dash' || raw === 'native') {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persists the working playback engine method for a stream URL in localStorage.
 */
export function saveStreamMethod(url: string, method: StreamEngineMethod): void {
  if (typeof window === 'undefined' || !url) return;
  try {
    window.localStorage.setItem(`iptv:stream-method:${url}`, method);
  } catch {
    // Ignore storage write quota errors
  }
}
