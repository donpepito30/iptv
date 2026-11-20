/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getProxiedStreamUrl, requiresProxyFallback } from './stream-proxy.ts';
import { isMixedContent } from './stream-strategy.ts';
import { CatalogStream } from './types.ts';

export interface ParallelProbeResult {
  selectedIndex: number;
  forceProxy: boolean;
}

const PROBE_TIMEOUT_MS = 3000;

/**
 * Checks whether text contains an HLS manifest header (#EXTM3U)
 */
export function isValidHlsManifest(content: string): boolean {
  if (!content) return false;
  const head = content.slice(0, 500).trim();
  return head.startsWith('#EXTM3U') || content.includes('#EXT-X-VERSION') || content.includes('#EXT-X-STREAM-INF');
}

/**
 * Probes an individual stream manifest within a 3s deadline.
 */
async function probeSingleStream(
  stream: CatalogStream,
  index: number,
  signal: AbortSignal
): Promise<ParallelProbeResult> {
  const hasCustomHeaders = Boolean(stream.referrer || stream.user_agent);
  const mustProxy = isMixedContent(stream.url) || requiresProxyFallback(stream.url) || hasCustomHeaders;

  const targetUrl = mustProxy
    ? getProxiedStreamUrl(stream.url, stream.referrer, stream.user_agent)
    : stream.url;

  const res = await fetch(targetUrl, {
    method: 'GET',
    headers: { Range: 'bytes=0-1024', Accept: '*/*' },
    signal,
    mode: mustProxy ? 'cors' : 'cors',
  });

  if (!res.ok && res.status !== 206) {
    throw new Error(`Probe failed with status ${res.status}`);
  }

  const text = await res.text();
  if (!isValidHlsManifest(text)) {
    throw new Error('Not a valid HLS playlist (#EXTM3U missing)');
  }

  return { selectedIndex: index, forceProxy: mustProxy };
}

/**
 * Probes the top 2 candidate streams simultaneously with a 3s timeout.
 * Starts the first stream that responds with a valid #EXTM3U manifest.
 */
export async function probeTopStreamsParallel(
  streams: CatalogStream[],
  preferredIndex = 0
): Promise<ParallelProbeResult> {
  if (!streams || streams.length === 0) {
    return { selectedIndex: 0, forceProxy: false };
  }
  if (streams.length === 1) {
    const s = streams[0];
    const forceProxy = isMixedContent(s.url) || requiresProxyFallback(s.url) || Boolean(s.referrer || s.user_agent);
    return { selectedIndex: 0, forceProxy };
  }

  // Determine top 2 indices to probe in parallel
  const firstIdx = preferredIndex < streams.length ? preferredIndex : 0;
  const secondIdx = firstIdx === 0 ? 1 : 0;
  const candidateIndices = [firstIdx, secondIdx];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const probePromises = candidateIndices.map((idx) =>
      probeSingleStream(streams[idx], idx, controller.signal)
    );

    // Wait for the FIRST stream that successfully returns valid #EXTM3U
    const winner = await Promise.any(probePromises);
    clearTimeout(timer);
    controller.abort(); // Cancel loser request
    return winner;
  } catch {
    // Both failed or timed out: fall back safely to preferred stream
    clearTimeout(timer);
    const fallbackStream = streams[firstIdx];
    const forceProxy =
      isMixedContent(fallbackStream.url) ||
      requiresProxyFallback(fallbackStream.url) ||
      Boolean(fallbackStream.referrer || fallbackStream.user_agent);
    return { selectedIndex: firstIdx, forceProxy };
  }
}
