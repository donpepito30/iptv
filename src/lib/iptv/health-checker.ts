/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { HEALTH_TTL_MS, loadHealthFromIndexedDb, saveHealthToIndexedDb } from './indexed-db.ts';
import { CatalogChannel } from './types.ts';

export type HealthStatus = 'checking' | 'live' | 'unstable' | 'offline';

export interface HealthEntry {
  status: HealthStatus;
  ms: number;
  timestamp: number;
}

const memoryHealthCache = new Map<string, HealthEntry>();

interface QueueTask {
  url: string;
  priority: number; // 1 = currently active channel, 2 = visible in screen, 3 = secondary
  resolve: (status: HealthStatus) => void;
}

const MAX_CONCURRENCY = 4;
let activeProbes = 0;
const probeQueue: QueueTask[] = [];

function processQueue(): void {
  if (activeProbes >= MAX_CONCURRENCY || probeQueue.length === 0) return;

  // Sort by priority (1 is highest priority)
  probeQueue.sort((a, b) => a.priority - b.priority);
  const task = probeQueue.shift();
  if (!task) return;

  activeProbes++;
  executeProbe(task.url)
    .then((status) => task.resolve(status))
    .catch(() => task.resolve('offline'))
    .finally(() => {
      activeProbes--;
      processQueue();
    });
}

async function executeProbe(url: string): Promise<HealthStatus> {
  try {
    const res = await fetch(`/api/probe?url=${encodeURIComponent(url)}`);
    if (!res.ok) {
      const entry: HealthEntry = { status: 'offline', ms: 4000, timestamp: Date.now() };
      memoryHealthCache.set(url, entry);
      saveHealthToIndexedDb(url, 'offline').catch(() => {});
      return 'offline';
    }

    const data = await res.json();
    let status: HealthStatus = 'offline';

    if (data.ok && data.isHls && data.ms < 1500) {
      status = 'live';
    } else if (data.ok) {
      status = 'unstable';
    } else {
      status = 'offline';
    }

    const entry: HealthEntry = { status, ms: data.ms || 0, timestamp: Date.now() };
    memoryHealthCache.set(url, entry);
    saveHealthToIndexedDb(url, status).catch(() => {});
    return status;
  } catch {
    const entry: HealthEntry = { status: 'offline', ms: 4000, timestamp: Date.now() };
    memoryHealthCache.set(url, entry);
    saveHealthToIndexedDb(url, 'offline').catch(() => {});
    return 'offline';
  }
}

/**
 * Enqueues a stream URL for probe check with priority ordering and IndexedDB/Memory caching.
 */
export async function getStreamHealth(url: string, priority = 2): Promise<HealthStatus> {
  if (!url) return 'offline';

  // 1. Check in-memory cache
  const cached = memoryHealthCache.get(url);
  if (cached && Date.now() - cached.timestamp < HEALTH_TTL_MS) {
    return cached.status;
  }

  // 2. Check IndexedDB cache
  try {
    const idbPayload = await loadHealthFromIndexedDb(url);
    if (idbPayload) {
      const status = idbPayload.status as HealthStatus;
      memoryHealthCache.set(url, { status, ms: 0, timestamp: idbPayload.timestamp });
      return status;
    }
  } catch {
    // Ignore IndexedDB read error and proceed to network probe
  }

  // 3. Enqueue network probe
  return new Promise<HealthStatus>((resolve) => {
    probeQueue.push({ url, priority, resolve });
    processQueue();
  });
}

/**
 * Synchronous memory cache inspector.
 */
export function getStreamHealthSync(url?: string | null): HealthStatus | null {
  if (!url) return null;
  const entry = memoryHealthCache.get(url);
  if (entry && Date.now() - entry.timestamp < HEALTH_TTL_MS) {
    return entry.status;
  }
  return null;
}

/**
 * Checks if all streams of a channel have been verified and are all offline.
 */
export function isChannelVerifiedOffline(channel: CatalogChannel): boolean {
  if (!channel.streams || channel.streams.length === 0) {
    if (channel.primaryStreamUrl) {
      return getStreamHealthSync(channel.primaryStreamUrl) === 'offline';
    }
    return false;
  }
  return channel.streams.every((s) => getStreamHealthSync(s.url) === 'offline');
}

/**
 * React hook to reactively probe and track stream health with priority.
 */
export function useStreamHealth(url?: string | null, priority = 2): HealthStatus {
  const [status, setStatus] = useState<HealthStatus>(() => {
    if (!url) return 'offline';
    return getStreamHealthSync(url) || 'checking';
  });

  useEffect(() => {
    if (!url) {
      setStatus('offline');
      return;
    }

    const current = getStreamHealthSync(url);
    if (current && current !== 'checking') {
      setStatus(current);
      return;
    }

    let isMounted = true;
    getStreamHealth(url, priority).then((res) => {
      if (isMounted) setStatus(res);
    });

    return () => {
      isMounted = false;
    };
  }, [url, priority]);

  return status;
}

/**
 * Clears the queue and memory cache (useful for tests and resets).
 */
export function clearHealthCacheForTests(): void {
  memoryHealthCache.clear();
  probeQueue.length = 0;
  activeProbes = 0;
}
