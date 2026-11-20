/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStreamHealthSync } from './health-checker.ts';
import { isStreamPenalized } from './stream-failures.ts';
import { CatalogStream } from './types.ts';

export const MAX_STREAMS_PER_CHANNEL = 5;

export type StreamEngineMethod = 'hls' | 'dash' | 'native' | 'direct';

/**
 * Health ranking: live (1) -> unstable (2) -> unknown (3) -> geo (5) -> offline/dead (8) -> penalized (10).
 */
export function getHealthRank(status?: string | null, url?: string): number {
  if (url && isStreamPenalized(url)) {
    return 10;
  }

  if (url) {
    const probeStatus = getStreamHealthSync(url);
    if (probeStatus === 'live') return 1;
    if (probeStatus === 'unstable') return 2;
    if (probeStatus === 'offline') return 8;
  }

  if (!status) return 3;
  const s = status.toLowerCase().trim();
  if (s === 'live' || s === 'online' || s === 'working') return 1;
  if (s === 'degraded' || s === 'slow') return 2;
  if (s === 'unknown') return 3;
  if (s === 'geo' || s === 'restricted') return 5;
  if (s === 'dead' || s === 'blocked' || s === 'error' || s === 'timeout') return 8;
  return 3;
}

/**
 * Pure function to order streams by health: live -> unstable/degraded -> unknown -> offline/dead -> penalized.
 * Prioritizes HTTPS over HTTP on HTTPS environments to maximize direct playback.
 */
export function orderStreamsByHealth(streams: CatalogStream[]): CatalogStream[] {
  const copy = [...streams];
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  return copy.sort((a, b) => {
    // 1. Penalized streams go last
    const aPenalized = a.url ? isStreamPenalized(a.url) : false;
    const bPenalized = b.url ? isStreamPenalized(b.url) : false;
    if (aPenalized !== bPenalized) return aPenalized ? 1 : -1;

    // 2. Health status rank
    const rankA = getHealthRank(a.status, a.url);
    const rankB = getHealthRank(b.status, b.url);
    if (rankA !== rankB) return rankA - rankB;

    // 3. Protocol preference on HTTPS
    if (isHttps) {
      const aIsHttp = (a.url || '').toLowerCase().startsWith('http://');
      const bIsHttp = (b.url || '').toLowerCase().startsWith('http://');
      if (aIsHttp !== bIsHttp) return aIsHttp ? 1 : -1;
    }

    return 0;
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
