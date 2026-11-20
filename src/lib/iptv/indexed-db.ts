/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CatalogResult } from './types.ts';

const DB_NAME = 'iptv_player_cache';
const DB_VERSION = 2;
const STORE_NAME = 'catalog_store';
const HEALTH_STORE_NAME = 'health_store';
const CACHE_KEY = 'global_catalog_v2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const HEALTH_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CachePayload {
  timestamp: number;
  data: CatalogResult;
}

export interface HealthPayload {
  status: string;
  timestamp: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(HEALTH_STORE_NAME)) {
        db.createObjectStore(HEALTH_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Loads the compiled catalog from IndexedDB if fresh (< 24h).
 */
export async function loadCatalogFromIndexedDb(): Promise<CatalogResult | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(CACHE_KEY);

      request.onsuccess = () => {
        const payload = request.result as CachePayload | undefined;
        if (!payload || !payload.data) {
          resolve(null);
          return;
        }

        const isFresh = Date.now() - payload.timestamp < CACHE_TTL_MS;
        if (isFresh && payload.data.channels?.length > 0) {
          resolve(payload.data);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Persists the compiled catalog with logos and categories into IndexedDB.
 */
export async function saveCatalogToIndexedDb(data: CatalogResult): Promise<void> {
  if (!data || !data.channels || data.channels.length === 0) return;
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const payload: CachePayload = {
        timestamp: Date.now(),
        data,
      };

      const request = store.put(payload, CACHE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Gracefully handle storage errors
  }
}

/**
 * Clears the persistent catalog cache.
 */
export async function clearCatalogIndexedDb(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(CACHE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}

/**
 * Loads cached stream health status from IndexedDB if fresher than 30 minutes.
 */
export async function loadHealthFromIndexedDb(url: string): Promise<HealthPayload | null> {
  if (!url) return null;
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(HEALTH_STORE_NAME, 'readonly');
      const store = tx.objectStore(HEALTH_STORE_NAME);
      const request = store.get(url);
      request.onsuccess = () => {
        const payload = request.result as HealthPayload | undefined;
        if (payload && Date.now() - payload.timestamp < HEALTH_TTL_MS) {
          resolve(payload);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Persists stream health status in IndexedDB with 30-min timestamp.
 */
export async function saveHealthToIndexedDb(url: string, status: string): Promise<void> {
  if (!url) return;
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(HEALTH_STORE_NAME, 'readwrite');
      const store = tx.objectStore(HEALTH_STORE_NAME);
      const payload: HealthPayload = { status, timestamp: Date.now() };
      const request = store.put(payload, url);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Graceful fallback
  }
}

