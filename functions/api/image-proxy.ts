/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function onRequest(context: { request: Request }): Promise<Response> {
  const req = context.request;
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    return new Response('Valid HTTP/HTTPS url parameter required', { status: 400 });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  try {
    const imgHeaders: Record<string, string> = {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'image/*,*/*',
    };
    if (
      targetUrl.includes('strpst.com') ||
      targetUrl.includes('doppicdn.com') ||
      targetUrl.includes('saawsedge.com') ||
      targetUrl.includes('stripchat')
    ) {
      imgHeaders['Referer'] = 'https://stripchat.com/';
    }

    const upstreamRes = await fetch(targetUrl, {
      headers: imgHeaders,
    });

    if (!upstreamRes.ok) {
      return new Response(`Upstream returned ${upstreamRes.status}`, { status: upstreamRes.status });
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/png';

    return new Response(upstreamRes.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return new Response(err?.message || 'Failed to fetch image', { status: 502 });
  }
}
