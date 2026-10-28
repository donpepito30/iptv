/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const config = {
  runtime: 'edge',
};

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function rewriteM3u8Content(
  content: string,
  baseUrl: string,
  customRef?: string | null,
  customUa?: string | null
): string {
  const lines = content.split('\n');
  const rewrittenLines: string[] = [];

  const makeProxyUrl = (target: string) => {
    let p = `/api/stream-proxy?url=${encodeURIComponent(target)}`;
    if (customRef) p += `&ref=${encodeURIComponent(customRef)}`;
    if (customUa) p += `&ua=${encodeURIComponent(customUa)}`;
    return p;
  };

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
    } else {
      try {
        const absolute = new URL(trimmed, baseUrl).toString();
        rewrittenLines.push(makeProxyUrl(absolute));
      } catch {
        rewrittenLines.push(line);
      }
    }
  }

  return rewrittenLines.join('\n');
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url');
  const customRef = url.searchParams.get('ref');
  const customUa = url.searchParams.get('ua');

  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    return new Response('Valid HTTP/HTTPS url parameter required', { status: 400 });
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Type, Content-Range, X-Upstream-Status',
      },
    });
  }

  const effectiveReferer =
    customRef ||
    (targetUrl.includes('saawsedge.com') ||
    targetUrl.includes('strpst.com') ||
    targetUrl.includes('doppicdn.com') ||
    targetUrl.includes('stripchat')
      ? 'https://stripchat.com/'
      : null);

  const upstreamHeaders: Record<string, string> = {
    'User-Agent': customUa || DEFAULT_USER_AGENT,
    Accept: '*/*',
  };

  if (effectiveReferer) {
    upstreamHeaders['Referer'] = effectiveReferer;
    try {
      upstreamHeaders['Origin'] = new URL(effectiveReferer).origin;
    } catch {
      // Ignore
    }
  }

  const range = req.headers.get('range');
  if (range) {
    upstreamHeaders['Range'] = range;
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: upstreamHeaders,
      redirect: 'follow',
    });

    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set(
      'Access-Control-Expose-Headers',
      'Content-Length, Content-Type, Content-Range, X-Upstream-Status'
    );
    responseHeaders.set('X-Upstream-Status', String(upstreamRes.status));

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new Response(`Upstream returned ${upstreamRes.status}`, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    }

    const contentType = upstreamRes.headers.get('content-type') || '';
    const isM3u8 =
      targetUrl.includes('.m3u8') ||
      contentType.includes('application/vnd.apple.mpegurl') ||
      contentType.includes('application/x-mpegurl') ||
      contentType.includes('audio/x-mpegurl');

    if (isM3u8) {
      const text = await upstreamRes.text();
      const rewritten = rewriteM3u8Content(text, targetUrl, customRef, customUa);
      responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
      return new Response(rewritten, {
        status: 200,
        headers: responseHeaders,
      });
    }

    // Video chunks and segments passthrough
    if (contentType) responseHeaders.set('Content-Type', contentType);
    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) responseHeaders.set('Content-Length', contentLength);
    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) responseHeaders.set('Content-Range', contentRange);

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    const errorHeaders = new Headers();
    errorHeaders.set('Access-Control-Allow-Origin', '*');
    errorHeaders.set('X-Upstream-Status', '502');
    return new Response(JSON.stringify({ error: 'Bad Gateway', message: err?.message || 'Failed to fetch stream' }), {
      status: 502,
      headers: errorHeaders,
    });
  }
}
