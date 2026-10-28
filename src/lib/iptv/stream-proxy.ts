/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const STORAGE_PREFIX = 'iptv:stream-proxy:';
const CUSTOM_PROXY_KEY = 'iptv:custom-proxy-relay';

const DOMAIN_PREFIX = 'iptv:proxy-domain:';
const DOMAIN_TTL_MS = 6 * 60 * 60 * 1000;

function hostOf(url: string): string | null {
  try { return new URL(url).hostname.toLowerCase(); } catch { return null; }
}
function domainNeedsProxy(url: string): boolean {
  const host = hostOf(url);
  if (!host || typeof window === 'undefined') return false;
  try {
    const ts = Number(window.localStorage.getItem(`${DOMAIN_PREFIX}${host}`) || 0);
    return ts > 0 && Date.now() - ts < DOMAIN_TTL_MS;
  } catch { return false; }
}
function rememberDomain(url: string, requires: boolean): void {
  const host = hostOf(url);
  if (!host || typeof window === 'undefined') return;
  try {
    if (requires) window.localStorage.setItem(`${DOMAIN_PREFIX}${host}`, String(Date.now()));
    else window.localStorage.removeItem(`${DOMAIN_PREFIX}${host}`);
  } catch {}
}

let backendHealthCache: { ok: boolean; timestamp: number } | null = null;

/**
 * Checks if the local/Vercel backend proxy (/api/health) is operational.
 */
export async function isBackendProxyAvailable(): Promise<boolean> {
  if (backendHealthCache && Date.now() - backendHealthCache.timestamp < 30000) {
    return backendHealthCache.ok;
  }
  try {
    const res = await fetch('/api/health', { method: 'GET' });
    const isOk = res.ok;
    backendHealthCache = { ok: isOk, timestamp: Date.now() };
    return isOk;
  } catch {
    backendHealthCache = { ok: false, timestamp: Date.now() };
    return false;
  }
}

/**
 * Gets custom user-defined proxy endpoint if configured.
 */
export function getCustomProxyUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(CUSTOM_PROXY_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Persists a custom user-defined proxy endpoint (e.g. Cloudflare Worker / VPS).
 */
export function setCustomProxyUrl(url: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (url && url.trim()) {
      window.localStorage.setItem(CUSTOM_PROXY_KEY, url.trim());
    } else {
      window.localStorage.removeItem(CUSTOM_PROXY_KEY);
    }
  } catch {
    // Ignore storage quota
  }
}

/**
 * Encodes a remote media URL into the stream-proxy endpoint,
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

  const customProxy = getCustomProxyUrl();
  if (customProxy) {
    return customProxy.includes('?')
      ? `${customProxy}&url=${encodeURIComponent(originalUrl)}`
      : `${customProxy}?url=${encodeURIComponent(originalUrl)}`;
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
    if (window.localStorage?.getItem(`${STORAGE_PREFIX}${originalUrl}`) === '1') return true;
  } catch {}
  return domainNeedsProxy(originalUrl);
}

/**
 * Persists whether a stream URL needs the proxy relay to work.
 */
export function saveStreamRequiresProxy(originalUrl: string, requires: boolean): void {
  if (typeof window === 'undefined' || !originalUrl) return;
  try {
    if (requires) {
      window.localStorage?.setItem(`${STORAGE_PREFIX}${originalUrl}`, '1');
      rememberDomain(originalUrl, true);
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
