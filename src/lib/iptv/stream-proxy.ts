/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const STORAGE_PREFIX = 'iptv:stream-proxy:';

/**
 * Encodes a remote media URL into the local stream-proxy endpoint,
 * optionally forwarding custom Referer and User-Agent headers.
 */
export function getProxiedStreamUrl(
  originalUrl: string,
  referrer?: string | null,
  userAgent?: string | null
): string {
  if (!originalUrl) return '';
  if (originalUrl.startsWith('/api/stream-proxy')) {
    return originalUrl;
  }
  let proxyPath = `/api/stream-proxy?url=${encodeURIComponent(originalUrl)}`;
  if (referrer) {
    proxyPath += `&ref=${encodeURIComponent(referrer)}`;
  }
  if (userAgent) {
    proxyPath += `&ua=${encodeURIComponent(userAgent)}`;
  }
  return proxyPath;
}

/**
 * Checks whether a URL is already wrapped by the stream proxy.
 */
export function isProxiedStreamUrl(url: string): boolean {
  return url.startsWith('/api/stream-proxy');
}

/**
 * Checks if the stream requires the proxy due to mixed content or stored preference.
 */
export function requiresProxyFallback(originalUrl: string): boolean {
  if (!originalUrl) return false;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && originalUrl.startsWith('http://')) {
    return true;
  }
  try {
    return window.localStorage?.getItem(`${STORAGE_PREFIX}${originalUrl}`) === '1';
  } catch {
    return false;
  }
}

/**
 * Persists whether a stream URL needs the proxy relay to work.
 */
export function saveStreamRequiresProxy(originalUrl: string, requires: boolean): void {
  if (typeof window === 'undefined' || !originalUrl) return;
  try {
    if (requires) {
      window.localStorage?.setItem(`${STORAGE_PREFIX}${originalUrl}`, '1');
    } else {
      window.localStorage?.removeItem(`${STORAGE_PREFIX}${originalUrl}`);
    }
  } catch {
    // Ignore storage quota
  }
}

export interface StreamProbeResult {
  ok: boolean;
  needsProxy: boolean;
  latencyMs: number;
}

/**
 * Performs a fast, non-blocking probe (Range: bytes=0-100 or HEAD)
 * to test if a stream can be fetched directly or via proxy.
 */
export async function probeStreamQuick(
  url: string,
  referrerOrTimeout?: string | number | null,
  maybeTimeout = 2500
): Promise<StreamProbeResult> {
  const referrer = typeof referrerOrTimeout === 'string' ? referrerOrTimeout : null;
  const timeoutMs = typeof referrerOrTimeout === 'number' ? referrerOrTimeout : maybeTimeout;
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // 1. Try direct probe if not mixed content
  const isMixed = typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://');

  if (!isMixed) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-100' },
        signal: controller.signal,
        mode: 'cors',
      });
      clearTimeout(timer);
      if (res.ok || res.status === 206) {
        return { ok: true, needsProxy: false, latencyMs: Math.round(performance.now() - start) };
      }
    } catch {
      // Direct fetch failed (likely CORS or timeout)
    }
  }

  // 2. Try proxy probe
  try {
    const proxyRes = await fetch(getProxiedStreamUrl(url, referrer), {
      method: 'GET',
      headers: { Range: 'bytes=0-100' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (proxyRes.ok || proxyRes.status === 206) {
      saveStreamRequiresProxy(url, true);
      return { ok: true, needsProxy: true, latencyMs: Math.round(performance.now() - start) };
    }
  } catch {
    // Both failed
  } finally {
    clearTimeout(timer);
  }

  return { ok: false, needsProxy: false, latencyMs: Math.round(performance.now() - start) };
}
