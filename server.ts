/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  DEFAULT_USER_AGENT,
  getCorsOrigin,
  probeStreamUrl,
  requestInsecureTls,
  rewriteM3u8Content,
  validateTargetUrl,
} from './src/server/proxy-utils.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const PROXY_TIMEOUT_MS = 12000;
const hostsRequiringInsecureTls = new Set<string>();

async function handleStreamProxy(req: Request, res: Response): Promise<void> {
  const targetUrl = req.query.url as string;
  const customRef = req.query.ref as string | undefined;
  const customUa = req.query.ua as string | undefined;

  const validation = validateTargetUrl(targetUrl);
  if (!validation.ok) {
    res.status(validation.status).json({ error: validation.error });
    return;
  }

  const allowedOrigin = getCorsOrigin(req.headers.origin as string | undefined);
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Range, X-Upstream-Status');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  req.on('close', () => {
    clearTimeout(timer);
    controller.abort();
  });

  try {
    const parsed = new URL(targetUrl);
    const host = parsed.hostname.toLowerCase();
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
      Accept: '*/*',
    };
    if (effectiveReferer) {
      upstreamHeaders['Referer'] = effectiveReferer;
      try { upstreamHeaders['Origin'] = new URL(effectiveReferer).origin; } catch {}
    }
    if (req.headers['range']) {
      upstreamHeaders['Range'] = req.headers['range'] as string;
    }

    let upstreamRes: any;
    if (hostsRequiringInsecureTls.has(host) && targetUrl.startsWith('https://')) {
      upstreamRes = await requestInsecureTls(targetUrl, req.method, upstreamHeaders, controller.signal);
    } else {
      try {
        upstreamRes = await fetch(targetUrl, {
          method: req.method,
          headers: upstreamHeaders,
          redirect: 'follow',
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        const msg = String(fetchErr?.message || '').toLowerCase();
        if ((msg.includes('cert') || msg.includes('self-signed') || msg.includes('tls')) && targetUrl.startsWith('https://')) {
          hostsRequiringInsecureTls.add(host);
          upstreamRes = await requestInsecureTls(targetUrl, req.method, upstreamHeaders, controller.signal);
        } else {
          throw fetchErr;
        }
      }
    }

    clearTimeout(timer);
    res.setHeader('X-Upstream-Status', String(upstreamRes.status));

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      res.status(upstreamRes.status).send(`Upstream returned ${upstreamRes.status}`);
      return;
    }

    const contentType = upstreamRes.headers.get('content-type') || '';
    const originAllowsCors = Boolean(upstreamRes.headers.get('access-control-allow-origin'));
    const isM3u8 =
      targetUrl.includes('.m3u8') ||
      contentType.includes('application/vnd.apple.mpegurl') ||
      contentType.includes('application/x-mpegurl') ||
      contentType.includes('audio/x-mpegurl');

    if (isM3u8) {
      const text = await upstreamRes.text();
      const finalBaseUrl = upstreamRes.url || targetUrl;
      const rewritten = rewriteM3u8Content(text, finalBaseUrl, effectiveReferer, customUa, originAllowsCors);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.status(200).send(rewritten);
      return;
    }

    res.status(upstreamRes.status);
    if (contentType) res.setHeader('Content-Type', contentType);
    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    if (upstreamRes.bodyStream) {
      upstreamRes.bodyStream.pipe(res);
    } else if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      try {
        while (true) {
          if (req.destroyed || res.destroyed) break;
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            const canWrite = res.write(Buffer.from(value));
            if (!canWrite) {
              await new Promise<void>((resolve) => {
                res.once('drain', resolve);
                req.once('close', resolve);
              });
            }
          }
        }
      } finally {
        reader.releaseLock?.();
      }
      if (!res.writableEnded) res.end();
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
  app.all(['/api/stream-proxy', '/api/proxy'], (req, res) => {
    handleStreamProxy(req, res).catch(() => {
      if (!res.headersSent) res.status(500).end();
    });
  });

  app.get('/api/image-proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    const validation = validateTargetUrl(targetUrl);
    if (!validation.ok) {
      res.status(validation.status).end();
      return;
    }
    try {
      const imgRes = await fetch(targetUrl, { headers: { 'User-Agent': DEFAULT_USER_AGENT, Accept: 'image/*,*/*' } });
      if (!imgRes.ok) { res.status(imgRes.status).end(); return; }
      res.setHeader('Content-Type', imgRes.headers.get('content-type') || 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      res.setHeader('Access-Control-Allow-Origin', getCorsOrigin(req.headers.origin as string | undefined));
      res.setHeader('Vary', 'Origin');
      const buf = Buffer.from(await imgRes.arrayBuffer());
      res.send(buf);
    } catch {
      res.status(502).end();
    }
  });

  app.get('/api/health', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', getCorsOrigin(req.headers.origin as string | undefined));
    res.setHeader('Vary', 'Origin');
    res.json({ status: 'ok', time: Date.now() });
  });

  app.get('/api/probe', async (req, res) => {
    const targetUrl = req.query.url as string;
    const customUa = req.query.ua as string | undefined;
    res.setHeader('Access-Control-Allow-Origin', getCorsOrigin(req.headers.origin as string | undefined));
    res.setHeader('Vary', 'Origin');
    const result = await probeStreamUrl(targetUrl, customUa);
    res.json(result);
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[IPTV Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
