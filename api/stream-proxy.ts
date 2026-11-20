/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const config = {
  runtime: 'edge',
};

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function validateTargetUrl(urlStr: string): { ok: boolean; status: number; error?: string } {
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

function getCorsOrigin(req: Request): string {
  const appUrl = (typeof process !== 'undefined' && process.env?.APP_URL) || null;
  if (appUrl) {
    try { return new URL(appUrl).origin; } catch { return appUrl; }
  }
  const origin = req.headers.get('origin');
  return origin || '*';
}

function rewriteM3u8Content(
  content: string,
  baseUrl: string,
  customRef?: string | null,
  customUa?: string | null,
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

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url');
  const customRef = url.searchParams.get('ref');
  const customUa = url.searchParams.get('ua');

  const validation = validateTargetUrl(targetUrl || '');
  if (!validation.ok) {
    return new Response(JSON.stringify({ error: validation.error }), { status: validation.status });
  }

  const allowedOrigin = getCorsOrigin(req);
  const baseHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Type, Content-Range, X-Upstream-Status',
    'Vary': 'Origin',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: baseHeaders });
  }

  const effectiveReferer =
    customRef ||
    (targetUrl!.includes('saawsedge.com') ||
    targetUrl!.includes('strpst.com') ||
    targetUrl!.includes('doppicdn.com') ||
    targetUrl!.includes('stripchat')
      ? 'https://stripchat.com/'
      : null);

  const upstreamHeaders: Record<string, string> = {
    'User-Agent': customUa || DEFAULT_USER_AGENT,
    Accept: '*/*',
  };
  if (effectiveReferer) {
    upstreamHeaders['Referer'] = effectiveReferer;
    try { upstreamHeaders['Origin'] = new URL(effectiveReferer).origin; } catch {}
  }
  const range = req.headers.get('range');
  if (range) upstreamHeaders['Range'] = range;

  try {
    const upstreamRes = await fetch(targetUrl!, {
      method: req.method,
      headers: upstreamHeaders,
      redirect: 'follow',
      signal: req.signal, // Cancels upstream request if client closes connection
    });

    const responseHeaders = new Headers(baseHeaders);
    responseHeaders.set('X-Upstream-Status', String(upstreamRes.status));

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new Response(`Upstream returned ${upstreamRes.status}`, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    }

    const contentType = upstreamRes.headers.get('content-type') || '';
    const originAllowsCors = Boolean(upstreamRes.headers.get('access-control-allow-origin'));
    const isM3u8 =
      targetUrl!.includes('.m3u8') ||
      contentType.includes('application/vnd.apple.mpegurl') ||
      contentType.includes('application/x-mpegurl') ||
      contentType.includes('audio/x-mpegurl');

    if (isM3u8) {
      const text = await upstreamRes.text();
      const finalBaseUrl = upstreamRes.url || targetUrl!;
      const rewritten = rewriteM3u8Content(text, finalBaseUrl, customRef, customUa, originAllowsCors);
      responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
      return new Response(rewritten, { status: 200, headers: responseHeaders });
    }

    if (contentType) responseHeaders.set('Content-Type', contentType);
    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) responseHeaders.set('Content-Length', contentLength);
    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) responseHeaders.set('Content-Range', contentRange);

    return new Response(upstreamRes.body, { status: upstreamRes.status, headers: responseHeaders });
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError' || req.signal?.aborted;
    return new Response(
      JSON.stringify({ error: isAbort ? 'Gateway Timeout' : 'Bad Gateway', message: err?.message || 'Upstream fetch failed' }),
      { status: isAbort ? 504 : 502, headers: baseHeaders }
    );
  }
}
