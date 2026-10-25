/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { probeStreamQuick } from './stream-proxy.ts';

export type HealthStatus = 'checking' | 'direct' | 'proxy' | 'offline';

const healthCache = new Map<string, { status: HealthStatus; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 mins

/**
 * Probes and caches health status of a stream URL.
 */
export async function getStreamHealth(url: string): Promise<HealthStatus> {
  if (!url) return 'offline';

  const cached = healthCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.status;
  }

  const result = await probeStreamQuick(url, 2000);
  let status: HealthStatus = 'offline';
  if (result.ok) {
    status = result.needsProxy ? 'proxy' : 'direct';
  }

  healthCache.set(url, { status, timestamp: Date.now() });
  return status;
}

/**
 * React hook to reactively get the probe status of a stream.
 */
export function useStreamHealth(url?: string | null): HealthStatus {
  const [status, setStatus] = useState<HealthStatus>(() => {
    if (!url) return 'offline';
    const cached = healthCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.status;
    }
    return 'checking';
  });

  useEffect(() => {
    if (!url) {
      setStatus('offline');
      return;
    }

    let isMounted = true;
    getStreamHealth(url).then((res) => {
      if (isMounted) setStatus(res);
    });

    return () => {
      isMounted = false;
    };
  }, [url]);

  return status;
}
