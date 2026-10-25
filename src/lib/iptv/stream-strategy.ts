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
 * Prioritizes HTTPS over HTTP on HTTPS environments to maximize direct playback.
 */
export function orderStreamsByHealth(streams: CatalogStream[]): CatalogStream[] {
  const copy = [...streams];
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  return copy.sort((a, b) => {
    // Primary: Protocol preference if on HTTPS (HTTPS direct streams first)
    if (isHttps) {
      const aIsHttp = (a.url || '').toLowerCase().startsWith('http://');
      const bIsHttp = (b.url || '').toLowerCase().startsWith('http://');
      if (aIsHttp !== bIsHttp) return aIsHttp ? 1 : -1;
    }

    // Secondary: Health status rank
    const rankA = getHealthRank(a.status);
    const rankB = getHealthRank(b.status);
    return rankA - rankB;
  });
}

/**
 * Checks if a stream URL is HTTP while running in HTTPS.
 */
export function isMixedContent(url?: string | null): boolean {
  if (!url) return false;
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'https:' && url.toLowerCase().startsWith('http://');
}

/**
 * Prepares streams up to MAX_STREAMS_PER_CHANNEL.
 * Keeps HTTP streams accessible through the secure proxy relay.
 */
export function filterAndPrepareStreams(streams: CatalogStream[]): {
  usable: CatalogStream[];
  discardedMixedContentCount: number;
} {
  const ordered = orderStreamsByHealth(streams);
  const usable: CatalogStream[] = [];

  for (const s of ordered) {
    if (!s || !s.url) continue;
    usable.push(s);
    if (usable.length >= MAX_STREAMS_PER_CHANNEL) break;
  }

  return { usable, discardedMixedContentCount: 0 };
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
