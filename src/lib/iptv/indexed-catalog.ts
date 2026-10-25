/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelWithStream } from './types.ts';

const DB_NAME = 'iptv_hub_db';
const DB_VERSION = 1;
const STORE_NAME = 'catalog_cache';
const CACHE_KEY = 'full_catalog';
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface CachePayload {
  key: string;
  timestamp: number;
  channels: ChannelWithStream[];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Loads cached channels from IndexedDB if not expired.
 */
export async function getCachedCatalogFromDB(): Promise<ChannelWithStream[] | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(CACHE_KEY);

      req.onsuccess = () => {
        const result = req.result as CachePayload | undefined;
        if (!result || !result.channels || !result.channels.length) {
          resolve(null);
          return;
        }
        const age = Date.now() - result.timestamp;
        if (age > TTL_MS) {
          resolve(null); // Stale
        } else {
          resolve(result.channels);
        }
      };

      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Persists full catalog into IndexedDB.
 */
export async function saveCatalogToDB(channels: ChannelWithStream[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const payload: CachePayload = {
        key: CACHE_KEY,
        timestamp: Date.now(),
        channels,
      };
      const req = store.put(payload);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[indexed-catalog] Failed to cache catalog:', err);
  }
}
