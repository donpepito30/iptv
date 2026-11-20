/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

function getCorsOrigin(req: Request, env?: Record<string, any>): string {
  const appUrl = (env && env.APP_URL) || (typeof process !== 'undefined' && process.env?.APP_URL) || null;
  if (appUrl) {
    try { return new URL(appUrl).origin; } catch { return appUrl; }
  }
  return req.headers.get('origin') || '*';
}

export async function onRequest(context: { request: Request; env?: Record<string, any> }): Promise<Response> {
  const req = context.request;
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url');
  const customUa = url.searchParams.get('ua');

  const validation = validateTargetUrl(targetUrl || '');
  if (!validation.ok) {
    return new Response(JSON.stringify({ ok: false, status: validation.status, isHls: false, ms: 0, error: validation.error }), {
      status: validation.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': getCorsOrigin(req, context.env), 'Vary': 'Origin' },
    });
  }

  const baseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': getCorsOrigin(req, context.env),
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Vary': 'Origin',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: baseHeaders });
  }

  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const upstreamRes = await fetch(targetUrl!, {
      method: 'GET',
      headers: {
        'User-Agent': customUa || DEFAULT_USER_AGENT,
        Range: 'bytes=0-2048',
        Accept: '*/*',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    const elapsed = Math.round(performance.now() - start);
    let sampleText = '';

    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      try {
        const { value } = await reader.read();
        if (value) {
          sampleText = new TextDecoder().decode(value.slice(0, 2048));
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
      targetUrl!.includes('.m3u8');

    return new Response(
      JSON.stringify({
        ok: upstreamRes.ok || upstreamRes.status === 206,
        status: upstreamRes.status,
        isHls,
        ms: elapsed,
      }),
      { status: 200, headers: baseHeaders }
    );
  } catch {
    clearTimeout(timer);
    const elapsed = Math.round(performance.now() - start);
    return new Response(
      JSON.stringify({ ok: false, status: 504, isHls: false, ms: elapsed }),
      { status: 200, headers: baseHeaders }
    );
  }
}
