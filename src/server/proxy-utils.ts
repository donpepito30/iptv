/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'node:http';
import https from 'node:https';

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export const insecureAgent = new https.Agent({ rejectUnauthorized: false });

export function validateTargetUrl(urlStr: string): { ok: boolean; status: number; error?: string } {
  if (!urlStr || (!urlStr.startsWith('http://') && !urlStr.startsWith('https://'))) {
    return { ok: false, status: 400, error: 'Valid HTTP/HTTPS url parameter required' };
  }
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase().trim();
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '[::1]'
    ) {
      return { ok: false, status: 403, error: 'Localhost and private domains are blocked' };
    }
    const parts = host.split('.');
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
      const nums = parts.map(Number);
      const [a, b] = nums;
      if (nums.every((n) => n >= 0 && n <= 255)) {
        if (a === 0 || a === 127 || a === 10) return { ok: false, status: 403, error: 'Private IP range is blocked' };
        if (a === 172 && b >= 16 && b <= 31) return { ok: false, status: 403, error: 'Private IP range is blocked' };
        if (a === 192 && b === 168) return { ok: false, status: 403, error: 'Private IP range is blocked' };
        if (a === 169 && b === 254) return { ok: false, status: 403, error: 'Link-local IP range is blocked' };
      }
    }
    if (host.startsWith('fe80:') || host.startsWith('fc00:') || host.startsWith('fd00:')) {
      return { ok: false, status: 403, error: 'Private IPv6 is blocked' };
    }
    return { ok: true, status: 200 };
  } catch {
    return { ok: false, status: 400, error: 'Invalid URL format' };
  }
}

export function getCorsOrigin(originHeader?: string): string {
  const appUrl = process.env.APP_URL;
  if (appUrl) {
    try { return new URL(appUrl).origin; } catch { return appUrl; }
  }
  return originHeader || '*';
}

export function rewriteM3u8Content(
  content: string,
  baseUrl: string,
  customRef?: string,
  customUa?: string,
  originAllowsCors = false
): string {
  const lines = content.split('\n');
  const rewrittenLines: string[] = [];

  const makeProxyUrl = (target: string) => {
    let p = `/api/stream-proxy?url=${encodeURIComponent(target)}`;
    if (customRef) p += `&ref=${encodeURIComponent(customRef)}`;
    if (customUa) p += `&ua=${encodeURIComponent(customUa)}`;
    return p;
  };

  const hasCustomHeaders = Boolean(customRef || customUa);
  let nextIsManifest = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      rewrittenLines.push(line);
      continue;
    }

    if (trimmed.startsWith('#')) {
      if (trimmed.includes('URI="')) {
        const rewrittenTag = trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
          try {
            const absolute = new URL(uri, baseUrl).toString();
            return `URI="${makeProxyUrl(absolute)}"`;
          } catch {
            return `URI="${uri}"`;
          }
        });
        rewrittenLines.push(rewrittenTag);
      } else {
        rewrittenLines.push(line);
      }
      if (trimmed.startsWith('#EXT-X-STREAM-INF')) nextIsManifest = true;
    } else {
      try {
        const absolute = new URL(trimmed, baseUrl).toString();
        const isChildManifest = nextIsManifest || trimmed.includes('.m3u8');
        nextIsManifest = false;

        if (isChildManifest) {
          rewrittenLines.push(makeProxyUrl(absolute));
        } else if (originAllowsCors && !hasCustomHeaders) {
          rewrittenLines.push(absolute);
        } else {
          rewrittenLines.push(makeProxyUrl(absolute));
        }
      } catch {
        rewrittenLines.push(line);
      }
    }
  }

  return rewrittenLines.join('\n');
}

export async function requestInsecureTls(
  targetUrl: string,
  method: string,
  headers: Record<string, string>,
  signal: AbortSignal
): Promise<{ ok: boolean; status: number; headers: Headers; bodyStream: any; text: () => Promise<string>; url: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const req = https.request(
      parsed,
      { method, headers, agent: insecureAgent, signal },
      (res) => {
        const responseHeaders = new Headers();
        for (const [k, v] of Object.entries(res.headers)) {
          if (Array.isArray(v)) v.forEach((val) => responseHeaders.append(k, val));
          else if (v !== undefined) responseHeaders.set(k, v);
        }
        resolve({
          ok: (res.statusCode || 500) >= 200 && (res.statusCode || 500) < 300,
          status: res.statusCode || 500,
          headers: responseHeaders,
          bodyStream: res,
          text: () =>
            new Promise<string>((resText, rejText) => {
              const chunks: Buffer[] = [];
              res.on('data', (c) => chunks.push(Buffer.from(c)));
              res.on('end', () => resText(Buffer.concat(chunks).toString('utf-8')));
              res.on('error', rejText);
            }),
          url: targetUrl,
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

export async function probeStreamUrl(
  targetUrl: string,
  customUa?: string
): Promise<{ ok: boolean; status: number; isHls: boolean; ms: number }> {
  const start = performance.now();
  const validation = validateTargetUrl(targetUrl);
  if (!validation.ok) {
    return { ok: false, status: validation.status, isHls: false, ms: 0 };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': customUa || DEFAULT_USER_AGENT,
        Range: 'bytes=0-2048',
        Accept: '*/*',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    const elapsed = Math.round(performance.now() - start);
    let sampleText = '';

    if (res.body) {
      const reader = res.body.getReader();
      try {
        const { value } = await reader.read();
        if (value) {
          sampleText = Buffer.from(value.slice(0, 2048)).toString('utf-8');
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
    }

    clearTimeout(timer);
    const isHls =
      sampleText.includes('#EXTM3U') ||
      sampleText.includes('#EXT-X-VERSION') ||
      sampleText.includes('#EXT-X-STREAM-INF') ||
      targetUrl.includes('.m3u8');

    return {
      ok: res.ok || res.status === 206,
      status: res.status,
      isHls,
      ms: elapsed,
    };
  } catch {
    clearTimeout(timer);
    const elapsed = Math.round(performance.now() - start);
    return { ok: false, status: 504, isHls: false, ms: elapsed };
  }
}

