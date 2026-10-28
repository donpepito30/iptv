/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

// Allow IPTV servers with self-signed or legacy TLS certs to be relayed safely
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const PROXY_TIMEOUT_MS = 12000;
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function rewriteM3u8Content(
  content: string,
  baseUrl: string,
  customRef?: string,
  customUa?: string
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

async function handleStreamProxy(req: Request, res: Response): Promise<void> {
  const targetUrl = req.query.url as string;
  const customRef = req.query.ref as string | undefined;
  const customUa = req.query.ua as string | undefined;

  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    res.status(400).json({ error: 'Valid HTTP/HTTPS url parameter required' });
    return;
  }

  // Preflight and media streaming CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Range, X-Upstream-Status');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const effectiveReferer =
      customRef ||
      (targetUrl.includes('saawsedge.com') ||
      targetUrl.includes('strpst.com') ||
      targetUrl.includes('doppicdn.com') ||
      targetUrl.includes('stripchat')
        ? 'https://stripchat.com/'
        : undefined);

    const upstreamHeaders: Record<string, string> = {
      'User-Agent': customUa || DEFAULT_USER_AGENT,
      'Accept': '*/*',
    };

    if (effectiveReferer) {
      upstreamHeaders['Referer'] = effectiveReferer;
      try {
        upstreamHeaders['Origin'] = new URL(effectiveReferer).origin;
      } catch {
        // Ignore invalid referer origin
      }
    }

    if (req.headers['range']) {
      upstreamHeaders['Range'] = req.headers['range'] as string;
    }

    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: upstreamHeaders,
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timer);

    res.setHeader('X-Upstream-Status', String(upstreamRes.status));

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      res.status(upstreamRes.status).send(`Upstream returned ${upstreamRes.status}`);
      return;
    }

    const contentType = upstreamRes.headers.get('content-type') || '';
    const isM3u8 =
      targetUrl.includes('.m3u8') ||
      contentType.includes('application/vnd.apple.mpegurl') ||
      contentType.includes('application/x-mpegurl') ||
      contentType.includes('audio/x-mpegurl');

    if (isM3u8) {
      const text = await upstreamRes.text();
      const finalBaseUrl = upstreamRes.url || targetUrl;
      const rewritten = rewriteM3u8Content(text, finalBaseUrl, effectiveReferer, customUa);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.status(200).send(rewritten);
      return;
    }

    // Pass through status & media streaming headers
    res.status(upstreamRes.status);
    if (contentType) res.setHeader('Content-Type', contentType);
    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) res.write(Buffer.from(value));
      }
      res.end();
    } else {
      res.end();
    }
  } catch (err: any) {
    clearTimeout(timer);
    const isTimeout = err?.name === 'AbortError';
    res.setHeader('X-Upstream-Status', isTimeout ? '504' : '502');
    res.status(isTimeout ? 504 : 502).json({
      error: isTimeout ? 'Gateway Timeout' : 'Bad Gateway',
      message: err?.message || 'Failed to fetch upstream stream',
    });
  }
}

async function startServer() {
  const app = express();

  // Stream relay endpoint (supports both /api/stream-proxy and /api/proxy)
  app.all(['/api/stream-proxy', '/api/proxy'], (req, res) => {
    handleStreamProxy(req, res).catch(() => {
      if (!res.headersSent) res.status(500).end();
    });
  });

  // Logo & Image proxy with 24h caching to bypass hotlink blocks
  app.get('/api/image-proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
      res.status(400).end();
      return;
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
      const imgRes = await fetch(targetUrl, {
        headers: imgHeaders,
      });
      if (!imgRes.ok) {
        res.status(imgRes.status).end();
        return;
      }
      const ct = imgRes.headers.get('content-type') || 'image/png';
      res.setHeader('Content-Type', ct);
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      res.setHeader('Access-Control-Allow-Origin', '*');
      const buf = Buffer.from(await imgRes.arrayBuffer());
      res.send(buf);
    } catch {
      res.status(502).end();
    }
  });

  // Health ping
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  // Mount Vite middleware in development
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[IPTV Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
